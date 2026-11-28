import type { Plugin } from "@opencode/plugin";
import { isSupportedOpenCodeVersion, SUPPORTED_OPENCODE_RANGE } from "./host-admission";
import type { SessionContext } from "@opencode/plugin/promise/session";
import packageManifest from "../package.json";
import {
  applyBeadsSkill,
  createBeadsCommands,
  expandBeadsWorkflowContext,
  loadBeadsSkill,
  type SkillLoadDependencies,
} from "./workflows";
import { applyBeadsAgents, beadsAgents, BEADS_TASK_AGENTS } from "./agents";
import { BEADS_COMPACTION_GUIDANCE, UNKNOWN_CAPABILITIES, type RequestCapabilities } from "./guidance";
import { createContextController, type AgentMode, type ContextDiagnostic, type ContextRuntime } from "./context";
import { checkBeadsStore, createGuardRuntime } from "./guard";
import type { GuardResult } from "./guard";
import { countManagedBlocks, minimizeSystemParts } from "./instructions";
import { runBd, runBdPrime } from "./prime";
import {
  collectBeadsHealth,
  collectHooks,
  collectPluginHealth,
  collectSyncTarget,
  DIAGNOSTIC_ENV,
  renderHealthReport,
  type DiagnosticsSnapshot,
} from "./diagnostics";
import { createContinuityTools, type ContinuityDependencies, type ContinuityResult } from "./continuity";

/**
 * Native interfaces scoped to one plugin location. Optional interfaces let setup
 * omit unsupported integrations while retaining the session hooks.
 */
export type HostContext = Pick<Plugin.Context, "app" | "location" | "options" | "event"> & {
  agent: Pick<Plugin.Context["agent"], "get" | "transform">;
  session: Pick<Plugin.Context["session"], "hook" | "context"> &
    Partial<Pick<Plugin.Context["session"], "get" | "prompt">>;
  tool?: Pick<Plugin.Context["tool"], "hook" | "transform">;
  permission?: Pick<Plugin.Context["permission"], "assert">;
  command?: Pick<Plugin.Context["command"], "list" | "transform">;
  skill?: Pick<Plugin.Context["skill"], "list" | "transform">;
};

/** Setup overrides for native I/O, context timing and optional registration. */
export interface HostDependencies {
  /** Override process-backed Beads calls, mainly for tests. */
  runtime?: Partial<Pick<ContextRuntime, "guard" | "prime">>;
  /** Override the `bd prime` runner (receives `--full`, plus `--stealth` when enabled). */
  runPrime?: (directory: string, flags: readonly string[]) => Promise<string>;
  /** Override the bounded `bd` runner used by CLI/workspace compatibility checks. */
  bd?: (directory: string, args: readonly string[]) => Promise<string>;
  /** Receives best-effort host diagnostics. Exceptions from the sink are ignored. */
  warn?: (message: string) => void;
  /** Minimum interval between context warnings for the same diagnostic and session. */
  diagnosticIntervalMs?: number;
  /** Millisecond clock shared by context freshness checks and diagnostic observations. */
  now?: () => number;
  /** Context controller delay before retrying an unsuccessful refresh. */
  retryMs?: number;
  /** Enable the accepted code-mode registration; public entrypoint supplies true. Tests may omit it. */
  continuityQualified?: boolean;
  /** Test overrides for the accepted adapter dependencies; public setup uses production defaults. */
  continuity?: ContinuityDependencies;
  /** Override package reads only; no user-facing activation or installation option. */
  workflowAssets?: SkillLoadDependencies;
}

const WORKFLOW_UNAVAILABLE_NOTICE =
  "<beads-notice>Saved Beads workflow instructions or diagnostics are unavailable for a compact command. Continue only from visible user input and supplied context; do not invent missing guidance or replay an operation.</beads-notice>";

const DEFAULT_DIAGNOSTIC_INTERVAL_MS = 60_000;
const COMMAND_REGISTRY_LIMIT = 128;
const COMMAND_NAME_LIMIT = 128;
const COMMAND_DESCRIPTION_LIMIT = 512;
const DIRECT_BEADS_TOOLS = new Set([
  "beads_find",
  "beads_get",
  "beads_edges",
  "beads_memories",
  "beads_recall",
  "beads_claim",
  "beads_note",
  "beads_update",
  "beads_close",
  "beads_create",
  "beads_remember",
]);

/**
 * Read the session identity from a native event envelope, if present.
 * @param event Subscription payload, which may be unrelated to a session.
 */
function eventSessionID(event: unknown): string | undefined {
  if (typeof event !== "object" || event === null) return undefined;
  const data = (event as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return undefined;
  const sessionID = (data as { sessionID?: unknown }).sessionID;
  return typeof sessionID === "string" ? sessionID : undefined;
}

type ObservedCommand = { name: string; description?: string };
type CommandComparison = Pick<NonNullable<DiagnosticsSnapshot["commands"]>, "mismatches" | "missing">;

/**
 * Compare observed rows in package definition order. An incomplete registry can still
 * show a changed description, but only complete membership can show a missing name.
 * @param definitions Package commands in registration order.
 * @param effective Bounded registry rows, or undefined when lookup failed.
 * @param membershipTruncated Whether the entry or name limit obscures membership.
 */
function compareCommandRegistry(
  definitions: readonly ObservedCommand[],
  effective: ObservedCommand[] | undefined,
  membershipTruncated: boolean,
): CommandComparison {
  if (!effective) return { mismatches: undefined, missing: undefined };

  const mismatches = definitions.flatMap((expected) => {
    const entry = effective.find((observed) => observed.name === expected.name);
    if (!entry) return [];
    // A description exactly at the cap could have been clipped to that length.
    const comparable =
      (entry.description?.length ?? 0) < COMMAND_DESCRIPTION_LIMIT &&
      (expected.description?.length ?? 0) < COMMAND_DESCRIPTION_LIMIT;
    if (!comparable || entry.description === expected.description) return [];
    return [
      { name: expected.name, expectedDescription: expected.description, effectiveDescription: entry.description },
    ];
  });
  const missing =
    !membershipTruncated &&
    definitions
      .filter((expected) => !effective.some((entry) => entry.name === expected.name))
      .map((entry) => entry.name);
  return { mismatches, missing };
}

/**
 * Admit the host and install location-scoped native integrations. A registration
 * failure releases earlier registrations before the original error propagates.
 * @param ctx Native interfaces and options for the plugin location.
 * @param deps Overrides for probes, reporting and optional integrations.
 * @returns Idempotent async cleanup, or a no-op for an unsupported host.
 */
export async function setupBeads(ctx: HostContext, deps: HostDependencies = {}): Promise<() => Promise<void>> {
  const directory = ctx.location.directory;
  // Legacy autoMigrate values are ignored: native Beads owns store opening and migrations.
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
        `[opencode-beads] unsupported-host OpenCode ${hostVersion}; supported range is ${SUPPORTED_OPENCODE_RANGE}. No Beads agents or hooks were registered.`,
      );
    } catch {
      // Host-version diagnostics never affect plugin loading.
    }
    return async () => {};
  }

  const runtime: ContextRuntime = {
    guard:
      deps.runtime?.guard ??
      ((cwd, signal) =>
        checkBeadsStore(cwd, createGuardRuntime(deps.bd ?? ((dir, args) => runBd(dir, args, { signal }))))),
    prime:
      deps.runtime?.prime ??
      ((cwd, signal) => (deps.runPrime ? deps.runPrime(cwd, primeFlags) : runBdPrime(cwd, { signal }, primeFlags))),
    /**
     * Resolve the mode from the native agent registry. Lookup failure propagates to the controller.
     * @param agentID Agent selected for the current request.
     */
    async agentMode(agentID): Promise<AgentMode | undefined> {
      const response = await ctx.agent.get({ agentID });
      return response.data.mode;
    },
    /**
     * Rate-limit context warnings by diagnostic and session, even if the warning sink fails.
     * @param code Context failure or hold reported by the controller.
     * @param sessionID Session whose context triggered the warning.
     */
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
    terra: ctx.options?.terra === true,
    steps:
      typeof stepsOption === "number" && Number.isInteger(stepsOption) && stepsOption >= 0 ? stepsOption : undefined,
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
  const contextRecipients = new Map<string, Set<string>>();
  const recoveryCues = new Map<string, string>();
  const references = new Map<string, Set<string>>();
  const gaps = new Map<string, Set<string>>();
  const workflowSnapshotReads = new Map<string, symbol>();
  const requestCapabilities = new Map<string, { agent: string; capabilities: RequestCapabilities }>();
  const requestInstructions = new Map<
    string,
    { at: number; full: number; minimal: number; codex: number; replaced: number; retained: number }
  >();
  let typedRegistration =
    deps.continuityQualified === true
      ? "unavailable: host tool/permission/session interface missing"
      : "disabled: registration not requested";

  let observation: Promise<void> | undefined;
  let cleanupPromise: Promise<void> | undefined;

  try {
    registrations.push(
      await ctx.agent.transform((editor) => {
        if (!abort.signal.aborted) applyBeadsAgents(editor, agents);
      }),
    );

    let skillFailure: string | undefined;
    let skillCollision = "not observed";
    if (ctx.skill) {
      let skill;
      try {
        skill = await loadBeadsSkill(deps.workflowAssets);
      } catch (error) {
        skillFailure = error instanceof Error ? error.message : "skill-unreachable";
        workflowDiagnostic(skillFailure);
      }
      if (skill) {
        const packagedSkill = skill;
        registrations.push(
          await ctx.skill.transform((editor) => {
            if (!abort.signal.aborted) {
              skillCollision = "none detected";
              applyBeadsSkill(editor, packagedSkill, (message) => {
                skillCollision = message;
                workflowDiagnostic(message);
              });
            }
          }),
        );
      }
    }

    // Native package transforms precede config/file command transforms. Competing
    // plugins use the same ordinary ordering; initial lookup is diagnostic only.
    if (ctx.command && ctx.session.prompt) {
      let commandRegistration: NonNullable<DiagnosticsSnapshot["commands"]>["registration"] = "pending";
      const diagnosticBd =
        deps.bd ??
        ((dir: string, args: readonly string[]) => runBd(dir, args, { signal: abort.signal, env: DIAGNOSTIC_ENV }));
      const definitions = createBeadsCommands(
        { prompt: ctx.session.prompt },
        captureDiagnostics,
        deps.workflowAssets?.skillPath,
        abort.signal,
      );
      let existing: string[];
      try {
        existing = (await ctx.command.list()).data.map((entry) => entry.name);
      } catch {
        existing = [];
        workflowDiagnostic("command-registry-unavailable: effective ownership unknown");
      }
      const names = definitions.map((entry) => entry.name);
      const collisions = existing.filter((name) => names.includes(name));
      if (collisions.length)
        workflowDiagnostic(
          `command-collision: ${collisions.join(", ")}; earlier entries follow native precedence and may be replaced by this package`,
        );
      try {
        registrations.push(
          await ctx.command.transform((editor) => {
            if (abort.signal.aborted) return;
            for (const definition of definitions) editor.add(definition);
          }),
        );
        commandRegistration = "registered";
      } catch (error) {
        commandRegistration = "failed";
        workflowDiagnostic("command-registration-failed: native transform failed");
        throw error;
      }

      /**
       * Read current registration and request evidence into a report the workflow saves for hook replay.
       * @param sessionID Session whose location and request evidence the report describes.
       * @param text Optional diagnostics selector supplied with the invocation.
       */
      async function captureDiagnostics(sessionID: string, text?: string): Promise<string> {
        const selector = text?.trim().toLowerCase();
        let context = "uncertain";
        let locationKnown = false;
        let contextObservation: ReturnType<typeof controller.observationFor>;
        if (ctx.session.get) {
          try {
            const session = await ctx.session.get({
              sessionID: sessionID as Parameters<NonNullable<typeof ctx.session.get>>[0]["sessionID"],
            });
            if (session.location.directory !== directory) {
              forgetSession(sessionID);
              context = "withheld: session location changed";
            } else {
              // Record the confirmed location before reading cached context.
              locationKnown = true;
              const lastRequestAgent = requestCapabilities.get(sessionID)?.agent;
              const audience = lastRequestAgent && BEADS_TASK_AGENTS.has(lastRequestAgent) ? "task-agent" : "primary";
              const cachedStatus = controller.statusFor(sessionID, audience);
              contextObservation = controller.observationFor(sessionID, audience);
              context =
                cachedStatus === "loading"
                  ? "uncertain: context refresh in progress"
                  : (cachedStatus ?? "unobserved: no cached context");
            }
          } catch {
            forgetSession(sessionID);
            context = "uncertain: session lookup failed";
          }
        }
        let guard: GuardResult | { kind: "withheld"; reason: string } = {
          kind: "withheld",
          reason: "session location unconfirmed",
        };
        if (locationKnown && !abort.signal.aborted) {
          try {
            guard = deps.runtime?.guard
              ? await runtime.guard(directory, abort.signal)
              : await checkBeadsStore(directory, createGuardRuntime(diagnosticBd));
          } catch {
            guard = { kind: "probe-failed" };
          }
        }
        let local: NonNullable<DiagnosticsSnapshot["local"]> = "withheld";
        if (guard.kind !== "withheld" && !abort.signal.aborted) {
          // Both file observations share one abort check and run in order.
          local = {
            ...(await collectPluginHealth(directory, guard)),
            ...(await collectBeadsHealth(guard)),
          };
        }

        // Hook listing depends on the confirmed location, not on a successful store probe.
        const hooks =
          locationKnown && !abort.signal.aborted
            ? await collectHooks(directory, diagnosticBd)
            : "withheld: session location unconfirmed";
        const syncTarget =
          guard.kind === "ready" && guard.workspace && !abort.signal.aborted
            ? await collectSyncTarget(directory, guard.workspace, diagnosticBd)
            : undefined;
        let effectiveCommands: ObservedCommand[] | undefined;
        let registryTruncated = false;
        let registryMembershipTruncated = false;
        let effectiveSkills: NonNullable<DiagnosticsSnapshot["skill"]>["effective"];
        try {
          const entries = (await ctx.command!.list()).data;
          // Record limits against the source rows before taking the bounded sample.
          registryMembershipTruncated =
            entries.length > COMMAND_REGISTRY_LIMIT || entries.some(({ name }) => name.length > COMMAND_NAME_LIMIT);
          registryTruncated =
            registryMembershipTruncated ||
            entries.some(
              ({ name, description }) =>
                name.length > COMMAND_NAME_LIMIT || (description?.length ?? 0) > COMMAND_DESCRIPTION_LIMIT,
            );
          effectiveCommands = entries.slice(0, COMMAND_REGISTRY_LIMIT).map(({ name, description }) => ({
            name: name.slice(0, COMMAND_NAME_LIMIT),
            description: description?.slice(0, COMMAND_DESCRIPTION_LIMIT),
          }));
        } catch {
          /* Absence of lookup evidence is unknown, not an empty registry. */
        }
        try {
          effectiveSkills = ctx.skill
            ? (await ctx.skill.list()).data.slice(0, 128).map((entry) => String(entry.id).slice(0, 128))
            : "unavailable";
        } catch {
          effectiveSkills = "unavailable: registry lookup failed";
        }
        /**
         * Prefer observed direct leaves over the indirect execute surface.
         * @param request The last observed request for this session, if any.
         */
        function describeLeafAvailability(request: typeof observedRequest): string {
          if (request?.capabilities.direct === true) {
            return "some native direct Beads leaves are visible; each still checks its operation-specific permission";
          }
          if (request?.capabilities.typed === "registered-execute-visible") {
            return "execute is visible; the native catalog and each operation-specific permission determine leaf availability";
          }
          return "unknown until native catalog discovery and per-operation permission checks";
        }

        const observedRequest = requestCapabilities.get(sessionID);
        const snapshot = {
          plugin: { name: packageManifest.name, version: packageManifest.version },
          host: hostVersion,
          admission: SUPPORTED_OPENCODE_RANGE,
          liveQualification: "not measured by diagnostics; see release acceptance evidence",
          commands: {
            registration: commandRegistration,
            lookup: effectiveCommands ? "available" : "failed",
            truncated: registryTruncated,
            membershipTruncated: registryMembershipTruncated,
            expectedCount: definitions.length,
            effective: effectiveCommands ?? "unknown: registry lookup failed",
            ...compareCommandRegistry(definitions, effectiveCommands, registryMembershipTruncated),
            ownership:
              "unavailable: public owner identity is not exposed; matching names/descriptions do not prove ownership; identical-description overrides cannot be detected",
          },
          skill: { failure: skillFailure, effective: effectiveSkills, collision: skillCollision },
          typedContinuity:
            deps.continuityQualified === true
              ? "enabled: qualified registration"
              : "disabled: registration not requested",
          typedRegistration,
          requestCapability: observedRequest ?? "unknown: no actual request observation",
          leafAvailability: describeLeafAvailability(observedRequest),
          local,
          context,
          contextObservation,
          requestInstructions: requestInstructions.get(sessionID) ?? "unobserved",
          guard,
          hooks,
          syncTarget,
          historyRequested: selector === "remote" || selector === "details remote",
          persistence: gapFor(sessionID)?.slice(0, 4096) ?? "uncertain: no final-write guarantee",
        } satisfies DiagnosticsSnapshot;
        return renderHealthReport(snapshot, now(), selector === "details" || selector === "details remote");
      }
    }

    // The public entrypoint enables this path; registration still requires native interfaces.
    if (deps.continuityQualified === true && ctx.tool && ctx.permission && ctx.session.get) {
      registrations.push(
        await ctx.tool.transform((editor) => {
          if (abort.signal.aborted) return;
          editor.namespace({
            name: "beads",
            description:
              "Permissioned Beads daily-loop reads and writes. Search this namespace for current signatures; inspect outcome and completeness before dependent work.",
          });
          for (const tool of createContinuityTools(
            { location: ctx.location, permission: ctx.permission!, session: { get: ctx.session.get! } },
            {
              ...deps.continuity,
              signal: abort.signal,
              /**
               * Apply host bookkeeping before notifying the optional observer.
               * @param sessionID Session supplied by the typed executor.
               * @param result Outcome as classified by the typed executor.
               */
              acknowledged(sessionID, result) {
                recordContinuityOutcome(sessionID, result);
                deps.continuity?.acknowledged?.(sessionID, result);
              },
            },
          ))
            editor.add(tool);
          typedRegistration = "registered: beads namespace, code-mode-only";
        }),
      );
    }

    registrations.push(await ctx.session.hook("context", provideRequestContext));

    registrations.push(await ctx.session.hook("compaction", provideCompactionContext));

    if (ctx.tool)
      registrations.push(
        await ctx.tool.hook("execute.after", (event) => {
          // Typed inner calls acknowledge in their executor. The outer code-mode result adds nothing.
          if (
            abort.signal.aborted ||
            event.tool === "execute" ||
            event.tool.startsWith("beads_") ||
            !contextRecipients.has(event.sessionID)
          )
            return;
          // A subagent return can acknowledge a launch before any child report exists.
          if (event.tool === "subagent") {
            controller.invalidate(event.sessionID);
            recoveryCues.set(
              event.sessionID,
              "A subagent call finished; it may only acknowledge launch or follow-up. Reconcile actual reports or results, scope, attempts, validation, durable references and incomplete work before relying on completion or proceeding within the existing authorization.",
            );
          }
        }),
      );

    observation = observeLifecycle();

    return cleanup;
  } catch (error) {
    // Setup failures must not leave earlier registrations alive. Keep the setup error
    // as the primary failure; cleanup reports its own failure independently.
    await cleanup().catch(() => {});
    throw error;
  }

  /**
   * Warn once per distinct workflow diagnostic for the retained host state.
   * @param message Diagnostic text, including the session suffix when applicable.
   */
  function workflowDiagnostic(message: string): void {
    if (abort.signal.aborted || diagnosticTimes.has(message)) return;
    diagnosticTimes.set(message, now());
    try {
      warn(`[opencode-beads] ${message}`);
    } catch {
      /* Diagnostics never break loading. */
    }
  }

  /**
   * Expand snapshots in the transient messages and surface missing instructions or reports once.
   * @param event Native hook payload receiving the expansion and any system notice.
   * @param storedMessages Snapshots available from native history. An empty list checks visible invocations only.
   */
  function expandWorkflowSnapshots(
    event: SessionContext,
    storedMessages: Awaited<ReturnType<HostContext["session"]["context"]>>,
  ): void {
    if (!expandBeadsWorkflowContext(event.messages, storedMessages)) return;
    workflowDiagnostic(`workflow-snapshot-unavailable session=${event.sessionID}`);
    if (!event.system.some((part) => part.text === WORKFLOW_UNAVAILABLE_NOTICE)) {
      event.system.push({ type: "text", text: WORKFLOW_UNAVAILABLE_NOTICE });
    }
  }

  /**
   * Share one generation across overlapping reads in the same session lifecycle.
   * Forgetting the session retires the token, so a later read gets a fresh one.
   * @param sessionID Session whose location and stored context will be read.
   */
  function beginWorkflowSnapshotRead(sessionID: string): symbol {
    const generation = workflowSnapshotReads.get(sessionID) ?? Symbol(sessionID);
    workflowSnapshotReads.set(sessionID, generation);
    return generation;
  }

  /**
   * Reject stale reads after native location lookup and forget sessions that moved.
   * @param event Native hook payload receiving missing-workflow disclosure if needed.
   * @param generation Session token captured before the lookup.
   * @param info Native session record returned by the lookup.
   */
  function canRestoreWorkflowSnapshots(
    event: SessionContext,
    generation: symbol,
    info: Awaited<ReturnType<NonNullable<HostContext["session"]["get"]>>>,
  ): boolean {
    if (abort.signal.aborted) return false;
    if (workflowSnapshotReads.get(event.sessionID) !== generation) {
      expandWorkflowSnapshots(event, []);
      return false;
    }
    if (info.location.directory === directory) return true;
    forgetSession(event.sessionID);
    expandWorkflowSnapshots(event, []);
    return false;
  }

  /**
   * Expand retained native snapshots into matching transient messages by ID.
   * A failed history read falls back to detecting visible invocations with missing guidance.
   * @param event Hook payload receiving expanded messages and any unavailable notice.
   * @param generation Session token captured before checking location.
   * @returns Whether the hook may proceed, including after a history lookup failure.
   * Cancellation or an outdated generation stops further processing.
   */
  async function restoreWorkflowSnapshots(event: SessionContext, generation: symbol): Promise<boolean> {
    try {
      const storedMessages = await ctx.session.context({ sessionID: event.sessionID });
      if (abort.signal.aborted) return false;
      if (workflowSnapshotReads.get(event.sessionID) !== generation) {
        expandWorkflowSnapshots(event, []);
        return false;
      }
      expandWorkflowSnapshots(event, storedMessages);
      return true;
    } catch {
      if (abort.signal.aborted) return false;
      const current = workflowSnapshotReads.get(event.sessionID) === generation;
      expandWorkflowSnapshots(event, []);
      return current;
    }
  }

  /**
   * Restore workflow instructions and publish Beads context for this request.
   * @param event Native hook payload receiving transient context.
   */
  async function provideRequestContext(event: SessionContext): Promise<void> {
    if (abort.signal.aborted) return;
    const snapshotGeneration = beginWorkflowSnapshotRead(event.sessionID);
    if (ctx.session.get) {
      try {
        const info = await ctx.session.get({ sessionID: event.sessionID });
        if (!canRestoreWorkflowSnapshots(event, snapshotGeneration, info)) return;
      } catch {
        if (abort.signal.aborted) return;
        forgetSession(event.sessionID);
        expandWorkflowSnapshots(event, []);
        if (!abort.signal.aborted)
          event.system.push({
            type: "text",
            text: "<beads-notice>Beads context withheld: current session location could not be established. Do not bypass this hold with manual store access.</beads-notice>",
          });
        return;
      }
    } else {
      expandWorkflowSnapshots(event, []);
    }
    if (ctx.session.get && !(await restoreWorkflowSnapshots(event, snapshotGeneration))) return;
    if (abort.signal.aborted) return;
    // The actual request supplies visibility evidence. Registration alone grants no permission.
    const knownTools = event.tools && typeof event.tools === "object";
    const capabilities: RequestCapabilities = knownTools
      ? {
          execute: Object.hasOwn(event.tools, "execute"),
          shell: Object.hasOwn(event.tools, "shell"),
          direct: Object.keys(event.tools).some((name) => DIRECT_BEADS_TOOLS.has(name)),
          typed:
            typedRegistration.startsWith("registered") && Object.hasOwn(event.tools, "execute")
              ? "registered-execute-visible"
              : typedRegistration.startsWith("registered") &&
                  Object.keys(event.tools).some((name) => DIRECT_BEADS_TOOLS.has(name))
                ? "registered-direct-visible"
                : "unavailable",
        }
      : { ...UNKNOWN_CAPABILITIES };
    requestCapabilities.set(event.sessionID, { agent: event.agent, capabilities });
    const counts = countManagedBlocks(
      event.system
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join("\n"),
    );
    const text = await controller.systemFor(event.sessionID, event.agent, capabilities);
    let replaced = 0;
    if (abort.signal.aborted) return;
    if (!text) {
      requestInstructions.set(event.sessionID, {
        at: now(),
        ...counts,
        replaced: 0,
        retained: counts.full + counts.minimal + counts.codex,
      });
      return;
    }
    if (text.startsWith("<beads-context")) {
      const eligible = contextRecipients.get(event.sessionID) ?? new Set<string>();
      eligible.add(event.agent);
      contextRecipients.set(event.sessionID, eligible);
      // Reduce only complete bodies already supplied here; marker ownership alone is insufficient.
      replaced = minimizeSystemParts(event.system, text);
    }
    requestInstructions.set(event.sessionID, {
      at: now(),
      ...counts,
      replaced,
      retained: counts.full + counts.minimal + counts.codex - replaced,
    });
    event.system.push({ type: "text", text });
    const cue = recoveryCues.get(event.sessionID);
    const gap = gapFor(event.sessionID);
    if (cue || gap) {
      const recovery = [
        cue,
        gap && `Known persistence gaps: inspect durable state before another write; do not blindly retry.\n${gap}`,
      ]
        .filter(Boolean)
        .join("\n");
      event.system.push({ type: "text", text: `<beads-recovery>${recovery}</beads-recovery>` });
      // Consume the delivered cue. Persistence gaps remain available for later requests.
      recoveryCues.delete(event.sessionID);
    }
  }

  /**
   * Restore workflow instructions and carry known Beads state into compaction.
   * @param event Native hook payload receiving transient context.
   */
  async function provideCompactionContext(event: SessionContext): Promise<void> {
    if (abort.signal.aborted) return;
    const snapshotGeneration = beginWorkflowSnapshotRead(event.sessionID);
    if (ctx.session.get) {
      try {
        const info = await ctx.session.get({ sessionID: event.sessionID });
        if (!canRestoreWorkflowSnapshots(event, snapshotGeneration, info)) return;
      } catch {
        if (abort.signal.aborted) return;
        forgetSession(event.sessionID);
        expandWorkflowSnapshots(event, []);
        return;
      }
      if (!(await restoreWorkflowSnapshots(event, snapshotGeneration))) return;
    } else {
      expandWorkflowSnapshots(event, []);
    }
    if (abort.signal.aborted) return;
    // Carry prior evidence into the summary request only for agents that received Beads context.
    if (contextRecipients.get(event.sessionID)?.has(event.agent)) {
      event.system.push({ type: "text", text: BEADS_COMPACTION_GUIDANCE });
      const known = references.get(event.sessionID);
      const gap = gapFor(event.sessionID);
      if (known?.size || gap)
        event.system.push({
          type: "text",
          text: `<beads-references>${JSON.stringify({ references: [...(known ?? [])], gap: gap ?? "No final-write guarantee; only earlier acknowledgements are known." })}</beads-references>`,
        });
    }
  }

  /**
   * Fold typed executor outcomes into context freshness and session recovery state.
   * Retain bounded task or memory references for compaction, including references
   * from landed but uncommitted writes. Write gaps persist beyond the next request.
   * @param sessionID Session that invoked the typed operation.
   * @param result Observed executor outcome, including incomplete or uncertain results.
   */
  function recordContinuityOutcome(sessionID: string, result: ContinuityResult): void {
    if (abort.signal.aborted) return;
    const write = ["claim", "note", "update", "close", "create", "remember"].includes(result.operation);
    // Full prime can depend on issue state. 7.1 does not establish safe narrowing.
    if (write && result.status !== "not-claimed") controller.invalidateAll();
    const values = references.get(sessionID) ?? new Set<string>();
    const recordKind = ["remember", "recall", "memories"].includes(result.operation) ? "memory" : "task";
    if (["acknowledged", "found", "landed-uncommitted"].includes(result.status)) {
      if (result.reference) values.add(`${recordKind}:${result.reference}`);
      if (result.operation === "get") for (const id of Object.keys(result.issues ?? {})) values.add(`task:${id}`);
      if (result.operation === "find") for (const row of result.records ?? []) values.add(`task:${row.id}`);
    }
    while (values.size > 32) values.delete(values.values().next().value!);
    if (values.size) references.set(sessionID, values);
    if (["uncertain", "failed", "landed-uncommitted"].includes(result.status) || result.complete === false) {
      const detail = `${result.operation} ${JSON.stringify(result.target)}${result.actor ? ` actor=${result.actor}` : ""}: ${result.status}; ${result.detail ?? (result.complete === false ? "partial result; inspect failed IDs/completeness" : "commit not confirmed")}`;
      if (write) recordGap(sessionID, detail);
      else
        recoveryCues.set(
          sessionID,
          `Inspect current ${recordKind} state before relying on this outcome: ${detail}. Do not retry an uncertain write blindly.`,
        );
    }
  }

  /** Invalidate caches and retain recovery evidence. The awaited hooks own request and summary publication. */
  async function observeLifecycle(): Promise<void> {
    try {
      for await (const event of ctx.event.subscribe({ signal: abort.signal })) {
        if (abort.signal.aborted) break;
        const type = (event as { type?: unknown }).type;
        const sessionID = eventSessionID(event);
        if (!sessionID) continue;
        if (type === "session.deleted" || type === "session.moved" || type === "session.forked") {
          forgetSession(sessionID);
        } else if (
          contextRecipients.has(sessionID) &&
          [
            "session.compaction.started",
            "session.compaction.ended",
            "session.compaction.failed",
            "session.execution.started",
            "session.execution.interrupted",
            "session.execution.failed",
            "session.model.selected",
            "session.agent.selected",
          ].includes(String(type))
        ) {
          controller.invalidate(sessionID);
          recoveryCues.set(
            sessionID,
            "Recovery requires current task state and relevant memory: re-read attempts, decisions, blockers and the next authorized action. Cached absence is not proof of absence; preserve any guard hold.",
          );
          if (
            type === "session.execution.interrupted" ||
            type === "session.execution.failed" ||
            type === "session.compaction.failed"
          ) {
            recordGap(
              sessionID,
              "Execution or compaction stopped; no final checkpoint is guaranteed. Recover from earlier acknowledged records.",
            );
          }
        }
      }
    } catch {
      // The stream ends on cleanup; lost events only delay a cache refresh.
    }
  }

  /**
   * Retain distinct persistence gaps for the session lifecycle, with an overflow
   * marker once the detail budget is exhausted.
   * @param sessionID Session that observed the unresolved outcome.
   * @param detail Operation outcome or lifecycle uncertainty to carry forward.
   */
  function recordGap(sessionID: string, detail: string): void {
    const known = gaps.get(sessionID) ?? new Set<string>();
    if (known.size < 32) known.add(detail);
    else if (!known.has(detail))
      known.add(
        "Additional persistence gaps exceed the retained detail limit; earlier unresolved details remain. Inspect tool outcomes before further writes.",
      );
    gaps.set(sessionID, known);
  }

  /**
   * Read retained gaps without consuming them.
   * @param sessionID Session whose persistence state is being reported.
   * @returns Joined details, or undefined when no gap is recorded.
   */
  function gapFor(sessionID: string): string | undefined {
    return [...(gaps.get(sessionID) ?? [])].join("\n") || undefined;
  }

  /**
   * Discard location-bound session state and invalidate pending snapshot reads.
   * @param sessionID Session whose cached state and observations are no longer reusable.
   */
  function forgetSession(sessionID: string): void {
    controller.forget(sessionID);
    contextRecipients.delete(sessionID);
    references.delete(sessionID);
    recoveryCues.delete(sessionID);
    gaps.delete(sessionID);
    workflowSnapshotReads.delete(sessionID);
    requestCapabilities.delete(sessionID);
    requestInstructions.delete(sessionID);
    for (const key of diagnosticTimes.keys()) {
      if (key.endsWith(`:${sessionID}`)) diagnosticTimes.delete(key);
    }
  }

  /**
   * Abort scoped work and clear session state before invoking owned disposers in
   * reverse registration order. Repeated calls share the same completion promise.
   * @returns A promise that waits for all disposers and the event observer, and
   * rejects with an AggregateError if any fail.
   */
  function cleanup(): Promise<void> {
    if (cleanupPromise) return cleanupPromise;
    abort.abort();
    controller.dispose();
    contextRecipients.clear();
    recoveryCues.clear();
    references.clear();
    gaps.clear();
    workflowSnapshotReads.clear();
    requestCapabilities.clear();
    requestInstructions.clear();
    diagnosticTimes.clear();
    const pending = registrations
      .splice(0)
      .reverse()
      .map((registration) => {
        try {
          return registration.dispose();
        } catch (error) {
          return Promise.reject(error);
        }
      });
    cleanupPromise = Promise.allSettled([...pending, ...(observation ? [observation] : [])]).then((results) => {
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failures.length) {
        try {
          warn("[opencode-beads] cleanup-failed: owned registration disposal failed");
        } catch {
          /* Preserve the actual failure. */
        }
        throw new AggregateError(
          failures.map((result) => result.reason),
          "Beads cleanup failed",
        );
      }
    });
    return cleanupPromise;
  }
}
