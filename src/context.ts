import { executorActor } from "./continuity";
import { BEADS_TASK_AGENTS } from "./agents";
import { guardNotice, type GuardResult } from "./guard";
import { PrimeTimeoutError } from "./prime";
import { beadsGuidance, primeFailureNotice, type RequestCapabilities } from "./guidance";

/** Retry window for withheld or failed context, so model steps do not respawn `bd` each time. */
export const DEFAULT_CONTEXT_RETRY_MS = 30_000;

/**
 * Re-run prime when a session resumes after this much inactivity. Claude Code's SessionStart hook
 * re-primes on resume; OpenCode has no resume event, so an idle gap stands in for it. Continuous
 * work keeps identical prime text, which keeps provider prompt caches warm.
 */
export const DEFAULT_IDLE_REFRESH_MS = 30 * 60_000;

export type AgentMode = "primary" | "subagent" | "all";
export type ContextAudience = "primary" | "task-agent";
export type ContextDiagnostic = "agent_lookup_failed" | "guard_failed" | "prime_failed" | "prime_timeout";
export type ContextStatus = "loading" | "missing" | "withheld" | "failed" | "empty" | "ready";

export interface ContextRuntime {
  guard(directory: string, signal?: AbortSignal): Promise<GuardResult>;
  prime(directory: string, signal?: AbortSignal): Promise<string>;
  /** Resolve an agent's mode; undefined when the agent is unknown. */
  agentMode(agentID: string): Promise<AgentMode | undefined>;
  diagnose?(code: ContextDiagnostic, sessionID: string): void;
}

export interface ContextControllerOptions {
  retryMs?: number;
  /** Refresh prime after this much session inactivity; 0 disables idle refresh. */
  idleRefreshMs?: number;
  now?: () => number;
}

export interface ContextController {
  /** System text for one model request, or undefined when nothing should be added. */
  systemFor(sessionID: string, agentID: string, capabilities?: RequestCapabilities): Promise<string | undefined>;
  /** Refresh prime on the next request, e.g. after compaction changed the session. */
  invalidate(sessionID: string): void;
  /** Drop all state for a deleted session. */
  forget(sessionID: string): void;
  /** Context state is distinct from an absent text part (including intentional empty prime). */
  statusFor(sessionID: string, audience: ContextAudience): ContextStatus | undefined;
  /** A write can affect every cached session in this location. */
  invalidateAll(): void;
  /** Abort owned loads and prevent late context injection after unload. */
  dispose(): void;
}

type CacheEntry = { value: Promise<string | undefined>; expiresAt?: number; lastUsed: number; abort: AbortController; status?: ContextStatus };

/** Wrap prime output in the envelope and shared guidance for one audience. */
export function renderBeadsContext(prime: string, audience: ContextAudience, request?: { sessionID: string; agent: string; capabilities?: RequestCapabilities }): string {
  const identity = request ? `\nYour Beads executor actor: ${executorActor(request)}. Use this exact actor for every direct shell write, claim and heartbeat (command-scoped --actor or BEADS_ACTOR); children use their own actual request actor. Attribution grants no permission.\n` : "";
  return `<beads-context audience="${audience}">\n${prime}\n</beads-context>\n${identity}\n${beadsGuidance(audience, request?.capabilities)}`;
}

/**
 * Supply Beads context through the per-request session context hook.
 *
 * OpenCode V2 attaches system parts to every model request without storing them, so context
 * survives compaction on its own. Guarded prime is cached separately from per-request actor/capability rendering;
 * compaction invalidates it so persistent memories can refresh.
 */
export function createContextController(
  runtime: ContextRuntime,
  directory: string,
  options: ContextControllerOptions = {}
): ContextController {
  const retryMs = options.retryMs ?? DEFAULT_CONTEXT_RETRY_MS;
  const idleRefreshMs = options.idleRefreshMs ?? DEFAULT_IDLE_REFRESH_MS;
  const now = options.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();
  const modes = new Map<string, Promise<AgentMode | undefined>>();
  let disposed = false;

  async function audienceFor(
    sessionID: string,
    agentID: string
  ): Promise<ContextAudience | undefined> {
    if (BEADS_TASK_AGENTS.has(agentID)) return "task-agent";

    let pending = modes.get(agentID);
    if (!pending) {
      pending = runtime.agentMode(agentID).catch(() => {
        modes.delete(agentID);
        runtime.diagnose?.("agent_lookup_failed", sessionID);
        return undefined;
      });
      modes.set(agentID, pending);
    }
    // Unknown agents fail open so custom primary agents keep receiving context.
    return (await pending) === "subagent" ? undefined : "primary";
  }

  async function load(
    sessionID: string,
    audience: ContextAudience,
    entry: CacheEntry
  ): Promise<string | undefined> {
    const retryLater = (value: string | undefined) => {
      entry.expiresAt = now() + retryMs;
      return value;
    };

    let guard: GuardResult;
    try {
      guard = await runtime.guard(directory, entry.abort.signal);
    } catch {
      if (entry.abort.signal.aborted) return undefined;
      entry.status = "failed";
      runtime.diagnose?.("guard_failed", sessionID);
      return retryLater("<beads-notice>Beads workflow context failed during the store safety check. Store authority is unknown; do not bypass this failure with manual prime.</beads-notice>");
    }
    if (entry.abort.signal.aborted) return undefined;
    if (guard.kind !== "ready") {
      entry.status = guard.kind === "probe-failed" ? "failed" : guard.kind === "migration-pending" || guard.kind === "unsupported" ? "withheld" : "missing";
      return retryLater(guardNotice(guard));
    }

    let output: string;
    try {
      output = (await runtime.prime(directory, entry.abort.signal)).trim();
    } catch (error) {
      if (entry.abort.signal.aborted) return undefined;
      entry.status = "failed";
      const timedOut = error instanceof PrimeTimeoutError;
      runtime.diagnose?.(timedOut ? "prime_timeout" : "prime_failed", sessionID);
      return retryLater(primeFailureNotice(timedOut ? "timed out" : "failed"));
    }
    if (entry.abort.signal.aborted) return undefined;
    if (!output) {
      entry.status = "empty";
      return retryLater(undefined);
    }
    entry.status = "ready";
    return output;
  }

  function dropSession(sessionID: string): void {
    modes.clear();
    for (const key of cache.keys()) {
      if (key.startsWith(`${sessionID}\0`)) {
        cache.get(key)?.abort.abort();
        cache.delete(key);
      }
    }
  }

  return {
    async systemFor(sessionID, agentID, capabilities) {
      if (disposed) return undefined;
      const audience = await audienceFor(sessionID, agentID);
      if (!audience || disposed) return undefined;

      const key = `${sessionID}\0${audience}`;
      const current = now();
      const cached = cache.get(key);
      const fresh = cached && (cached.expiresAt === undefined || cached.expiresAt > current);
      const resumed = cached && idleRefreshMs > 0 && current - cached.lastUsed > idleRefreshMs;
      if (cached && fresh && !resumed) {
        cached.lastUsed = current;
        const output = await cached.value;
        if (disposed || cached.abort.signal.aborted) return undefined;
        return cached.status === "ready" ? renderBeadsContext(output!, audience, { sessionID, agent: agentID, capabilities }) : output;
      }

      cached?.abort.abort();
      const entry: CacheEntry = { value: Promise.resolve(undefined), lastUsed: current, abort: new AbortController(), status: "loading" };
      entry.value = load(sessionID, audience, entry);
      cache.set(key, entry);
      const output = await entry.value;
      if (disposed || entry.abort.signal.aborted) return undefined;
      return entry.status === "ready" ? renderBeadsContext(output!, audience, { sessionID, agent: agentID, capabilities }) : output;
    },

    invalidate: dropSession,
    forget: dropSession,
    statusFor: (sessionID, audience) => cache.get(`${sessionID}\0${audience}`)?.status,
    invalidateAll() {
      for (const entry of cache.values()) entry.abort.abort();
      cache.clear();
    },
    dispose() {
      disposed = true;
      for (const entry of cache.values()) entry.abort.abort();
      cache.clear();
      modes.clear();
    },
  };
}
