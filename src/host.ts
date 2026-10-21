import type { Plugin } from "@opencode/plugin";
import { applyBeadsSkill, createBeadsCommands, loadBeadsSkill, type SkillLoadDependencies } from "./workflows";
import { applyBeadsAgents, beadsAgents, BEADS_TASK_AGENTS } from "./agents";
import { BEADS_COMPACTION_GUIDANCE, UNKNOWN_CAPABILITIES, type RequestCapabilities } from "./guidance";
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
  session: Pick<Plugin.Context["session"], "hook"> & Partial<Pick<Plugin.Context["session"], "get" | "prompt">>;
  tool?: Pick<Plugin.Context["tool"], "hook" | "transform">;
  permission?: Pick<Plugin.Context["permission"], "assert">;
  command?: Pick<Plugin.Context["command"], "list" | "transform">;
  skill?: Pick<Plugin.Context["skill"], "list" | "transform">;
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
  /** Override package reads only; no user-facing activation or installation option. */
  workflowAssets?: SkillLoadDependencies;
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
): Promise<() => Promise<void>> {
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
    return async () => {};
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
  const gaps = new Map<string, Set<string>>();
  const requestCapabilities = new Map<string, { agent: string; capabilities: RequestCapabilities }>();
  let typedRegistration = deps.continuityQualified === true ? "unavailable: host tool/permission/session interface missing" : "withheld pending 1.1";

  /** Retain distinct unresolved outcomes without a read, success or lifecycle cue erasing them. */
  function recordGap(sessionID: string, detail: string): void {
    const known = gaps.get(sessionID) ?? new Set<string>();
    if (known.size < 32) known.add(detail);
    else if (!known.has(detail)) known.add("Additional persistence gaps exceed the retained detail limit; earlier unresolved details remain. Inspect tool outcomes before further writes.");
    gaps.set(sessionID, known);
  }

  /** Render bounded persistence state independently of the next-request recovery cue. */
  function gapFor(sessionID: string): string | undefined {
    return [...(gaps.get(sessionID) ?? [])].join("\n") || undefined;
  }

  /** Drop every location-bound reference together before another request can reuse it. */
  function forgetSession(sessionID: string): void {
    controller.forget(sessionID);
    beadsSessions.delete(sessionID);
    references.delete(sessionID);
    recoveryCues.delete(sessionID);
    gaps.delete(sessionID);
    requestCapabilities.delete(sessionID);
    for (const key of diagnosticTimes.keys()) {
      if (key.endsWith(`:${sessionID}`)) diagnosticTimes.delete(key);
    }
  }

  let observation: Promise<void> | undefined;
  let cleanupPromise: Promise<void> | undefined;
  /** Abort immediately; callers can await all scoped registration/observer disposal. */
  function cleanup(): Promise<void> {
    if (cleanupPromise) return cleanupPromise;
    abort.abort();
    controller.dispose();
    beadsSessions.clear();
    recoveryCues.clear();
    references.clear();
    gaps.clear();
    requestCapabilities.clear();
    diagnosticTimes.clear();
    const pending = registrations.splice(0).reverse().map((registration) => {
      try { return registration.dispose(); } catch (error) { return Promise.reject(error); }
    });
    cleanupPromise = Promise.allSettled([...pending, ...(observation ? [observation] : [])]).then((results) => {
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failures.length) {
        try { warn("[opencode-beads] cleanup-failed: owned registration disposal failed"); } catch { /* Preserve the actual failure. */ }
        throw new AggregateError(failures.map((result) => result.reason), "Beads cleanup failed");
      }
    });
    return cleanupPromise;
  }

  try {
    registrations.push(await ctx.agent.transform((editor) => {
      if (!abort.signal.aborted) applyBeadsAgents(editor, agents);
    }));

    // Diagnostics share the host's bounded reporting state; no status service or store reads.
    function workflowDiagnostic(message: string): void {
      if (abort.signal.aborted || diagnosticTimes.has(message)) return;
      diagnosticTimes.set(message, now());
      try { warn(`[opencode-beads] ${message}`); } catch { /* Diagnostics never break loading. */ }
    }

    let skillFailure: string | undefined;
    if (ctx.skill) {
      let skill;
      try { skill = await loadBeadsSkill(deps.workflowAssets); }
      catch (error) {
        skillFailure = error instanceof Error ? error.message : "skill-unreachable";
        workflowDiagnostic(skillFailure);
      }
      if (skill) {
        const packagedSkill = skill;
        registrations.push(await ctx.skill.transform((editor) => {
          if (!abort.signal.aborted) applyBeadsSkill(editor, packagedSkill, workflowDiagnostic);
        }));
      }
    }

    // Native package transforms precede config/file command transforms. Competing
    // plugins use the same ordinary ordering; initial lookup is diagnostic only.
    if (ctx.command && ctx.session.prompt) {
      let commandRegistration = "pending";
      const definitions = createBeadsCommands({ prompt: ctx.session.prompt }, async (sessionID) => {
        let context: string = "uncertain";
        let locationKnown = false;
        if (ctx.session.get) {
          try {
            const info = await ctx.session.get({ sessionID: sessionID as Parameters<NonNullable<typeof ctx.session.get>>[0]["sessionID"] });
            if (info.location.directory !== directory) {
              forgetSession(sessionID);
              context = "withheld: session location changed";
            } else {
              locationKnown = true;
              const observedAgent = requestCapabilities.get(sessionID)?.agent;
              const audience = observedAgent && BEADS_TASK_AGENTS.has(observedAgent) ? "task-agent" : "primary";
              const cached = controller.statusFor(sessionID, audience);
              context = cached === "loading" ? "uncertain: context refresh in progress" : cached ?? "missing: not loaded";
            }
          } catch { forgetSession(sessionID); context = "uncertain: session lookup failed"; }
        }
        let guard: unknown = { kind: "withheld", reason: "session location unconfirmed" };
        if (locationKnown && !abort.signal.aborted) {
          try { guard = await runtime.guard(directory, abort.signal); }
          catch { guard = { kind: "probe-failed" }; }
        }
        let effectiveCommands: Array<{ name: string; description?: string }> | undefined;
        let effectiveSkills: string[] | string;
        try { effectiveCommands = (await ctx.command!.list()).data.map(({ name, description }) => ({ name, description })); }
        catch { /* Absence of lookup evidence is unknown, not an empty registry. */ }
        try { effectiveSkills = ctx.skill ? (await ctx.skill.list()).data.map((entry) => String(entry.id)) : "unavailable"; }
        catch { effectiveSkills = "unavailable: registry lookup failed"; }
        return JSON.stringify({
          host: hostVersion, admission: SUPPORTED_OPENCODE_RANGE, liveQualification: "not executed",
          commands: {
            registration: commandRegistration,
            lookup: effectiveCommands ? "available" : "failed",
            effective: effectiveCommands ?? "unknown: registry lookup failed",
            mismatches: effectiveCommands && definitions.flatMap((expected) => {
              const effective = effectiveCommands.find((entry) => entry.name === expected.name);
              return effective && effective.description !== expected.description
                ? [{ name: expected.name, expectedDescription: expected.description, effectiveDescription: effective.description }]
                : [];
            }),
            missing: effectiveCommands && definitions.filter((expected) => !effectiveCommands.some((entry) => entry.name === expected.name)).map((entry) => entry.name),
            ownership: "unavailable: public owner identity is not exposed; matching names/descriptions do not prove ownership; identical-description overrides cannot be detected",
          },
          skill: { failure: skillFailure, effective: effectiveSkills },
          typedContinuity: deps.continuityQualified === true ? "internal qualification fixture" : "withheld pending 1.1",
          typedRegistration,
          requestCapability: requestCapabilities.get(sessionID) ?? "unknown: no actual request observation",
          leafAvailability: "unknown until native catalog discovery and per-operation permission checks; execute visibility alone does not prove leaf availability",
          context, guard, persistence: gapFor(sessionID) ?? "uncertain: no final-write guarantee",
        });
      }, deps.workflowAssets?.skillPath, abort.signal);
      let existing: string[];
      try { existing = (await ctx.command.list()).data.map((entry) => entry.name); }
      catch { existing = []; workflowDiagnostic("command-registry-unavailable: effective ownership unknown"); }
      const names = definitions.map((entry) => entry.name);
      const collisions = existing.filter((name) => names.includes(name));
      if (collisions.length) workflowDiagnostic(`command-collision: ${collisions.join(", ")}; earlier entries follow native precedence and may be replaced by this package`);
      try {
        registrations.push(await ctx.command.transform((editor) => {
          if (abort.signal.aborted) return;
          for (const definition of definitions) editor.add(definition);
        }));
        commandRegistration = "registered";
      } catch (error) {
        commandRegistration = "failed";
        workflowDiagnostic("command-registration-failed: native transform failed");
        throw error;
      }
    }

    function rememberResult(sessionID: string, result: ContinuityResult): void {
      if (abort.signal.aborted) return;
      const write = ["claim", "note", "update", "close", "create", "remember"].includes(result.operation);
      // Full prime can depend on issue state. 7.1 does not establish safe narrowing.
      if (write && result.status !== "not-claimed") controller.invalidateAll();
      const values = references.get(sessionID) ?? new Set<string>();
      const memory = ["remember", "recall", "memories"].includes(result.operation);
      if (["acknowledged", "found", "landed-uncommitted"].includes(result.status)) {
        if (result.reference) values.add(`${memory ? "memory" : "task"}:${result.reference}`);
        if (result.operation === "get") for (const id of Object.keys(result.issues ?? {})) values.add(`task:${id}`);
        if (result.operation === "find") for (const row of result.records ?? []) values.add(`task:${row.id}`);
      }
      while (values.size > 32) values.delete(values.values().next().value!);
      if (values.size) references.set(sessionID, values);
      if (["uncertain", "failed", "landed-uncommitted"].includes(result.status) || result.complete === false) {
        const detail = `${result.operation} ${JSON.stringify(result.target)}${result.actor ? ` actor=${result.actor}` : ""}: ${result.status}; ${result.detail ?? (result.complete === false ? "partial result; inspect failed IDs/completeness" : "commit not confirmed")}`;
        if (write) recordGap(sessionID, detail);
        else recoveryCues.set(sessionID, `Inspect current ${memory ? "memory" : "task"} state before relying on this outcome: ${detail}. Do not retry an uncertain write blindly.`);
      }
    }

    // 1.1 remains unexecuted: ordinary setup has no product option that enables this path.
    // Tests supply the qualification dependency and the same public host/runner interfaces.
    if (deps.continuityQualified === true && ctx.tool && ctx.permission && ctx.session.get) {
      registrations.push(await ctx.tool.transform((editor) => {
        if (abort.signal.aborted) return;
        editor.namespace({ name: "beads", description: "Permissioned Beads daily-loop reads and writes. Search this namespace for current signatures; inspect outcome and completeness before dependent work." });
        for (const tool of createContinuityTools({ location: ctx.location, permission: ctx.permission!, session: { get: ctx.session.get! } }, {
          ...deps.continuity, signal: abort.signal,
          acknowledged(sessionID, result) {
            rememberResult(sessionID, result);
            deps.continuity?.acknowledged?.(sessionID, result);
          },
        })) editor.add(tool);
        typedRegistration = "registered: beads namespace, code-mode-only";
      }));
    }

    registrations.push(await ctx.session.hook("context", async (event) => {
      if (abort.signal.aborted) return;
      if (ctx.session.get) {
        try {
          const info = await ctx.session.get({ sessionID: event.sessionID });
          if (info.location.directory !== directory) {
            forgetSession(event.sessionID);
            return;
          }
        } catch {
          forgetSession(event.sessionID);
          if (!abort.signal.aborted) event.system.push({ type: "text", text: "<beads-notice>Beads context withheld: current session location could not be established. Do not bypass this hold with manual store access.</beads-notice>" });
          return;
        }
      }
      const knownTools = event.tools && typeof event.tools === "object";
      const capabilities: RequestCapabilities = knownTools ? {
        execute: Object.hasOwn(event.tools, "execute"), shell: Object.hasOwn(event.tools, "shell"),
        typed: typedRegistration.startsWith("registered") && Object.hasOwn(event.tools, "execute") ? "registered-execute-visible" : "unavailable",
      } : { ...UNKNOWN_CAPABILITIES };
      requestCapabilities.set(event.sessionID, { agent: event.agent, capabilities });
      const text = await controller.systemFor(event.sessionID, event.agent, capabilities);
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
      const gap = gapFor(event.sessionID);
      if (cue || gap) {
        const recovery = [cue, gap && `Known persistence gaps: inspect durable state before another write; do not blindly retry.\n${gap}`].filter(Boolean).join("\n");
        event.system.push({ type: "text", text: `<beads-recovery>${recovery}</beads-recovery>` });
        recoveryCues.delete(event.sessionID);
      }
    }));

    registrations.push(await ctx.session.hook("compaction", (event) => {
      if (!abort.signal.aborted && beadsSessions.get(event.sessionID)?.has(event.agent)) {
        event.system.push({ type: "text", text: BEADS_COMPACTION_GUIDANCE });
        const known = references.get(event.sessionID);
        const gap = gapFor(event.sessionID);
        if (known?.size || gap) event.system.push({ type: "text", text: `<beads-references>${JSON.stringify({ references: [...(known ?? [])], gap: gap ?? "No final-write guarantee; only earlier acknowledgements are known." })}</beads-references>` });
      }
    }));

    if (ctx.tool) registrations.push(await ctx.tool.hook("execute.after", (event) => {
      // Typed inner calls acknowledge in their executor. The outer code-mode result adds nothing.
      if (abort.signal.aborted || event.tool === "execute" || event.tool.startsWith("beads_") || !beadsSessions.has(event.sessionID)) return;
      if (event.tool === "subagent") {
        controller.invalidate(event.sessionID);
        recoveryCues.set(event.sessionID, "A child returned. Reconcile its scope, attempts, validation, durable references and incomplete work before proceeding within the existing authorization.");
      }
    }));

    observation = (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: abort.signal })) {
          if (abort.signal.aborted) break;
          const type = (event as { type?: unknown }).type;
          const sessionID = eventSessionID(event);
          if (!sessionID) continue;
          if (type === "session.deleted" || type === "session.moved" || type === "session.forked") {
            forgetSession(sessionID);
          } else if (beadsSessions.has(sessionID) && ["session.compaction.started", "session.compaction.ended", "session.compaction.failed",
            "session.execution.started", "session.execution.interrupted", "session.execution.failed", "session.model.selected", "session.agent.selected"].includes(String(type))) {
            controller.invalidate(sessionID);
            recoveryCues.set(sessionID, "Recovery requires current task state and relevant memory: re-read attempts, decisions, blockers and the next authorized action. Cached absence is not proof of absence; preserve any guard hold.");
            if (type === "session.execution.interrupted" || type === "session.execution.failed" || type === "session.compaction.failed") {
              recordGap(sessionID, "Execution or compaction stopped; no final checkpoint is guaranteed. Recover from earlier acknowledged records.");
            }
          }
        }
      } catch {
        // The stream ends on cleanup; lost events only delay a cache refresh.
      }
    })();

    return cleanup;
  } catch (error) {
    // Setup failures must not leave earlier registrations alive. Keep the setup error
    // as the primary failure; cleanup reports its own failure independently.
    await cleanup().catch(() => {});
    throw error;
  }
}
