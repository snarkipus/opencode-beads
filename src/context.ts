import { BEADS_TASK_AGENTS } from "./agents";
import { guardNotice, type GuardResult } from "./guard";
import { PrimeTimeoutError } from "./prime";
import { beadsGuidance } from "./guidance";

/** Retry window for withheld or failed context, so model steps do not respawn `bd` each time. */
export const DEFAULT_CONTEXT_RETRY_MS = 30_000;

export type AgentMode = "primary" | "subagent" | "all";
export type ContextAudience = "primary" | "task-agent";
export type ContextDiagnostic = "agent_lookup_failed" | "prime_failed" | "prime_timeout";

export interface ContextRuntime {
  guard(directory: string): Promise<GuardResult>;
  prime(directory: string): Promise<string>;
  /** Resolve an agent's mode; undefined when the agent is unknown. */
  agentMode(agentID: string): Promise<AgentMode | undefined>;
  diagnose?(code: ContextDiagnostic, sessionID: string): void;
}

export interface ContextControllerOptions {
  retryMs?: number;
  now?: () => number;
}

export interface ContextController {
  /** System text for one model request, or undefined when nothing should be added. */
  systemFor(sessionID: string, agentID: string): Promise<string | undefined>;
  /** Refresh prime on the next request, e.g. after compaction changed the session. */
  invalidate(sessionID: string): void;
  /** Drop all state for a deleted session. */
  forget(sessionID: string): void;
}

type CacheEntry = { value: Promise<string | undefined>; expiresAt?: number };

/** Wrap prime output in the envelope and shared guidance for one audience. */
export function renderBeadsContext(prime: string, audience: ContextAudience): string {
  return `<beads-context audience="${audience}">\n${prime}\n</beads-context>\n\n${beadsGuidance(audience)}`;
}

/**
 * Supply Beads context through the per-request session context hook.
 *
 * OpenCode V2 attaches system parts to every model request without storing them, so context
 * survives compaction on its own. The rendered text is cached per session to keep it stable
 * across requests; compaction invalidates it so persistent memories can refresh.
 */
export function createContextController(
  runtime: ContextRuntime,
  directory: string,
  options: ContextControllerOptions = {}
): ContextController {
  const retryMs = options.retryMs ?? DEFAULT_CONTEXT_RETRY_MS;
  const now = options.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();
  const modes = new Map<string, Promise<AgentMode | undefined>>();

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
      guard = await runtime.guard(directory);
    } catch {
      return retryLater(undefined);
    }
    if (guard.kind !== "ready") return retryLater(guardNotice(guard));

    let output: string;
    try {
      output = (await runtime.prime(directory)).trim();
    } catch (error) {
      runtime.diagnose?.(
        error instanceof PrimeTimeoutError ? "prime_timeout" : "prime_failed",
        sessionID
      );
      return retryLater(undefined);
    }
    if (!output) return retryLater(undefined);
    return renderBeadsContext(output, audience);
  }

  function dropSession(sessionID: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(`${sessionID}\0`)) cache.delete(key);
    }
  }

  return {
    async systemFor(sessionID, agentID) {
      const audience = await audienceFor(sessionID, agentID);
      if (!audience) return undefined;

      const key = `${sessionID}\0${audience}`;
      const cached = cache.get(key);
      if (cached && (cached.expiresAt === undefined || cached.expiresAt > now())) {
        return cached.value;
      }

      const entry: CacheEntry = { value: Promise.resolve(undefined) };
      entry.value = load(sessionID, audience, entry);
      cache.set(key, entry);
      return entry.value;
    },

    invalidate: dropSession,
    forget: dropSession,
  };
}
