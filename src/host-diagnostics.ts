import packageManifest from "../package.json";
import type { ContextController, ContextRuntime } from "./context";
import {
  collectBeadsHealth,
  collectHooks,
  collectPluginHealth,
  collectSyncTarget,
  DIAGNOSTIC_ENV,
  renderHealthReport,
  type DiagnosticsSnapshot,
} from "./diagnostics";
import { checkBeadsStore, createGuardRuntime, type GuardResult } from "./guard";
import type { HostContext, HostDependencies } from "./host";
import { SUPPORTED_OPENCODE_RANGE } from "./host-admission";
import { runBd } from "./prime";

const COMMAND_REGISTRY_LIMIT = 128;
const COMMAND_NAME_LIMIT = 128;
const COMMAND_DESCRIPTION_LIMIT = 512;

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

type RequestObservation = Exclude<DiagnosticsSnapshot["requestCapability"], string | undefined>;

/**
 * Live host-owned evidence. Read each member at its capture point, not when
 * binding the callback: command definitions are still being assembled then.
 */
type HostEvidence = {
  readonly definitions: readonly ObservedCommand[];
  readonly commandRegistration: NonNullable<DiagnosticsSnapshot["commands"]>["registration"];
  readonly skillFailure: string | undefined;
  readonly skillCollision: string;
  readonly typedRegistration: string;
  cachedContext(sessionID: string): {
    status: ReturnType<ContextController["statusFor"]>;
    observation: DiagnosticsSnapshot["contextObservation"];
  };
  forgetSession(sessionID: string): void;
  requestCapability(sessionID: string): RequestObservation | undefined;
  requestInstructions(sessionID: string): Exclude<DiagnosticsSnapshot["requestInstructions"], string>;
  gapFor(sessionID: string): string | undefined;
};

/**
 * Prefer observed direct leaves over the indirect execute surface.
 * @param request The last observed request for this session, if any.
 */
function describeLeafAvailability(request: RequestObservation | undefined): string {
  if (request?.capabilities.direct === true) {
    return "some native direct Beads leaves are visible; each still checks its operation-specific permission";
  }
  if (request?.capabilities.typed === "registered-execute-visible") {
    return "execute is visible; the native catalog and each operation-specific permission determine leaf availability";
  }
  return "unknown until native catalog discovery and per-operation permission checks";
}

type DiagnosticsLocation = {
  directory: string;
  hostVersion: string;
  signal: AbortSignal;
  now: () => number;
  deps: Pick<HostDependencies, "bd" | "runtime" | "continuityQualified">;
  runtime: Pick<ContextRuntime, "guard">;
};

/**
 * Bind a workflow report capture to one host location. Session cache reads follow
 * location confirmation. Registration, request and persistence evidence stays live
 * until report assembly after the native probes.
 * @param ctx Native session and registry interfaces, called with their original receivers.
 * @param location Host identity, cancellation, clock and probe configuration.
 * @param evidence Live host registration and session evidence.
 * @returns The capture callback used for durable diagnostic workflow snapshots.
 */
export function createDiagnosticsCapture(
  ctx: Pick<HostContext, "session" | "command" | "skill">,
  location: DiagnosticsLocation,
  evidence: HostEvidence,
) {
  const { directory, hostVersion, signal, now, deps, runtime } = location;
  const diagnosticBd =
    deps.bd ?? ((dir: string, args: readonly string[]) => runBd(dir, args, { signal, env: DIAGNOSTIC_ENV }));

  /**
   * Capture one report for replay, keeping probe completion and assembly in the same async flow.
   * Forget cached host session state if the session moved or its location or cache lookup fails.
   * @param sessionID Session whose location and request evidence the report describes.
   * @param text Optional diagnostics selector supplied with the invocation.
   */
  return async function captureDiagnostics(sessionID: string, text?: string): Promise<string> {
    const selector = text?.trim().toLowerCase();
    let context = "uncertain";
    let locationKnown = false;
    let contextObservation: DiagnosticsSnapshot["contextObservation"];
    if (ctx.session.get) {
      try {
        const session = await ctx.session.get({
          sessionID: sessionID as Parameters<NonNullable<typeof ctx.session.get>>[0]["sessionID"],
        });
        if (session.location.directory !== directory) {
          evidence.forgetSession(sessionID);
          context = "withheld: session location changed";
        } else {
          // Record the confirmed location before reading cached context.
          locationKnown = true;
          const { status: cachedStatus, observation } = evidence.cachedContext(sessionID);
          contextObservation = observation;
          context =
            cachedStatus === "loading"
              ? "uncertain: context refresh in progress"
              : (cachedStatus ?? "unobserved: no cached context");
        }
      } catch {
        evidence.forgetSession(sessionID);
        context = "uncertain: session lookup failed";
      }
    }
    let guard: GuardResult | { kind: "withheld"; reason: string } = {
      kind: "withheld",
      reason: "session location unconfirmed",
    };
    if (locationKnown && !signal.aborted) {
      try {
        guard = deps.runtime?.guard
          ? await runtime.guard(directory, signal)
          : await checkBeadsStore(directory, createGuardRuntime(diagnosticBd));
      } catch {
        guard = { kind: "probe-failed" };
      }
    }
    let local: NonNullable<DiagnosticsSnapshot["local"]> = "withheld";
    if (guard.kind !== "withheld" && !signal.aborted) {
      // Both file observations share one abort check and run in order.
      local = {
        ...(await collectPluginHealth(directory, guard)),
        ...(await collectBeadsHealth(guard)),
      };
    }

    // Hook listing depends on the confirmed location, not on a successful store probe.
    const hooks =
      locationKnown && !signal.aborted
        ? await collectHooks(directory, diagnosticBd)
        : "withheld: session location unconfirmed";
    const syncTarget =
      guard.kind === "ready" && guard.workspace && !signal.aborted
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
    const observedRequest = evidence.requestCapability(sessionID);
    const snapshot = {
      plugin: { name: packageManifest.name, version: packageManifest.version },
      host: hostVersion,
      admission: SUPPORTED_OPENCODE_RANGE,
      liveQualification: "not measured by diagnostics; see release acceptance evidence",
      commands: {
        registration: evidence.commandRegistration,
        lookup: effectiveCommands ? "available" : "failed",
        truncated: registryTruncated,
        membershipTruncated: registryMembershipTruncated,
        expectedCount: evidence.definitions.length,
        effective: effectiveCommands ?? "unknown: registry lookup failed",
        ...compareCommandRegistry(evidence.definitions, effectiveCommands, registryMembershipTruncated),
        ownership:
          "unavailable: public owner identity is not exposed; matching names/descriptions do not prove ownership; identical-description overrides cannot be detected",
      },
      skill: { failure: evidence.skillFailure, effective: effectiveSkills, collision: evidence.skillCollision },
      typedContinuity:
        deps.continuityQualified === true ? "enabled: qualified registration" : "disabled: registration not requested",
      typedRegistration: evidence.typedRegistration,
      requestCapability: observedRequest ?? "unknown: no actual request observation",
      leafAvailability: describeLeafAvailability(observedRequest),
      local,
      context,
      contextObservation,
      requestInstructions: evidence.requestInstructions(sessionID) ?? "unobserved",
      guard,
      hooks,
      syncTarget,
      historyRequested: selector === "remote" || selector === "details remote",
      persistence: evidence.gapFor(sessionID)?.slice(0, 4096) ?? "uncertain: no final-write guarantee",
    } satisfies DiagnosticsSnapshot;
    return renderHealthReport(snapshot, now(), selector === "details" || selector === "details remote");
  };
}
