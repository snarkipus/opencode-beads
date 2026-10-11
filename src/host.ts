import type { Plugin } from "@opencode/plugin";
import { applyBeadsAgents, beadsAgents } from "./agents";
import {
  createContextController,
  type AgentMode,
  type ContextDiagnostic,
  type ContextRuntime,
} from "./context";
import { checkBeadsStore, createGuardRuntime } from "./guard";
import { minimizeSystemParts } from "./instructions";
import { runBd, runBdPrime } from "./prime";

/** The slice of the OpenCode V2 plugin context this adapter uses. */
export type HostContext = Pick<Plugin.Context, "location" | "options" | "event"> & {
  agent: Pick<Plugin.Context["agent"], "get" | "transform">;
  session: Pick<Plugin.Context["session"], "hook">;
};

export interface HostDependencies {
  /** Override process-backed Beads calls, mainly for tests. */
  runtime?: Partial<Pick<ContextRuntime, "guard" | "prime">>;
  /** Override the bounded `bd` runner used by the store guard. */
  bd?: (directory: string, args: readonly string[]) => Promise<string>;
  warn?: (message: string) => void;
  diagnosticIntervalMs?: number;
  now?: () => number;
  retryMs?: number;
}

const DEFAULT_DIAGNOSTIC_INTERVAL_MS = 60_000;

function eventSessionID(event: unknown): string | undefined {
  if (typeof event !== "object" || event === null) return undefined;
  const data = (event as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return undefined;
  const sessionID = (data as { sessionID?: unknown }).sessionID;
  return typeof sessionID === "string" ? sessionID : undefined;
}

/** Wire Beads context into an OpenCode V2 plugin context; returns the plugin cleanup. */
export async function setupBeads(
  ctx: HostContext,
  deps: HostDependencies = {}
): Promise<() => void> {
  const directory = ctx.location.directory;
  const autoMigrate = ctx.options?.autoMigrate === true;
  const now = deps.now ?? Date.now;
  const warn = deps.warn ?? ((message: string) => console.warn(message));
  const diagnosticIntervalMs = deps.diagnosticIntervalMs ?? DEFAULT_DIAGNOSTIC_INTERVAL_MS;
  const diagnosticTimes = new Map<string, number>();

  const guardRuntime = createGuardRuntime(deps.bd ?? ((cwd, args) => runBd(cwd, args)));
  const runtime: ContextRuntime = {
    guard: deps.runtime?.guard ?? ((cwd) => checkBeadsStore(cwd, guardRuntime, { autoMigrate })),
    prime: deps.runtime?.prime ?? ((cwd) => runBdPrime(cwd)),
    async agentMode(agentID): Promise<AgentMode | undefined> {
      const response = await ctx.agent.get({ agentID });
      return response.data.mode;
    },
    diagnose(code: ContextDiagnostic, sessionID: string) {
      const key = `${code}:${sessionID}`;
      const previous = diagnosticTimes.get(key);
      const current = now();
      if (previous !== undefined && current - previous < diagnosticIntervalMs) return;
      diagnosticTimes.set(key, current);
      try {
        warn(`[opencode-beads] ${code} session=${sessionID} directory=${directory}`);
      } catch {
        // Diagnostics never affect model requests.
      }
    },
  };

  const agents = beadsAgents({ luna: ctx.options?.luna === true });
  await ctx.agent.transform((editor) => applyBeadsAgents(editor, agents));

  const idleMinutes = ctx.options?.refreshAfterIdleMinutes;
  const controller = createContextController(runtime, directory, {
    now: deps.now,
    retryMs: deps.retryMs,
    idleRefreshMs:
      typeof idleMinutes === "number" && Number.isFinite(idleMinutes) && idleMinutes >= 0
        ? idleMinutes * 60_000
        : undefined,
  });

  await ctx.session.hook("context", async (event) => {
    const text = await controller.systemFor(event.sessionID, event.agent);
    if (!text) return;
    // With prime attached, bd's full AGENTS.md sections only repeat it (Claude Code gets a pointer).
    if (text.startsWith("<beads-context")) minimizeSystemParts(event.system);
    event.system.push({ type: "text", text });
  });

  const abort = new AbortController();
  void (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: abort.signal })) {
        const type = (event as { type?: unknown }).type;
        const sessionID = eventSessionID(event);
        if (!sessionID) continue;
        if (type === "session.compaction.ended") controller.invalidate(sessionID);
        else if (type === "session.deleted") {
          controller.forget(sessionID);
          for (const key of diagnosticTimes.keys()) {
            if (key.endsWith(`:${sessionID}`)) diagnosticTimes.delete(key);
          }
        }
      }
    } catch {
      // The stream ends on cleanup; lost events only delay a cache refresh.
    }
  })();

  return () => abort.abort();
}
