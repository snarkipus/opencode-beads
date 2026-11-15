import { open } from "node:fs/promises";
import path from "node:path";
import { countManagedBlocks } from "./instructions";
import type { GuardResult, GuardRuntime } from "./guard";

/** Scoped only to diagnostic subprocesses; ordinary Beads operations retain their environment. */
export const DIAGNOSTIC_ENV = {
  BD_DISABLE_METRICS: "1",
  BD_DISABLE_EVENT_FLUSH: "1",
  OTEL_SDK_DISABLED: "true",
};

/** Read native hook status without substituting a store-opening probe. */
export async function collectHooks(directory: string, bd: GuardRuntime["bd"]): Promise<unknown> {
  try {
    const result: unknown = JSON.parse(await bd(directory, ["hooks", "list", "--json"]));
    if (typeof result !== "object" || result === null || !Array.isArray(Reflect.get(result, "hooks"))) throw new Error("unsupported hooks response");
    const hooks: unknown[] = Reflect.get(result, "hooks");
    if (hooks.length > 32) throw new Error("unsupported hooks response");
    const valid = hooks.every((hook) => {
      if (typeof hook !== "object" || hook === null) return false;
      const name = Reflect.get(hook, "Name");
      const version = Reflect.get(hook, "Version");
      return typeof name === "string" && name.length <= 128
        && typeof version === "string" && version.length <= 128
        && ["Installed", "IsShim", "Outdated"].every((key) => typeof Reflect.get(hook, key) === "boolean");
    });
    if (!valid) throw new Error("unsupported hooks response");
    return hooks.map((hook) => ({ name: Reflect.get(hook as object, "Name"), installed: Reflect.get(hook as object, "Installed"), version: Reflect.get(hook as object, "Version"), shim: Reflect.get(hook as object, "IsShim"), outdated: Reflect.get(hook as object, "Outdated") }));
  } catch {
    return "failed: bd hooks list observation unavailable or unsupported";
  }
}


/** Read only a bounded portion and distinguish missing, unreadable and truncated observations. */
async function boundedFile(file: string, limit: number): Promise<{ state: string; text?: string }> {
  try {
    const handle = await open(file, "r");
    try {
      const buffer = Buffer.alloc(limit + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      return bytesRead > limit ? { state: "truncated" } : { state: "available", text: buffer.subarray(0, bytesRead).toString("utf8") };
    } finally { await handle.close(); }
  } catch (error) {
    return { state: (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "unreadable" };
  }
}

/** Inspect bounded project guidance independently of the native CLI report. */
export async function collectPluginHealth(directory: string, guard: GuardResult): Promise<object> {
  const workspace = guard.kind === "ready" ? guard.workspace : undefined;
  const root = workspace?.repoRoot ?? directory;
  const [instructions, skill] = await Promise.all([
    boundedFile(path.join(root, "AGENTS.md"), 65_536),
    boundedFile(path.join(root, ".agents", "skills", "beads", "SKILL.md"), 1),
  ]);
  return {
    scope: workspace?.repoRoot ? "context cwd_repo_root" : "confirmed session directory",
    managedInstructions: instructions.state === "available" ? { state: "available", ...countManagedBlocks(instructions.text ?? "") } : { state: instructions.state },
    sharedSkill: skill.state === "truncated" || skill.state === "available" ? "readable" : skill.state,
  };
}

/** Inspect the advisory witness under the native-resolved Beads directory. */
export async function collectBeadsHealth(guard: GuardResult): Promise<object> {
  const workspace = guard.kind === "ready" ? guard.workspace : undefined;
  const witness = workspace ? await boundedFile(path.join(workspace.path, ".local_version"), 256) : { state: "unavailable", text: undefined };
  const recorded = witness.text?.trim();
  const supported = recorded && /^\d+\.\d+\.\d+$/.test(recorded);
  let witnessObservation: object;
  if (!recorded) witnessObservation = { state: witness.state === "available" ? "unsupported" : witness.state };
  else if (!supported) witnessObservation = { state: "unsupported" };
  else {
    const running = guard.kind === "ready" ? guard.version : undefined;
    const state = running ? (recorded === running ? "match" : "differ") : "running version unavailable";
    witnessObservation = { state, recorded, running };
  }
  return {
    witness: witnessObservation,
    remote: workspace?.remote === undefined ? "not reported" : workspace.remote ? "configured" : "not configured",
    limitations: "Witnesses do not establish schema, reconciliation, hook freshness or maintenance completion; remote freshness is not checked.",
  };
}

type FindingClass = "incompatible" | "failed" | "action-recommended" | "review-needed" | "note" | "unknown" | "not-checked" | "ok";
type Finding = { id: string; module: "plugin" | "beads"; class: FindingClass; producer: string; scope: string; observedAt: string; observation: string; meaning: string; action?: string };

/** Render a fixed observation deterministically; the host still relays it through a model. */
export function renderHealthReport(snapshot: Record<string, unknown>, capturedAt: number, details = false): string {
  const time = new Date(capturedAt).toISOString();
  const findings: Finding[] = [];
  const add = (id: string, module: Finding["module"], classification: FindingClass, producer: string, observation: string, meaning: string, action?: string, scope = "confirmed session", observedAt = time) => findings.push({ id, module, class: classification, producer, scope, observedAt, observation, meaning, ...(action ? { action } : {}) });
  const guard = snapshot.guard as { kind?: string; installed?: string } | undefined;
  if (guard?.kind === "unsupported") add("cli-unsupported", "beads", "incompatible", "bd version", `CLI ${guard.installed ?? "unknown"} is below the supported minimum`, "Context admission remains unchanged.", "Upgrade bd in an authorized workflow; verify the version and context.");
  else if (guard?.kind !== "ready") add("workspace-unknown", "beads", guard?.kind === "probe-failed" ? "failed" : "unknown", "bd version/context", `Workspace observation: ${guard?.kind ?? "unknown"}`, "This does not establish store health.");
  const hooks = snapshot.hooks;
  if (Array.isArray(hooks)) {
    const missing: string[] = [];
    const outdated: string[] = [];
    const unknownIdentity: string[] = [];
    const shims: string[] = [];
    for (const hook of hooks as Array<{ name: string; installed: boolean; version: string; shim: boolean; outdated: boolean }>) {
      if (!hook.installed) missing.push(hook.name);
      else if (hook.outdated) outdated.push(hook.name);
      else if (!hook.version) unknownIdentity.push(hook.name);
      else if (hook.shim) shims.push(hook.name);
    }
    const hookAction = "Review intended default, `--beads` or `--shared` layout and local customization before `bd hooks install`; installation writes hooks and may change core.hooksPath. Verify with `bd hooks list`.";
    const hookLimit = "Native status can also reflect an unresolved hook directory; installed files need not be Beads hooks.";
    if (missing.length) add("hooks-missing", "beads", "action-recommended", "bd hooks list", `${missing.join(", ")}: missing or unreadable`, hookLimit, hookAction);
    if (outdated.length) add("hooks-outdated", "beads", "action-recommended", "bd hooks list", `${outdated.join(", ")}: outdated`, hookLimit, hookAction);
    if (unknownIdentity.length) add("hooks-identity-unknown", "beads", "note", "bd hooks list", `${unknownIdentity.join(", ")}: installed without a reported version`, "Installed may be a non-Beads hook; identity is not established.");
    if (shims.length) add("hooks-shim", "beads", "note", "bd hooks list", `${shims.join(", ")}: installed shim`, "A shim does not certify current wrapper policy; review native hook refresh guidance after upgrades.");
  } else if (typeof hooks === "string" && hooks.startsWith("withheld:")) {
    add("hooks-unavailable", "beads", "unknown", "bd hooks list", hooks, "Native hook collection was not attempted; hook status is unobserved.", undefined, "session location unconfirmed");
  } else add("hooks-unavailable", "beads", "failed", "bd hooks list", String(hooks), "Hook status is not established.");
  const local = snapshot.local as { witness?: { state?: string; recorded?: string; running?: string }; managedInstructions?: { full?: number; state?: string }; sharedSkill?: string; scope?: string } | undefined;
  const fileScope = `root-file observation: ${local?.scope ?? "confirmed session directory"}`;
  if (local?.managedInstructions?.state === "unreadable" || local?.managedInstructions?.state === "truncated") {
    add("root-guidance-incomplete", "plugin", "failed", "root AGENTS.md", `Root instruction file ${local.managedInstructions.state}`, "The bounded 64 KiB root-file observation is incomplete; last-request instruction counts have a separate scope and do not establish root-file contents.", undefined, fileScope);
  }
  if (local?.sharedSkill === "missing") {
    add("shared-skill-missing", "plugin", "note", "shared Beads skill", "Shared Beads skill file missing", "This is informational for other harnesses and not a plugin failure; registry presence and use are separate observations.", undefined, fileScope);
  } else if (local?.sharedSkill === "unreadable") {
    add("shared-skill-unreadable", "plugin", "failed", "shared Beads skill", "Shared Beads skill file unreadable", "Readability is unavailable, not proof of absence or plugin failure; registry presence and use are separate observations.", undefined, fileScope);
  }
  if (local?.witness?.state === "differ") add("witness-differs", "beads", "review-needed", ".local_version", `Recorded ${local.witness.recorded} differs from running ${local.witness.running}`, "This is not evidence of schema, reconciliation, hook freshness or maintenance completion.", "Read-only review: consult https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/docs/getting-started/upgrading.md and compare the recorded and running values again; no migration is inferred.");
  if ((local?.managedInstructions?.full ?? 0) > 1) add("duplicate-full", "plugin", "review-needed", "root AGENTS.md", "Multiple full managed blocks are present", "Retained text may be customization or additional guidance, not proof of conflict.", "Review local customization before removing redundant guidance, which edits instructions; verify the resulting project and request counts.", fileScope);
  if (local?.witness?.state === "match") add("witness-matches", "beads", "ok", ".local_version", `Recorded ${local.witness.recorded} matches running ${local.witness.running}`, "A match does not establish schema or maintenance completion.");
  else if (local?.witness && local.witness.state !== "differ") add("witness-unknown", "beads", "unknown", ".local_version", `Witness ${local.witness.state ?? "unknown"}`, "This is not a new-store or maintenance diagnosis.");
  const request = snapshot.requestInstructions as { at?: number; full?: number; retained?: number } | undefined;
  if ((request?.full ?? 0) > 1) add("request-full-duplicates", "plugin", "review-needed", "last request instructions", "Multiple full managed blocks were observed", "Retained blocks can contain useful customization or additional guidance.", "Review local customization before removing redundant guidance, which edits instructions; verify the resulting project and request counts.", "last observed request", typeof request?.at === "number" ? new Date(request.at).toISOString() : "unavailable");
  const skill = snapshot.skill as { effective?: string[]; collision?: string } | undefined;
  if (Array.isArray(skill?.effective) && skill.effective.includes("beads")) add("shared-skill-effective", "plugin", "note", "effective skill registry", "A Beads skill is registered alongside oc-beads", "Registration does not establish use or freshness.");
  if (skill?.collision && skill.collision.startsWith("skill-collision")) add("skill-collision", "plugin", "review-needed", "skill rebuild", skill.collision, "Native customization precedence is preserved.");
  add("remote-freshness", "beads", "not-checked", "local diagnostic scope", "Source Git and Beads remote freshness were not checked", "No network or synchronization was attempted; local configuration is not reachability evidence.");
  const context = snapshot.contextObservation as { version?: string; loadedAt?: number } | undefined;
  const current = guard?.kind === "ready" ? (guard as { version?: string }).version : undefined;
  if (context?.version && current && context.version !== current) add("context-version-differs", "plugin", "review-needed", "context cache", `Context loaded with preceding CLI ${context.version}; current observation ${current}`, "These observations are not atomic; age alone does not prove staleness.", "Use the next session or configured idle refresh; normal full prime can access the store. Verify the observed context version in diagnostics afterward.");
  type Row = [check: string, status: 0 | 1 | 2 | null, value: string];
  const pluginRows: Row[] = [];
  const beadsRows: Row[] = [];
  const actions: string[] = [];
  const comments: string[] = [];
  const identity = snapshot.plugin as { name?: string; version?: string } | undefined;
  const cli = snapshot.guard as { kind?: string; version?: string; installed?: string; workspace?: { path?: string; repoRoot?: string } } | undefined;
  const commands = snapshot.commands as { registration?: string; lookup?: string; truncated?: boolean; membershipTruncated?: boolean; expectedCount?: number; missing?: string[]; mismatches?: unknown[] } | undefined;
  const cached = snapshot.contextObservation as { version?: string } | undefined;
  const guidance = snapshot.local as { managedInstructions?: { state?: string; full?: number; minimal?: number; codex?: number }; sharedSkill?: string; witness?: { state?: string; recorded?: string; running?: string } } | undefined;
  const host = typeof snapshot.host === "string" && snapshot.host !== "unknown" ? snapshot.host : undefined;
  pluginRows.push(["Host", host ? (/^2\.3\.\d+(?:\+.*)?$/.test(host) ? 0 : 2) : null, host ? `OpenCode ${host}${/^2\.3\.\d+(?:\+.*)?$/.test(host) ? "" : " unsupported"}` : "not observed"]);
  if (commands?.registration === "failed") pluginRows.push(["Commands", 2, "registration failed"]);
  else if (commands?.lookup !== "available") pluginRows.push(["Commands", null, "not observed"]);
  else if (commands.membershipTruncated || (commands.membershipTruncated !== false && commands.truncated)) {
    const changed = commands.mismatches?.length ?? 0;
    pluginRows.push(["Commands", null, `list incomplete${changed ? ` · ${changed} changed` : ""}`]);
  }
  else {
    const missing = commands.missing?.length;
    const overrides = commands.mismatches?.length ?? 0;
    if (missing === undefined) pluginRows.push(["Commands", null, "membership not observed"]);
    else {
      const count = commands.expectedCount;
      const membership = count === undefined ? (missing ? "" : "expected names present") : `${count - missing}/${count}`;
      const value = [membership, missing ? `${missing} missing` : "", overrides ? `${overrides} changed` : ""].filter(Boolean).join(" · ");
      pluginRows.push(["Commands", missing || overrides ? 1 : 0, missing || overrides ? value : count === undefined ? membership : `${membership} present`]);
    }
  }
  const shared = guidance?.sharedSkill === "missing" ? "absent" : guidance?.sharedSkill ?? "not observed";
  if ((snapshot.skill as { failure?: string } | undefined)?.failure) pluginRows.push(["Skill", 2, "unavailable"]);
  else if (skill?.collision?.startsWith("skill-collision")) pluginRows.push(["Skill", 1, `oc-beads overridden · shared: ${shared}`]);
  else if (Array.isArray(skill?.effective)) pluginRows.push(["Skill", skill.effective.includes("oc-beads") ? (shared === "unreadable" ? null : 0) : 1, `oc-beads ${skill.effective.includes("oc-beads") ? "active" : "absent"} · shared: ${shared}`]);
  else pluginRows.push(["Skill", null, `registry not observed · shared: ${shared}`]);
  const typed = typeof snapshot.typedRegistration === "string" ? snapshot.typedRegistration : "";
  if (typed.startsWith("registered")) pluginRows.push(["Typed tools", 0, "Registered"]);
  else if (typeof snapshot.typedContinuity === "string" && snapshot.typedContinuity.startsWith("enabled")) pluginRows.push(["Typed tools", 2, "Requested, not registered"]);
  else pluginRows.push(["Typed tools", null, typed.startsWith("disabled") ? "Not requested" : "not observed"]);
  const contextState = typeof snapshot.context === "string" ? snapshot.context : "";
  if (contextState === "ready") {
    const differs = cached?.version && cli?.version && cached.version !== cli.version;
    pluginRows.push(["Context", differs ? 1 : 0, differs ? `Loaded under bd ${cached.version}` : "Loaded"]);
    if (differs) actions.push("Refresh context in the next session or configured idle refresh. Check: diagnostics Context row.");
  } else if (contextState === "failed" || contextState.startsWith("withheld") || contextState.includes("lookup failed")) pluginRows.push(["Context", 2, contextState.startsWith("withheld") ? "Withheld" : contextState === "failed" ? "Failed" : "Session lookup failed"]);
  else pluginRows.push(["Context", null, contextState.includes("progress") || contextState === "loading" ? "Loading" : contextState === "empty" ? "Empty" : contextState.startsWith("unobserved:") ? "Not yet loaded" : "not observed"]);
  const root = guidance?.managedInstructions;
  if (root?.state === "available") {
    const configured = (root.full ?? 0) + (root.minimal ?? 0) + (root.codex ?? 0) > 0;
    pluginRows.push(["AGENTS Configured", (root.full ?? 0) > 1 ? 1 : configured ? 0 : null, (root.full ?? 0) > 1 ? "duplicate bd blocks" : configured ? "bd block" : "no bd block"]);
  } else pluginRows.push(["AGENTS Configured", null, root?.state === "missing" ? "no AGENTS.md" : root?.state ?? "not observed"]);
  if ((root?.full ?? 0) > 1) actions.push("Review duplicate full instruction blocks before editing local guidance. Check: root-file counts in diagnostics details.");
  const gap = typeof snapshot.persistence === "string" && snapshot.persistence !== "uncertain: no final-write guarantee" ? snapshot.persistence : undefined;
  if (gap) pluginRows.push(["Write outcomes", 1, gap.length > 180 ? `${gap.slice(0, 177)}...` : gap]);
  if (cli?.kind === "ready") beadsRows.push(["bd CLI", cli.version ? 0 : null, cli.version ?? "not observed"]);
  else if (cli?.kind === "unsupported" || cli?.kind === "unavailable") {
    beadsRows.push(["bd CLI", 2, cli.installed ? `${cli.installed} (needs ≥1.3.1)` : "not found"]);
    comments.push("bd CLI unavailable or below the supported minimum.");
    actions.push("Install or upgrade bd to ≥1.3.1, then start a new session. Check: `bd version`.");
  } else beadsRows.push(["bd CLI", null, "not observed"]);
  const workspaceStatus = cli?.kind === "ready" ? 0 : ["probe-failed", "withheld", "uninitialized"].includes(cli?.kind ?? "") ? 2 : null;
  beadsRows.push(["Workspace", workspaceStatus, cli?.kind === "ready" ? "Located" : cli?.kind === "probe-failed" ? "Probe failed" : cli?.kind === "withheld" ? "Withheld" : cli?.kind === "uninitialized" ? "Not initialized" : "not observed"]);
  const witness = guidance?.witness;
  beadsRows.push(["Recorded bd version", witness?.state === "match" ? 0 : witness?.state === "differ" ? 1 : null, witness?.state === "differ" ? `${witness.recorded} ≠ CLI ${witness.running}` : witness?.state === "match" ? `${witness.recorded} = CLI` : witness?.state === "missing" ? "none" : witness?.state ?? "not observed"]);
  if (Array.isArray(hooks) && hooks.length) {
    const entries = hooks as Array<{ installed: boolean; shim: boolean; outdated: boolean; version: string }>;
    const installed = entries.filter((h) => h.installed).length;
    const missing = entries.length - installed;
    const outdated = entries.filter((h) => h.installed && h.outdated).length;
    const unidentified = entries.filter((h) => h.installed && !h.version).length;
    const shimCount = entries.filter((h) => h.installed && h.shim).length;
    const shims = shimCount ? (shimCount === installed ? " (shims)" : ` (${shimCount} shims)`) : "";
    const value = [`${installed}/${entries.length} installed${shims}`, missing ? `${missing} missing/unreadable/unresolved` : "", outdated ? `${outdated} outdated` : "", unidentified ? `${unidentified} unrecognized` : ""].filter(Boolean).join(" · ");
    beadsRows.push(["Git hooks", missing || outdated || unidentified ? 1 : 0, value]);
    if (missing || outdated) {
      comments.push("Git hooks need attention.");
      actions.push("Install or refresh hooks: `bd hooks install` (`--beads` / `--shared` for those layouts; writes hooks and may change core.hooksPath). Check: `bd hooks list`.");
    } else if (unidentified) actions.push("Review hook identities. Check: `bd hooks list`.");
  } else beadsRows.push(["Git hooks", null, typeof hooks === "string" && hooks.startsWith("withheld:") ? "Withheld" : typeof hooks === "string" && hooks.startsWith("failed:") ? "observation failed" : "not observed"]);
  const markers = ["✅", "⚠️", "❌"];
  const labels = ["Healthy", "Mismatch", "Unhealthy"];
  const rollup = (rows: Row[]) => {
    const assessed = rows.filter(([, status]) => status !== null).map(([, status]) => status as number);
    const worst = assessed.length ? Math.max(...assessed) : undefined;
    return worst === undefined ? "— No checks assessed" : `${markers[worst]} ${labels[worst]}`;
  };
  const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  const code = (value: string) => `\`${cell(value).replace(/`/g, "\\`")}\``;
  const table = (rows: Row[]) => ["| Check | Status | Value |", "|---|---|---|", ...rows.map(([check, status, value]) => `| ${check} | ${status === null ? "—" : markers[status]} | ${cell(value)} |`)].join("\n");
  const output = [
    `## Beads diagnostics — ${rollup([...pluginRows, ...beadsRows])}`,
    "", `DATE: ${code(time)}`, "", `VERSION: ${cell(identity?.name ?? "plugin not observed")} ${code(identity?.version ?? "version not observed")}`,
    "", `PATH: ${code(cli?.workspace?.repoRoot ?? "not observed")}`,
    ...(comments.length ? ["", comments[0]!] : []),
    "", `**Plugin** ${rollup(pluginRows)}`, "", table(pluginRows),
    "", `**Beads** ${rollup(beadsRows)}`, "", table(beadsRows),
    ...(actions.length ? ["", "**Actions**", "", ...actions.map((action) => `- ${action}`)] : []),
  ];
  if (details) output.push("", "**Evidence**", "Local observations do not establish SQL health, historical maintenance, remote freshness or complete memory delivery. Model relay is not guaranteed verbatim.", `Details: ${JSON.stringify({ ...snapshot, capturedAt: time, findings })}`);
  return output.join("\n");
}

/** Self-contained reference: help bypasses the diagnostic callback, not the later prompt lifecycle. */
export const DIAGNOSTICS_HELP = `## Beads diagnostics help

Use /oc-beads:diagnostics for current observations, /oc-beads:diagnostics details for bounded evidence, or /oc-beads:diagnostics help for this reference.
Only exact trimmed, case-insensitive details or help selects a special view; other free text selects normal output. Each view is captured once and replayed unchanged.

✅ Healthy: an assessed check matches. ⚠️ Mismatch: an observed setup difference. ❌ Unhealthy: known incompatibility or integration failure. —: unobserved or unassessed. Neutral rows stay visible and do not affect severity or add heading counts. The worst assessed check sets each heading.

| Check | Source, values and useful response |
|---|---|
| Host | Observed OpenCode version; supported 2.3.x is healthy, unsupported is unhealthy, unknown is neutral. Check the operator's OpenCode version; upgrades are operator-owned. |
| Commands | Effective command registry vs package definitions: present/expected when membership is complete, missing or changed is mismatch, registration failed is unhealthy, list incomplete or lookup unavailable is neutral. Review overrides, then rerun diagnostics. Matching descriptions do not prove ownership; clipping at our 512-character evidence cap is details-only. |
| Skill | Packaged oc-beads and effective skill registry plus scoped shared Beads skill readability: active, absent, overridden or unavailable. Packaged load failure is unhealthy, absent/overridden is mismatch; missing shared skill alone is informational. Review configured skill overrides, then rerun diagnostics. |
| Typed tools | Registration state: Registered, Requested, not registered (unhealthy), Not requested (neutral) or not observed. Registration does not grant operation permissions. Check diagnostics details and actual tool discovery. |
| Context | Cached load state/version: Loaded, Loaded under a differing bd version (mismatch), Not yet loaded, Loading, Empty, Withheld, Failed or Session lookup failed. Withheld/failure is unhealthy; missing evidence is neutral. For version differences use the next session or configured idle refresh, then check Context; normal full prime may open a store. |
| AGENTS Configured | Bounded root AGENTS.md (or confirmed session directory) recognized full/minimal/Codex bd markers: bd block, duplicate bd blocks (repeated full blocks, mismatch), no bd block, no AGENTS.md, unreadable or truncated (neutral). Markers do not establish complete guidance or runtime harness availability. Review customization before edits; check root and last-request scope/counts/times in details. |
| Write outcomes | Existing unresolved write evidence only (mismatch). Inspect actual operation/readback before any retry; this row is absent without a recorded gap. |
| bd CLI | Native version observation: supported version, below minimum 1.3.1 or not found. Install/upgrade only in an authorized workflow; check bd version and a new session. |
| Workspace | Config-only native context: Located, Not initialized, Probe failed, Withheld or not observed. Located identifies a directory, not database integrity. Review location/context evidence; onboarding is human-directed, never automatic repair. |
| Recorded bd version | Bounded .local_version under resolved beads_dir: equals CLI, differs from CLI (mismatch), none, unreadable, unsupported, truncated or unavailable (neutral). Compare bd version and the recorded value; review native upgrade guidance for a difference. This is no schema or maintenance diagnosis. |
| Git hooks | Native bd hooks list: installed counts include shims; missing/unreadable/unresolved, outdated or unrecognized installed identity is mismatch. Empty/failed/withheld observations are neutral. Review intended default, --beads or --shared layout and customization before bd hooks install (writes hooks and may change core.hooksPath); check bd hooks list. Shims do not certify wrapper freshness; unrecognized does not prove foreign identity. |

Below the title and before the summary, DATE is the exact capture timestamp, VERSION the executing package name/version, and PATH the observed native repository root (cwd_repo_root), each in a separate paragraph. Missing root is explicitly not observed; no root is inferred from beads_dir or session cwd. The Beads directory remains in details. Details retains raw command inventory/clipping, hook entries, root marker counts, last-request counts/times, context provenance and finding explanations.

Help invokes no diagnostic collection. Normal/details collection uses only version, config-only context, qualified hooks list, cached integration observations and bounded local files; it performs no setup, repair, sync or network check. The later ordinary prompt lifecycle can still load full native prime and memories and open or migrate a store.
SQL/schema health, maintenance history, remote freshness, complete memory delivery and unique build identity are not measured. Model relay of the saved Markdown is not guaranteed verbatim; styling is theme-controlled.

Full reference: https://github.com/snarkipus/opencode-beads/blob/main/docs/diagnostics.md`;
