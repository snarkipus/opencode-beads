import type { Plugin } from "@opencode/plugin";
import { applyBeadsAgents, beadsAgents } from "./agents";
import { BEADS_COMPACTION_GUIDANCE } from "./guidance";
import {
  createContextController,
  type AgentMode,
  type ContextDiagnostic,
  type ContextRuntime,
} from "./context";
import { checkBeadsStore, createGuardRuntime } from "./guard";
import { minimizeSystemParts } from "./instructions";
import { runBd, runBdPrime } from "./prime";
import { createContinuityTools, type ContinuityDependencies, type ContinuityResult } from "./continuity";

/** The slice of the OpenCode V2 plugin context this adapter uses. */
export type HostContext = Pick<Plugin.Context, "app" | "location" | "options" | "event"> & {
  agent: Pick<Plugin.Context["agent"], "get" | "transform">;
  session: Pick<Plugin.Context["session"], "hook"> & Partial<Pick<Plugin.Context["session"], "get">>;
  tool?: Pick<Plugin.Context["tool"], "hook" | "transform">;
  permission?: Pick<Plugin.Context["permission"], "assert">;
};

export interface HostDependencies {
  /** Override process-backed Beads calls, mainly for tests. */
  runtime?: Partial<Pick<ContextRuntime, "guard" | "prime">>;
  /** Override the `bd prime` runner (receives `--full`, plus `--stealth` when enabled). */
  runPrime?: (directory: string, flags: readonly string[]) => Promise<string>;
  /** Override the bounded `bd` runner used by the store guard. */
  bd?: (directory: string, args: readonly string[]) => Promise<string>;
  warn?: (message: string) => void;
  diagnosticIntervalMs?: number;
  now?: () => number;
  retryMs?: number;
  /** Internal qualification seam for tests; production remains false pending successful 1.1. */
  continuityQualified?: boolean;
  /** Overrides the same adapter dependencies used after qualification. */
  continuity?: ContinuityDependencies;
}

const DEFAULT_DIAGNOSTIC_INTERVAL_MS = 60_000;
const SUPPORTED_OPENCODE_RANGE = ">=2.1.1 <2.2";

function isSupportedOpenCodeVersion(version: string): boolean {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return major === 2 && minor === 1 && patch >= 1;
}

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
  // `--full` defeats bd's MCP detection, which reads Claude Code's settings and would otherwise
  // shrink prime to MCP reminders; OpenCode has no Beads MCP tool. `--stealth` mirrors
  // `bd setup claude --stealth`: prime without git operations in the session-close protocol.
  const primeFlags = ctx.options?.stealth === true ? ["--full", "--stealth"] : ["--full"];
  const now = deps.now ?? Date.now;
  const warn = deps.warn ?? ((message: string) => console.warn(message));
  const diagnosticIntervalMs = deps.diagnosticIntervalMs ?? DEFAULT_DIAGNOSTIC_INTERVAL_MS;
  const diagnosticTimes = new Map<string, number>();
  const abort = new AbortController();
  const registrations: Array<{ dispose(): Promise<void> }> = [];

  const hostVersion = typeof ctx.app?.version === "string" ? ctx.app.version : "unknown";
  if (!isSupportedOpenCodeVersion(hostVersion)) {
    try {
      warn(
        `[opencode-beads] unsupported-host OpenCode ${hostVersion}; supported beta/next range is ${SUPPORTED_OPENCODE_RANGE}. No Beads agents or hooks were registered.`
      );
    } catch {
      // Host-version diagnostics never affect plugin loading.
    }
    return () => {};
  }

  const runtime: ContextRuntime = {
    guard: deps.runtime?.guard ?? ((cwd, signal) => checkBeadsStore(cwd,
      createGuardRuntime(deps.bd ?? ((dir, args) => runBd(dir, args, { signal }))), { autoMigrate })),
    prime:
      deps.runtime?.prime ??
      ((cwd, signal) => deps.runPrime ? deps.runPrime(cwd, primeFlags) : runBdPrime(cwd, { signal }, primeFlags)),
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

  const stepsOption = ctx.options?.taskAgentSteps;
  const agents = beadsAgents({
    luna: ctx.options?.luna === true,
    steps: typeof stepsOption === "number" && Number.isInteger(stepsOption) && stepsOption >= 0 ? stepsOption : undefined,
  });
  registrations.push(await ctx.agent.transform((editor) => applyBeadsAgents(editor, agents)));

  const idleMinutes = ctx.options?.refreshAfterIdleMinutes;
  const controller = createContextController(runtime, directory, {
    now: deps.now,
    retryMs: deps.retryMs,
    idleRefreshMs:
      typeof idleMinutes === "number" && Number.isFinite(idleMinutes) && idleMinutes >= 0
        ? idleMinutes * 60_000
        : undefined,
  });

  // Sessions that have received Beads context; their compaction summaries should keep Beads state.
  const beadsSessions = new Map<string, Set<string>>();
  const recoveryCues = new Map<string, string>();
  const references = new Map<string, Set<string>>();
  const gaps = new Map<string, string>();

  function rememberResult(sessionID: string, result: ContinuityResult): void {
    if (abort.signal.aborted) return;
    controller.invalidateAll();
    if (result.reference) {
      const values = references.get(sessionID) ?? new Set<string>();
      values.add(`${result.operation === "checkpoint" ? "task" : "memory"}:${result.reference}`);
      // Only bounded invocation references, never transcripts or extracted semantic memory.
      if (values.size > 32) values.delete(values.values().next().value!);
      references.set(sessionID, values);
    }
    if (result.status !== "acknowledged") gaps.set(sessionID, `${result.status}: ${result.detail ?? "commit not confirmed"}`);
    recoveryCues.set(sessionID, "Re-read the affected task and relevant memory before relying on cached state. Do not retry an uncertain write blindly.");
  }

  // 1.1 remains unexecuted: ordinary setup has no product option that enables this path.
  // Tests supply the qualification dependency and the same public host/runner interfaces.
  if (deps.continuityQualified === true && ctx.tool && ctx.permission && ctx.session.get) {
    registrations.push(await ctx.tool.transform((editor) => {
      for (const tool of createContinuityTools({ location: ctx.location, permission: ctx.permission!, session: { get: ctx.session.get! } }, {
        ...deps.continuity, signal: abort.signal,
        acknowledged(sessionID, result) {
          rememberResult(sessionID, result);
          deps.continuity?.acknowledged?.(sessionID, result);
        },
      })) editor.add(tool);
    }));
  }

  registrations.push(await ctx.session.hook("context", async (event) => {
    if (abort.signal.aborted) return;
    if (ctx.session.get) {
      try {
        const info = await ctx.session.get({ sessionID: event.sessionID });
        if (info.location.directory !== directory) {
          controller.forget(event.sessionID);
          beadsSessions.delete(event.sessionID);
          references.delete(event.sessionID);
          gaps.delete(event.sessionID);
          recoveryCues.delete(event.sessionID);
          return;
        }
      } catch {
        if (!abort.signal.aborted) event.system.push({ type: "text", text: "<beads-notice>Beads context withheld: current session location could not be established. Do not bypass this hold with manual store access.</beads-notice>" });
        return;
      }
    }
    const text = await controller.systemFor(event.sessionID, event.agent);
    if (!text || abort.signal.aborted) return;
    if (text.startsWith("<beads-context")) {
      const eligible = beadsSessions.get(event.sessionID) ?? new Set<string>();
      eligible.add(event.agent);
      beadsSessions.set(event.sessionID, eligible);
      // Reduce only complete bodies already supplied here; marker ownership alone is insufficient.
      minimizeSystemParts(event.system, text);
    }
    event.system.push({ type: "text", text });
    const cue = recoveryCues.get(event.sessionID);
    if (cue) {
      event.system.push({ type: "text", text: `<beads-recovery>${cue}</beads-recovery>` });
      recoveryCues.delete(event.sessionID);
    }
  }));

  registrations.push(await ctx.session.hook("compaction", (event) => {
    if (!abort.signal.aborted && beadsSessions.get(event.sessionID)?.has(event.agent)) {
      event.system.push({ type: "text", text: BEADS_COMPACTION_GUIDANCE });
      const known = references.get(event.sessionID);
      const gap = gaps.get(event.sessionID);
      if (known?.size || gap) event.system.push({ type: "text", text: `<beads-references>${JSON.stringify({ references: [...(known ?? [])], gap: gap ?? "No final-write guarantee; only earlier acknowledgements are known." })}</beads-references>` });
    }
  }));

  if (ctx.tool) registrations.push(await ctx.tool.hook("execute.after", (event) => {
    // Typed inner calls acknowledge in their executor. The outer code-mode result adds nothing.
    if (abort.signal.aborted || event.tool === "execute" || event.tool.startsWith("beads_") || !beadsSessions.has(event.sessionID)) return;
    if (event.status === "error" || event.tool === "subagent") {
      controller.invalidate(event.sessionID);
      recoveryCues.set(event.sessionID, event.status === "error"
        ? "A tool failed. Preserve the actual failure, attempted approach and next action in task context when authorized; a failed invocation is not a saved checkpoint."
        : "A child returned. Reconcile its scope, attempts, validation, durable references and incomplete work before proceeding within the existing authorization.");
    }
  }));

  void (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: abort.signal })) {
        if (abort.signal.aborted) break;
        const type = (event as { type?: unknown }).type;
        const sessionID = eventSessionID(event);
        if (!sessionID) continue;
        if (type === "session.deleted" || type === "session.moved" || type === "session.forked") {
          controller.forget(sessionID);
          beadsSessions.delete(sessionID);
          references.delete(sessionID);
          recoveryCues.delete(sessionID);
          gaps.delete(sessionID);
          for (const key of diagnosticTimes.keys()) {
            if (key.endsWith(`:${sessionID}`)) diagnosticTimes.delete(key);
          }
        } else if (beadsSessions.has(sessionID) && ["session.compaction.started", "session.compaction.ended", "session.compaction.failed",
          "session.execution.started", "session.execution.interrupted", "session.execution.failed", "session.model.selected", "session.agent.selected"].includes(String(type))) {
          controller.invalidate(sessionID);
          recoveryCues.set(sessionID, "Recovery requires current task state and relevant memory: re-read attempts, decisions, blockers and the next authorized action. Cached absence is not proof of absence; preserve any guard hold.");
          if (type === "session.execution.interrupted" || type === "session.execution.failed" || type === "session.compaction.failed") {
            gaps.set(sessionID, "Execution or compaction stopped; no final checkpoint is guaranteed. Recover from earlier acknowledged records.");
          }
        }
      }
    } catch {
      // The stream ends on cleanup; lost events only delay a cache refresh.
    }
  })();

  return () => {
    abort.abort();
    controller.dispose();
    beadsSessions.clear();
    recoveryCues.clear();
    references.clear();
    gaps.clear();
    diagnosticTimes.clear();
    for (const registration of registrations) void registration.dispose().catch(() => {});
  };
}
