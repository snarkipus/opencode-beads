import type { ContextController } from "./context";
import type {
  BeadsHealthObservation,
  PluginHealthObservation,
  SyncTargetObservation,
  collectHooks,
} from "./diagnostics-collection";
import type { BeadsWorkspace, GuardResult } from "./guard";
import type { RequestCapabilities } from "./guidance";
import { isSupportedOpenCodeVersion, SUPPORTED_OPENCODE_RANGE } from "./host-admission";

export {
  collectBeadsHealth,
  collectHooks,
  collectPluginHealth,
  collectSyncTarget,
  DIAGNOSTIC_ENV,
} from "./diagnostics-collection";

// Workspace status and any available CLI version are assessed independently.
type GuardObservation = {
  kind: GuardResult["kind"] | "withheld";
  version?: string;
  installed?: string;
  workspace?: BeadsWorkspace;
  reason?: string;
};

type CommandObservation = {
  name: string;
  description?: string;
};

/** Captured host evidence. Missing fields, partial observations and producer sentinels are retained in details. */
export interface DiagnosticsSnapshot {
  plugin?: { name?: string; version?: string };
  host?: string;
  admission?: string;
  liveQualification?: string;
  commands?: {
    registration?: "pending" | "registered" | "failed";
    lookup?: "available" | "failed";
    truncated?: boolean;
    membershipTruncated?: boolean;
    expectedCount?: number;
    effective?: CommandObservation[] | "unknown: registry lookup failed";
    mismatches?: Array<{ name: string; expectedDescription?: string; effectiveDescription?: string }>;
    // An incomplete membership listing leaves the missing names unmeasured.
    missing?: string[] | false;
    ownership?: string;
  };
  skill?: {
    failure?: string;
    effective?: string[] | "unavailable" | "unavailable: registry lookup failed";
    collision?: string;
  };
  typedContinuity?: string;
  typedRegistration?: string;
  requestCapability?:
    | { agent: string; capabilities: Partial<RequestCapabilities> }
    | "unknown: no actual request observation";
  leafAvailability?: string;
  local?: Partial<PluginHealthObservation & BeadsHealthObservation> | "withheld";
  context?: string;
  contextObservation?: ReturnType<ContextController["observationFor"]>;
  requestInstructions?:
    | { at?: number; full?: number; minimal?: number; codex?: number; replaced?: number; retained?: number }
    | "unobserved";
  guard?: GuardObservation;
  hooks?: Awaited<ReturnType<typeof collectHooks>> | `withheld: ${string}` | `failed: ${string}`;
  syncTarget?: SyncTargetObservation;
  historyRequested?: boolean;
  persistence?: string;
}

type FindingClass =
  | "incompatible"
  | "failed"
  | "action-recommended"
  | "review-needed"
  | "note"
  | "unknown"
  | "not-checked"
  | "ok";
type Finding = {
  id: string;
  module: "plugin" | "beads";
  class: FindingClass;
  producer: string;
  scope: string;
  observedAt: string;
  observation: string;
  meaning: string;
  action?: string;
};

type Row = [check: string, status: 0 | 1 | 2 | null, value: string];

/**
 * Render workspace location status for the report.
 *
 * @param kind - Captured guard outcome, if any.
 */
function workspaceRow(kind: GuardObservation["kind"] | undefined): Row {
  switch (kind) {
    case "ready":
      return ["Workspace", 0, "Located"];
    case "probe-failed":
      return ["Workspace", 2, "Probe failed"];
    case "withheld":
      return ["Workspace", 2, "Withheld"];
    case "uninitialized":
      return ["Workspace", 2, "Not initialized"];
    default:
      return ["Workspace", null, "not observed"];
  }
}

/**
 * Assess optional Git hooks without treating missing hooks alone as unhealthy.
 *
 * @param hooks - Native observations or an unavailable/withheld result.
 * @param observedAt - Timestamp shared by the captured findings.
 */
function assessHooks(
  hooks: DiagnosticsSnapshot["hooks"],
  observedAt: string,
): {
  row: Row;
  findings: Finding[];
  action?: string;
} {
  const findings: Finding[] = [];
  const hookAction =
    "Review hook identity, local customization and the intended default, `--beads` or `--shared` layout before any refresh. `bd hooks install` writes hooks and may change core.hooksPath. Verify with `bd hooks list`.";
  const add = (
    id: string,
    classification: FindingClass,
    observation: string,
    meaning: string,
    action?: string,
    scope = "confirmed session",
  ) =>
    findings.push({
      id,
      module: "beads",
      class: classification,
      producer: "bd hooks list",
      scope,
      observedAt,
      observation,
      meaning,
      ...(action ? { action } : {}),
    });

  if (hooks === undefined || typeof hooks === "string") {
    if (hooks?.startsWith("withheld:")) {
      add(
        "hooks-unavailable",
        "unknown",
        hooks,
        "Native hook collection was not attempted; hook status is unobserved.",
        undefined,
        "session location unconfirmed",
      );
      return { row: ["Git hooks", null, "Withheld"], findings };
    }
    add("hooks-unavailable", "failed", String(hooks), "Hook status is not established.");
    const value = hooks?.startsWith("failed:") ? "observation failed" : "not observed";
    return { row: ["Git hooks", null, value], findings };
  }
  if (!hooks.length) return { row: ["Git hooks", null, "no entries reported"], findings };

  const missing: string[] = [];
  const outdated: string[] = [];
  const unidentified: string[] = [];
  const shims: string[] = [];
  for (const hook of hooks) {
    // Outdated wins over shim; an unversioned shim is not itself unidentified.
    if (!hook.installed) missing.push(hook.name);
    else if (hook.outdated) outdated.push(hook.name);
    else if (hook.shim) shims.push(hook.name);
    else if (!hook.version) unidentified.push(hook.name);
  }
  if (missing.length)
    add(
      "hooks-missing",
      "note",
      `${missing.join(", ")}: missing/unreadable/unresolved`,
      "The optional hook installation was not established by the native listing.",
    );
  if (outdated.length)
    add(
      "hooks-outdated",
      "action-recommended",
      `${outdated.join(", ")}: outdated`,
      "Native status describes hook installation only.",
      hookAction,
    );
  if (unidentified.length)
    add(
      "hooks-identity-unknown",
      "review-needed",
      `${unidentified.join(", ")}: installed without a reported version`,
      "The native listing did not establish the installed hook's identity.",
      hookAction,
    );
  if (shims.length)
    add(
      "hooks-shim",
      "note",
      `${shims.join(", ")}: installed shim`,
      "A shim does not certify current wrapper policy; review native hook refresh guidance after upgrades.",
    );

  const installed = hooks.length - missing.length;
  const shimCount = shims.length;
  let shimLabel = "";
  if (shimCount) {
    shimLabel = shimCount === installed ? " (shims)" : ` (${shimCount} shim${shimCount > 1 ? "s" : ""})`;
  }
  const value = [
    `${installed}/${hooks.length} installed${shimLabel}`,
    missing.length ? `${missing.length} missing/unreadable/unresolved` : "",
    outdated.length ? `${outdated.length} outdated` : "",
    unidentified.length ? `${unidentified.length} unrecognized` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  if (outdated.length || unidentified.length) return { row: ["Git hooks", 1, value], findings, action: hookAction };
  return { row: ["Git hooks", installed ? 0 : null, value], findings };
}

/**
 * Report registered sync target and history status separately; registration does not establish reachability or freshness.
 *
 * @param target - Local native registration evidence, if available.
 * @param locationWithheld - Whether an unconfirmed session location prevented collection.
 * @param historyRequested - Whether the selector requested a comparison that this report cannot perform.
 * @param observedAt - Timestamp shared by the captured findings.
 */
function assessRemote(
  target: SyncTargetObservation | undefined,
  locationWithheld: boolean,
  historyRequested: boolean,
  observedAt: string,
): { rows: Row[]; findings: Finding[]; summary?: string } {
  const localOnly = target?.state === "local-only";
  const targetAssessed = target?.state === "resolved" || localOnly;
  const missingTarget = locationWithheld ? "session location unconfirmed" : "native listing not performed";
  let targetValue: string;
  if (target?.state === "resolved") targetValue = `Resolved · ${target.name}`;
  else if (localOnly) targetValue = "Local-only";
  else targetValue = `Unknown · ${target?.state === "unknown" ? target.reason : missingTarget}`;

  let targetProducer = "local diagnostic scope";
  let targetMeaning =
    "The target check observes native registration of origin. Reachability and synchronization remain unmeasured.";
  if (target?.state === "unknown" && target.listingSkipped) {
    targetProducer = "bd context --json";
    targetMeaning =
      "The strict-readonly remote listing was skipped because native context could not establish a supported direct Dolt workspace.";
  } else {
    if (target) targetProducer = "bd --readonly dolt remote list --json --sandbox and bd context --json";
    if (localOnly)
      targetMeaning =
        "This embedded store has no registered native remotes. Native push may offer Git-origin adoption with consent.";
  }

  const historyValue = localOnly ? "Not applicable" : "Not checked";
  const historyUnavailable = "No qualified Beads history probe is available";
  let historyReason = "The invocation did not request a remote history comparison.";
  if (localOnly) historyReason = "This embedded store has no registered native remotes.";
  else if (historyRequested) historyReason = `${historyUnavailable}.`;

  return {
    rows: [
      ["Sync target", targetAssessed ? 0 : null, targetValue],
      [
        "Remote history",
        null,
        historyRequested && !localOnly ? `${historyValue} · ${historyUnavailable}` : historyValue,
      ],
    ],
    findings: [
      {
        id: "sync-target",
        module: "beads",
        class: targetAssessed ? "ok" : "unknown",
        producer: targetProducer,
        scope: "confirmed session",
        observedAt,
        observation: targetValue,
        meaning: targetMeaning,
      },
      {
        id: "remote-history",
        module: "beads",
        class: "not-checked",
        producer: "diagnostics invocation",
        scope: "confirmed session",
        observedAt,
        observation: historyValue,
        meaning: `Comparison was not attempted. ${historyReason} Source-Git freshness was not checked.`,
      },
    ],
    summary: localOnly ? undefined : "Remote history not checked.",
  };
}

/**
 * Assess cached context without confusing load readiness with CLI guard readiness.
 *
 * @param state - Cached load state, which may include a reason.
 * @param cachedVersion - Version that produced the cached context, if known.
 * @param guard - Current workspace and CLI observation, if available.
 * @param observedAt - Timestamp for the version finding.
 */
function assessContext(
  state: DiagnosticsSnapshot["context"],
  cachedVersion: string | undefined,
  guard: DiagnosticsSnapshot["guard"],
  observedAt: string,
): { row: Row; finding?: Finding; action?: string } {
  const currentVersion = guard?.version;
  const differs = !!cachedVersion && !!currentVersion && cachedVersion !== currentVersion;
  let finding: Finding | undefined;
  // Only the detailed finding requires a ready guard; the ready Context row can use any observed CLI version.
  if (guard?.kind === "ready" && differs) {
    finding = {
      id: "context-version-differs",
      module: "plugin",
      class: "review-needed",
      producer: "context cache",
      scope: "confirmed session",
      observedAt,
      observation: `Context loaded with preceding CLI ${cachedVersion}; current observation ${currentVersion}`,
      meaning: "These observations are not atomic; age alone does not prove staleness.",
      action:
        "Use the next session or configured idle refresh; normal full prime can access the store. Verify the observed context version in diagnostics afterward.",
    };
  }
  const context = state ?? "";
  switch (context) {
    case "ready":
      if (differs) {
        return {
          row: ["Context", 1, `Loaded under bd ${cachedVersion}`],
          finding,
          action: "Refresh context in the next session or configured idle refresh. Check: diagnostics Context row.",
        };
      }
      return { row: ["Context", 0, "Loaded"], finding };
    case "failed":
      return { row: ["Context", 2, "Failed"], finding };
    case "loading":
      return { row: ["Context", null, "Loading"], finding };
    case "empty":
      return { row: ["Context", null, "Empty"], finding };
  }
  // Non-exact states carry a reason. Match failure before progress or absence.
  if (context.startsWith("withheld")) return { row: ["Context", 2, "Withheld"], finding };
  if (context.includes("lookup failed")) return { row: ["Context", 2, "Session lookup failed"], finding };
  if (context.includes("progress")) return { row: ["Context", null, "Loading"], finding };
  if (context.startsWith("unobserved:")) return { row: ["Context", null, "Not yet loaded"], finding };
  return { row: ["Context", null, "not observed"], finding };
}

/**
 * Compare recorded and running versions as advisory evidence, not as proof of schema or migration state.
 *
 * @param witness - Recorded-version observation; absence differs from an observed missing file.
 * @param observedAt - Timestamp for the version finding.
 */
function assessWitness(
  witness: BeadsHealthObservation["witness"] | undefined,
  observedAt: string,
): { row: Row; finding?: Finding } {
  const check = "Recorded bd version";
  if (!witness) return { row: [check, null, "not observed"] };

  const describe = (
    id: string,
    classification: FindingClass,
    observation: string,
    meaning: string,
    action?: string,
  ): Finding => ({
    id,
    module: "beads",
    class: classification,
    producer: ".local_version",
    scope: "confirmed session",
    observedAt,
    observation,
    meaning,
    ...(action ? { action } : {}),
  });
  switch (witness.state) {
    case "differ":
      return {
        row: [check, 1, `${witness.recorded} ≠ CLI ${witness.running}`],
        finding: describe(
          "witness-differs",
          "review-needed",
          `Recorded ${witness.recorded} differs from running ${witness.running}`,
          "This is not evidence of schema, reconciliation, hook freshness or maintenance completion.",
          "Read-only review: consult https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/docs/getting-started/upgrading.md and compare the recorded and running values again; no migration is inferred.",
        ),
      };
    case "match":
      return {
        row: [check, 0, `${witness.recorded} = CLI`],
        finding: describe(
          "witness-matches",
          "ok",
          `Recorded ${witness.recorded} matches running ${witness.running}`,
          "A match does not establish schema or maintenance completion.",
        ),
      };
    default:
      return {
        row: [check, null, witness.state === "missing" ? "none" : (witness.state ?? "not observed")],
        finding: describe(
          "witness-unknown",
          "unknown",
          `Witness ${witness.state ?? "unknown"}`,
          "This is not a new-store or maintenance diagnosis.",
        ),
      };
  }
}

function worstStatus(rows: Row[]): Row[1] {
  let worst: Row[1] = null;
  for (const [, status] of rows) {
    if (status !== null && (worst === null || status > worst)) worst = status;
  }
  return worst;
}

/**
 * Assess command registration and membership together so incomplete evidence cannot suggest an override remedy.
 *
 * @param commands - Captured registry evidence; membership completeness can differ from description completeness.
 */
function assessCommands(commands: DiagnosticsSnapshot["commands"]): { row: Row; action?: string } {
  if (commands?.registration === "failed") return { row: ["Commands", 2, "registration failed"] };
  if (commands?.lookup !== "available") return { row: ["Commands", null, "not observed"] };

  const overrides = commands.mismatches?.length ?? 0;
  // Fall back to overall truncation only when membership completeness was not observed.
  if (commands.membershipTruncated || (commands.membershipTruncated !== false && commands.truncated)) {
    return { row: ["Commands", null, `list incomplete${overrides ? ` · ${overrides} changed` : ""}`] };
  }

  const missing = commands.missing === false ? undefined : commands.missing?.length;
  if (missing === undefined) return { row: ["Commands", null, "membership not observed"] };

  const count = commands.expectedCount;
  if (!missing && !overrides) {
    const value = count === undefined ? "expected names present" : `${count}/${count} present`;
    return { row: ["Commands", 0, value] };
  }

  const value = [
    count === undefined ? (missing ? "" : "expected names present") : `${count - missing}/${count}`,
    missing ? `${missing} missing` : "",
    overrides ? `${overrides} changed` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return { row: ["Commands", 1, value], action: "Review command customization and rerun diagnostics." };
}

/**
 * Assess the skill registry without treating shared-file presence as evidence of registration or use.
 *
 * @param skill - Captured registry observation, which may contain partial evidence even on failure.
 * @param sharedSkill - Independent observation of the shared skill file.
 * @param observedAt - Timestamp for registry findings.
 */
function assessSkill(
  skill: DiagnosticsSnapshot["skill"],
  sharedSkill: string | undefined,
  observedAt: string,
): { row: Row; findings: Finding[] } {
  const shared = sharedSkill === "missing" ? "absent" : (sharedSkill ?? "not observed");
  const effective = Array.isArray(skill?.effective) ? skill.effective : undefined;
  const collision = skill?.collision?.startsWith("skill-collision") ? skill.collision : undefined;
  const findings: Finding[] = [];
  if (effective?.includes("beads"))
    findings.push({
      id: "shared-skill-effective",
      module: "plugin",
      class: "note",
      producer: "effective skill registry",
      scope: "confirmed session",
      observedAt,
      observation: "A Beads skill is registered alongside oc-beads",
      meaning: "Registration does not establish use or freshness.",
    });
  if (collision)
    findings.push({
      id: "skill-collision",
      module: "plugin",
      class: "review-needed",
      producer: "skill rebuild",
      scope: "confirmed session",
      observedAt,
      observation: collision,
      meaning: "Native customization precedence is preserved.",
    });

  if (skill?.failure) return { row: ["Skill", 2, "unavailable"], findings };
  if (collision) return { row: ["Skill", 1, `oc-beads overridden · shared: ${shared}`], findings };
  if (!effective) return { row: ["Skill", null, `registry not observed · shared: ${shared}`], findings };

  const active = effective.includes("oc-beads");
  return {
    row: [
      "Skill",
      active ? (shared === "unreadable" ? null : 0) : 1,
      `oc-beads ${active ? "active" : "absent"} · shared: ${shared}`,
    ],
    findings,
  };
}

/**
 * Interpret captured evidence without I/O or Markdown; preserve the order of rows, findings, and actions.
 *
 * @param snapshot - Captured observations, including absent or partial evidence.
 * @param time - ISO timestamp shared by findings unless their evidence carries its own time.
 */
function interpretHealthReport(snapshot: DiagnosticsSnapshot, time: string) {
  const findings: Finding[] = [];
  const add = (
    id: string,
    module: Finding["module"],
    classification: FindingClass,
    producer: string,
    observation: string,
    meaning: string,
    action?: string,
    scope = "confirmed session",
    observedAt = time,
  ) =>
    findings.push({
      id,
      module,
      class: classification,
      producer,
      scope,
      observedAt,
      observation,
      meaning,
      ...(action ? { action } : {}),
    });
  const { guard, skill, plugin: identity, commands } = snapshot;
  if (guard?.kind === "unsupported")
    add(
      "cli-unsupported",
      "beads",
      "incompatible",
      "bd version",
      `CLI ${guard.installed ?? "unknown"} is below the supported minimum`,
      "Context admission remains unchanged.",
      "Upgrade bd in an authorized workflow; verify the version and context.",
    );
  else if (guard?.kind !== "ready")
    add(
      "workspace-unknown",
      "beads",
      guard?.kind === "probe-failed" ? "failed" : "unknown",
      "bd version/context",
      `Workspace observation: ${guard?.kind ?? "unknown"}`,
      "This does not establish store health.",
    );
  const hooks = assessHooks(snapshot.hooks, time);
  findings.push(...hooks.findings);
  const local = snapshot.local === "withheld" ? undefined : snapshot.local;
  const fileScope = `root-file observation: ${local?.scope ?? "confirmed session directory"}`;
  if (local?.managedInstructions?.state === "unreadable" || local?.managedInstructions?.state === "truncated") {
    add(
      "root-guidance-incomplete",
      "plugin",
      "failed",
      "root AGENTS.md",
      `Root instruction file ${local.managedInstructions.state}`,
      "The bounded 64 KiB root-file observation is incomplete; last-request instruction counts have a separate scope and do not establish root-file contents.",
      undefined,
      fileScope,
    );
  }
  if (local?.sharedSkill === "missing") {
    add(
      "shared-skill-missing",
      "plugin",
      "note",
      "shared Beads skill",
      "Shared Beads skill file missing",
      "This is informational for other harnesses and not a plugin failure; registry presence and use are separate observations.",
      undefined,
      fileScope,
    );
  } else if (local?.sharedSkill === "unreadable") {
    add(
      "shared-skill-unreadable",
      "plugin",
      "failed",
      "shared Beads skill",
      "Shared Beads skill file unreadable",
      "Readability is unavailable, not proof of absence or plugin failure; registry presence and use are separate observations.",
      undefined,
      fileScope,
    );
  }
  const witness = assessWitness(local?.witness, time);
  // Preserve the captured report's evidence order: mismatch precedes duplicate guidance; other witness findings follow it.
  if (witness.finding?.id === "witness-differs") findings.push(witness.finding);
  if ((local?.managedInstructions?.full ?? 0) > 1)
    add(
      "duplicate-full",
      "plugin",
      "review-needed",
      "root AGENTS.md",
      "Multiple full managed blocks are present",
      "Retained text may be customization or additional guidance, not proof of conflict.",
      "Review local customization before removing redundant guidance, which edits instructions; verify the resulting project and request counts.",
      fileScope,
    );
  if (witness.finding && witness.finding.id !== "witness-differs") findings.push(witness.finding);
  const request = snapshot.requestInstructions === "unobserved" ? undefined : snapshot.requestInstructions;
  if ((request?.full ?? 0) > 1)
    add(
      "request-full-duplicates",
      "plugin",
      "review-needed",
      "last request instructions",
      "Multiple full managed blocks were observed",
      "Retained blocks can contain useful customization or additional guidance.",
      "Review local customization before removing redundant guidance, which edits instructions; verify the resulting project and request counts.",
      "last observed request",
      typeof request?.at === "number" ? new Date(request.at).toISOString() : "unavailable",
    );
  const skillAssessment = assessSkill(skill, local?.sharedSkill, time);
  findings.push(...skillAssessment.findings);
  const remote = assessRemote(
    snapshot.syncTarget,
    guard?.kind === "withheld",
    snapshot.historyRequested === true,
    time,
  );
  findings.push(...remote.findings);
  const context = assessContext(snapshot.context, snapshot.contextObservation?.version, guard, time);
  if (context.finding) findings.push(context.finding);
  const pluginRows: Row[] = [];
  const beadsRows: Row[] = [];
  const actions: string[] = [];
  const comments: string[] = [];
  const host = snapshot.host !== "unknown" ? snapshot.host : undefined;
  const hostSupported = host !== undefined && isSupportedOpenCodeVersion(host);
  pluginRows.push([
    "Host",
    host === undefined ? null : hostSupported ? 0 : 2,
    host ? `OpenCode ${host}${hostSupported ? "" : " unsupported"}` : "not observed",
  ]);
  const commandAssessment = assessCommands(commands);
  pluginRows.push(commandAssessment.row);
  if (commandAssessment.action) actions.push(commandAssessment.action);
  pluginRows.push(skillAssessment.row);
  const typed = snapshot.typedRegistration ?? "";
  if (typed.startsWith("registered")) pluginRows.push(["Typed tools", 0, "Registered"]);
  else if (snapshot.typedContinuity?.startsWith("enabled"))
    pluginRows.push(["Typed tools", 2, "Requested, not registered"]);
  else pluginRows.push(["Typed tools", null, typed.startsWith("disabled") ? "Not requested" : "not observed"]);
  pluginRows.push(context.row);
  if (context.action) actions.push(context.action);
  const root = local?.managedInstructions;
  if (root?.state === "available") {
    const configured = (root.full ?? 0) + (root.minimal ?? 0) + (root.codex ?? 0) > 0;
    pluginRows.push([
      "AGENTS Configured",
      (root.full ?? 0) > 1 ? 1 : configured ? 0 : null,
      (root.full ?? 0) > 1 ? "duplicate bd blocks" : configured ? "bd block" : "no bd block",
    ]);
  } else
    pluginRows.push([
      "AGENTS Configured",
      null,
      root?.state === "missing" ? "no AGENTS.md" : (root?.state ?? "not observed"),
    ]);
  if ((root?.full ?? 0) > 1)
    actions.push(
      "Review duplicate full instruction blocks before editing local guidance. Check: root-file counts in diagnostics details.",
    );
  const gap = snapshot.persistence !== "uncertain: no final-write guarantee" ? snapshot.persistence : undefined;
  if (gap) pluginRows.push(["Write outcomes", 1, gap.length > 180 ? `${gap.slice(0, 177)}...` : gap]);
  if (guard?.kind === "ready") beadsRows.push(["bd CLI", guard.version ? 0 : null, guard.version ?? "not observed"]);
  else if (guard?.kind === "unsupported" || guard?.kind === "unavailable") {
    beadsRows.push(["bd CLI", 2, guard.installed ? `${guard.installed} (needs ≥1.3.1)` : "not found"]);
    comments.push("bd CLI unavailable or below the supported minimum.");
    actions.push("Install or upgrade bd to ≥1.3.1, then start a new session. Check: `bd version`.");
  } else beadsRows.push(["bd CLI", null, "not observed"]);
  beadsRows.push(workspaceRow(guard?.kind));
  beadsRows.push(witness.row);
  beadsRows.push(hooks.row);
  if (hooks.action) {
    comments.push("Git hooks need attention.");
    actions.push(hooks.action);
  }
  beadsRows.push(...remote.rows);
  const summary = [comments[0], remote.summary].filter(Boolean).join(" ");
  return {
    findings,
    pluginRows,
    beadsRows,
    actions,
    summary,
    identity,
    repoRoot: guard?.workspace?.repoRoot,
    overallStatus: worstStatus([...pluginRows, ...beadsRows]),
    pluginStatus: worstStatus(pluginRows),
    beadsStatus: worstStatus(beadsRows),
  };
}

const REPORT_STATUS = {
  0: { marker: "✅", label: "Healthy" },
  1: { marker: "⚠️", label: "Mismatch" },
  2: { marker: "❌", label: "Unhealthy" },
} as const;

function formatHeadingStatus(status: Row[1]): string {
  if (status === null) return "— No checks assessed";
  const { marker, label } = REPORT_STATUS[status];
  return `${marker} ${label}`;
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

function formatInlineCode(value: string): string {
  const escaped = escapeTableCell(value).replace(/`/g, "\\`");
  return `\`${escaped}\``;
}

function renderCheckTable(rows: Row[]): string {
  const lines = ["| Check | Status | Value |", "|---|---|---|"];
  for (const [check, status, value] of rows) {
    const marker = status === null ? "—" : REPORT_STATUS[status].marker;
    lines.push(`| ${check} | ${marker} | ${escapeTableCell(value)} |`);
  }
  return lines.join("\n");
}

/**
 * Render captured observations without collecting new evidence or guaranteeing verbatim model relay.
 *
 * @param snapshot - Captured observations that drive the report and are included in the details view.
 * @param capturedAt - Capture time in milliseconds since the Unix epoch.
 * @param details - Whether to include the underlying observations and findings.
 */
export function renderHealthReport(snapshot: DiagnosticsSnapshot, capturedAt: number, details = false): string {
  const time = new Date(capturedAt).toISOString();
  const {
    findings,
    pluginRows,
    beadsRows,
    actions,
    summary,
    identity,
    repoRoot,
    overallStatus,
    pluginStatus,
    beadsStatus,
  } = interpretHealthReport(snapshot, time);
  const output = [
    `## Beads diagnostics — ${formatHeadingStatus(overallStatus)}`,
    "",
    `DATE: ${formatInlineCode(time)}`,
    "",
    `VERSION: ${escapeTableCell(identity?.name ?? "plugin not observed")} ${formatInlineCode(identity?.version ?? "version not observed")}`,
    "",
    `PATH: ${formatInlineCode(repoRoot ?? "not observed")}`,
    ...(summary ? ["", summary] : []),
    "",
    `**Plugin** ${formatHeadingStatus(pluginStatus)}`,
    "",
    renderCheckTable(pluginRows),
    "",
    `**Beads** ${formatHeadingStatus(beadsStatus)}`,
    "",
    renderCheckTable(beadsRows),
    ...(actions.length ? ["", "**Actions**", "", ...actions.map((action) => `- ${action}`)] : []),
  ];
  if (details)
    output.push(
      "",
      "**Evidence**",
      "SQL health, historical maintenance completion and complete memory delivery remain unmeasured. Model relay is not guaranteed verbatim.",
      `Details: ${JSON.stringify({ ...snapshot, capturedAt: time, findings })}`,
    );
  return output.join("\n");
}

/** Self-contained reference: help bypasses the diagnostic callback, not the later prompt lifecycle. */
export const DIAGNOSTICS_HELP = `## Beads diagnostics help

Use /oc-beads:diagnostics for current observations, /oc-beads:diagnostics details for bounded evidence, or /oc-beads:diagnostics help for this reference.
Use /oc-beads:diagnostics remote or /oc-beads:diagnostics details remote to request a history comparison, with bounded evidence in details remote. Beads 1.3.1 and 1.3.4 have no qualified history probe, so both views use the same local collection. Selectors are exact after trimming and case folding. Other free text selects normal output. Each view is captured once and replayed unchanged.

✅ Healthy: an assessed check matches. ⚠️ Mismatch: an observed setup difference. ❌ Unhealthy: known incompatibility or integration failure. —: unobserved or unassessed. Neutral rows stay visible and do not affect severity or add heading counts. The worst assessed check sets each heading.

| Check | Source, values and useful response |
|---|---|
| Host | Observed OpenCode version; admitted versions (${SUPPORTED_OPENCODE_RANGE}) are healthy, unsupported is unhealthy, unknown is neutral. Check the operator's OpenCode version; upgrades are operator-owned. |
| Commands | Effective command registry vs package definitions: present/expected when membership is complete, missing or changed is mismatch, registration failed is unhealthy, list incomplete or lookup unavailable is neutral. Review overrides, then rerun diagnostics. Matching descriptions do not prove ownership; clipping at our 512-character evidence cap is details-only. |
| Skill | Packaged oc-beads and effective skill registry plus scoped shared Beads skill readability: active, absent, overridden or unavailable. Packaged load failure is unhealthy, absent/overridden is mismatch; missing shared skill alone is informational. Review configured skill overrides, then rerun diagnostics. |
| Typed tools | Registration state: Registered, Requested, not registered (unhealthy), Not requested (neutral) or not observed. Registration does not grant operation permissions. Check diagnostics details and actual tool discovery. |
| Context | Cached load state/version: Loaded, Loaded under a differing bd version (mismatch), Not yet loaded, Loading, Empty, Withheld, Failed or Session lookup failed. Withheld/failure is unhealthy; missing evidence is neutral. For version differences use the next session or configured idle refresh, then check Context; normal full prime may open a store. |
| AGENTS Configured | Bounded root AGENTS.md (or confirmed session directory) recognized full/minimal/Codex bd markers: bd block, duplicate bd blocks (repeated full blocks, mismatch), no bd block, no AGENTS.md, unreadable or truncated (neutral). Markers do not establish complete guidance or runtime harness availability. Review customization before edits; check root and last-request scope/counts/times in details. |
| Write outcomes | Existing unresolved write evidence only (mismatch). Inspect actual operation/readback before any retry; this row is absent without a recorded gap. |
| bd CLI | Native version observation: supported version, below minimum 1.3.1 or not found. Install/upgrade only in an authorized workflow; check bd version and a new session. |
| Workspace | Config-only native context: Located, Not initialized, Probe failed, Withheld or not observed. Located identifies a directory, not database integrity. Review location/context evidence; onboarding is human-directed, never automatic repair. |
| Recorded bd version | Bounded .local_version under resolved beads_dir: equals CLI, differs from CLI (mismatch), none, unreadable, unsupported, truncated or unavailable (neutral). Compare bd version and the recorded value; review native upgrade guidance for a difference. This is no schema or maintenance diagnosis. |
| Git hooks | Native bd hooks list reports installation counts including shims. Missing/unreadable/unresolved optional hooks and empty/failed/withheld observations are neutral. Outdated and unrecognized installations are mismatches. Review hook identity, layout and customization before bd hooks install, which writes hooks and may change core.hooksPath. Verify with bd hooks list. This row covers installation only. |
| Sync target | Native bd context --json and strict-readonly bd remote listing. Resolved means native origin is registered. Local-only means the native list is empty in a confirmed embedded store. Missing, failed or ambiguous evidence leaves the target Unknown. Review the evidence in details. Reachability remains unmeasured. |
| Remote history | Not applicable for Local-only, otherwise Not checked. Both states are neutral. Exact remote selectors explain the unavailable history probe. Source-Git freshness remains unmeasured. |

Below the title and before the summary, DATE is the exact capture timestamp, VERSION the executing package name/version, and PATH the observed native repository root (cwd_repo_root), each in a separate paragraph. Missing root is explicitly not observed; no root is inferred from beads_dir or session cwd. The Beads directory remains in details. Details retains raw command inventory/clipping, hook entries, root marker counts, last-request counts/times, context provenance and finding explanations.

Help skips diagnostic collection. All collected views use version, config-only context, qualified hook listing, bd --readonly dolt remote list --json --sandbox in supported workspaces, cached integration observations and bounded local files. Native listing may open the store, take locks and leave incidental files or timestamp changes. Strict readonly skips native auto-start and maintenance. Server mode may use its configured database connection. No selector contacts the sync remote or fetches history.
The later ordinary prompt lifecycle can still load full native prime and memories and open or migrate a store. SQL/schema health, maintenance history, complete memory delivery and unique build identity remain unmeasured. Model relay of the saved Markdown is not guaranteed verbatim.

Full reference: https://github.com/snarkipus/opencode-beads/blob/main/docs/diagnostics.md`;
