import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "@opencode/plugin";
import type { SessionContext } from "@opencode/plugin/promise/session";
import type { CommandDefinition } from "@opencode/plugin/promise/command";

type SkillEditor = Parameters<Parameters<Plugin.Context["skill"]["transform"]>[0]>[0];
export type BeadsSkill = Parameters<SkillEditor["add"]>[0];

/** Package-relative paths survive npm installation, spaces and ignored/deep install roots. */
export const BEADS_SKILL_PATH = fileURLToPath(new URL("../assets/oc-beads/SKILL.md", import.meta.url));

/** Exact membership is checked against the selected immutable command inventory. */
export const WORKFLOWS = {
  audit: ["Inspect or explicitly record scoped audit evidence; never collect transcripts automatically.", "CLI_REFERENCE"],
  blocked: ["Inspect blocked work; distinguish explicit blocked status from dependency blocking.", "DEPENDENCIES"],
  close: ["Close only the requested work with acceptance and validation evidence and closure authority.", "WORKFLOWS"],
  comments: ["Read discussion or append the requested comment/checkpoint without replacing prior notes.", "RESUMABILITY"],
  compact: ["Guide semantic issue compaction with bd admin compact, distinct from bd compact Dolt-history squashing and conversation compaction. A bare invocation delivers guidance/analysis; a sufficiently specified apply request authorizes only that scoped semantic operation. Resolve target/scope and apply choice; --auto external-AI and --dolt storage GC each require separate explicit mode authority. Supply explicit --actor.", "TROUBLESHOOTING"],
  create: ["Create the requested issue with useful description, acceptance/design and discovered-from provenance when applicable; leave it unassigned unless assignment is intentional.", "ISSUE_CREATION"],
  decision: ["Record the requested decision, rationale and alternatives; reference intended behavior and detailed rationale in their project-owned homes.", "INTEGRATION_PATTERNS"],
  delete: ["Inspect requested targets and effects, then delete them when inputs and policy permit; a sufficiently specified deletion invocation requests that scoped deletion. Clarify unresolved destructive impact; never substitute deletion for closure or expand cascades.", "TROUBLESHOOTING"],
  dep: ["Inspect or change only the requested dependencies. Verify that X depends on Y in the intended direction.", "DEPENDENCIES"],
  epic: ["Inspect or manage the requested hierarchy; closed children alone do not establish parent acceptance.", "DEPENDENCIES"],
  export: ["Export only the requested scope and destination with current CLI help; distinguish issue interchange from a full backup or memory export.", "CLI_REFERENCE"],
  import: ["Perform the requested scoped import after inspecting input and current syntax; resolve input, target context and material mode/conflicts, then report counts and partial outcomes. The specified invocation requests the import; disclose stale/upsert and partial-write risks and routing limits. Never initialize, restore or repair implicitly.", "CLI_REFERENCE"],
  init: ["Provide human-directed onboarding and current bd init help, explaining side effects. Do not initialize a store automatically.", "CLI_REFERENCE"],
  label: ["Inspect or update only requested labels while preserving the project's taxonomy.", "CLI_REFERENCE"],
  list: ["Retrieve issues with the requested supported filters. Retrieval does not authorize claims or task execution.", "CLI_REFERENCE"],
  prime: ["Use supplied current context when available; request a guarded full-context refresh only when authorized and no hold is active.", "RESUMABILITY"],
  quickstart: ["Guide onboarding with installed bd quickstart help, current authorized context and packaged guidance; do not initialize a store or assume commands unavailable in the installed CLI.", "CLI_REFERENCE"],
  ready: ["Inspect actionable work. Honor an exact assignment; claim and execute only work already within the authorized scope.", "WORKFLOWS"],
  "rename-prefix": ["Explain the requested project identifier migration and reference impact using current CLI help; a fully scoped migration request supplies its authority. Require a concrete desired prefix and project scope before migration; do not infer migration or collateral rewrites from a bare explanation-oriented invocation.", "TROUBLESHOOTING"],
  reopen: ["Inspect current state, then reopen only the requested issue with the supplied regression/correction reason.", "WORKFLOWS"],
  restore: ["Retrieve pre-compaction issue content with bd restore; display-only by default. Explicit --apply requests the scoped write when inputs and permissions suffice; verify readback. This is not database backup recovery or guaranteed reversibility.", "RESUMABILITY"],
  search: ["Search issues using supported filters; distinguish issue search from reusable memory search.", "CLI_REFERENCE"],
  show: ["Read requested issue details, prior notes, acceptance and dependencies without mutating them.", "CLI_REFERENCE"],
  stats: ["Report the issue-database overview using bd status (alias bd stats); use oc-beads:diagnostics for integration health. Do not claim work.", "CLI_REFERENCE"],
  sync: ["Perform supported bd sync --no-adopt using existing project configuration, actual executor actor and applicable sandbox policy, then report the observed outcome. A bare invocation requests synchronization; a missing configured remote is a blocker. Use an explicitly selected existing remote only when unambiguous; no --yes, adoption, provisioning, force resolution or manual pull/push repair loop. Explicit adoption is a distinct request, never inferred. Distinguish Dolt-remote synchronization from bd federation sync and removed JSONL sync.", "CLI_REFERENCE"],
  template: ["Discover actual available templates/formulas using supported installed commands, optionally inspect a requested one, and report entries or an honest unavailable result. Help inspection is preparation; do not instantiate or execute a formula automatically.", "MOLECULES"],
  update: ["Apply only requested field changes; use an atomic claim for authorized execution and append-style progress notes. Replacement of notes is intentional, never routine.", "RESUMABILITY"],
  version: ["Report actual installed CLI, package and host versions and qualification limits; do not hardcode a latest version or install/upgrade anything.", "CLI_REFERENCE"],
  workflow: ["Guide native Beads work and recovery: inspect scope, read prior state, claim atomically, checkpoint meaningful learning, validate and return evidence. Continue only within an authorized batch/goal.", "WORKFLOWS"],
} as const;

export interface SkillLoadDependencies {
  skillPath?: string;
  readText?: (path: string) => Promise<string>;
}

/** Read only the explicit packaged guidance links; no scan, installer or watcher is needed. */
export async function loadBeadsSkill(deps: SkillLoadDependencies = {}): Promise<BeadsSkill> {
  const skillPath = deps.skillPath ?? BEADS_SKILL_PATH;
  const readText = deps.readText ?? ((path: string) => readFile(path, "utf8"));
  let markdown: string;
  try {
    markdown = await readText(skillPath);
  } catch {
    throw new Error("skill-unreachable SKILL.md");
  }
  const content = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  const links = new Set([...content.matchAll(/\]\(((?:resources|adr)\/[^)]+)\)/g)].map((match) => match[1]!));
  if (links.size !== 17) throw new Error("resource-links-invalid: expected 17 explicit supporting links");
  for (const link of links) {
    try {
      if (!(await readText(resolve(dirname(skillPath), link))).trim()) throw new Error("empty");
    } catch {
      throw new Error(`resource-unreachable ${link}`);
    }
  }
  // The accepted asset's semantic trigger; no general frontmatter parser or host scanner clone.
  return {
    id: "oc-beads" as BeadsSkill["id"],
    name: "oc-beads" as BeadsSkill["name"],
    description: "Use Beads for durable work tracking, dependencies, blockers, checkpoints, recovery and reusable project knowledge.",
    path: skillPath as BeadsSkill["path"],
    content,
  };
}

/** Inspect the candidate editor on every rebuild, including earlier changing user transforms. */
export function applyBeadsSkill(editor: SkillEditor, skill: BeadsSkill, diagnose: (message: string) => void): void {
  if (editor.list().some((entry) => String(entry.id) === "oc-beads" || String(entry.name) === "oc-beads")) {
    diagnose("skill-collision oc-beads: existing customization preserved");
    return;
  }
  editor.add(skill);
}

/** Expand supported workflow/legacy snapshots only in transient user request copies. */
export function expandBeadsWorkflowContext(messages: SessionContext["messages"]): void {
  for (const [index, message] of messages.entries()) {
    if (message.role !== "user") continue;
    const metadata = { ...message.metadata };
    let instructions: string | undefined;
    for (const key of ["ocBeadsSync", "ocBeadsWorkflow"]) {
      const snapshot = metadata[key];
      if (!snapshot || typeof snapshot !== "object" || !("version" in snapshot) || snapshot.version !== 1
        || !("instructions" in snapshot) || typeof snapshot.instructions !== "string") continue;
      instructions = snapshot.instructions;
      delete metadata[key];
    }
    if (instructions === undefined) continue;
    messages[index] = {
      ...message,
      metadata,
      content: [{ type: "text", text: instructions }, ...message.content],
    };
  }
}

/** Build native prompt commands with compact text and durable static workflow instructions. */
export function createBeadsCommands(
  session: Pick<Plugin.Context["session"], "prompt">,
  diagnostics: (sessionID: string) => Promise<string>,
  skillPath = BEADS_SKILL_PATH,
  signal?: AbortSignal,
): CommandDefinition[] {
  const common = [
    "Workflow commands guide permitted operations, not exact CLI aliases.",
    "The invocation itself is the invoking user's bounded request, even without trailing details. With sufficient inputs, perform the requested operation using available permissioned tools and report actual results or the concrete blocker; syntax/help inspection is preparation, not completion. Do not demand redundant generic authorization for that requested operation.",
    "Interpret literal details in conversational context. Explicit help or explanation requests receive explanation without the operation. Ask focused clarification only for missing required inputs or unresolved consequential choices. Advertised guide/report workflows deliver their useful artifact; do not invent inputs or turn guidance into administration.",
    "Follow repository/user authority and the exact requested scope. Do not bypass a hold with manual prime or other store access.",
    "Use actual request capabilities: discover the native beads namespace and compose supported daily operations in code mode when present. Native shell is direct-only; advanced/admin workflows use permissioned direct shell and current CLI help. Do not call tools.shell inside execute. Advanced guidance does not enable automation.",
    "Every agent-authored write, claim and heartbeat needs the host-rendered actual executor's command-scoped BEADS_ACTOR or --actor. Preserve authorship; read created_by, owner and assignee separately.",
    "Distinguish task checkpoints from reusable memory. Report failed, partial and uncertain outcomes; never blindly retry an ambiguous write.",
    `Load skill oc-beads (installed file ${JSON.stringify(skillPath)}). If guidance is missing or permission denies access, report it honestly without bypass.`,
  ].join("\n");
  const commands: CommandDefinition[] = Object.entries(WORKFLOWS).map(([stem, [purpose, resource]]) => ({
    name: `oc-beads:${stem}`,
    description: purpose,
    async execute(input) {
      if (signal?.aborted) throw new Error("Beads workflow unloaded");
      const instructions = `Invoked command: /oc-beads:${stem}\nRequested outcome: ${purpose}\n${common}\nSupporting guidance: ${JSON.stringify(resolve(dirname(skillPath), "resources", `${resource}.md`))}`;
      await session.prompt({
        ...input.prompt,
        sessionID: input.sessionID,
        delivery: input.delivery,
        text: `/oc-beads:${stem}${input.prompt.text ? `${/[\r\n]/.test(input.prompt.text) ? "\n" : " "}${input.prompt.text}` : ""}`,
        metadata: { ocBeadsWorkflow: { version: 1, instructions } },
      });
    },
  }));
  commands.push({
    name: "oc-beads:diagnostics",
    description: "Inspect OpenCode Beads integration discovery, conflicts, compatibility and context/persistence diagnostics without opening a store; use oc-beads:stats for the issue-database overview.",
    async execute(input) {
      if (signal?.aborted) throw new Error("Beads workflow unloaded");
      const report = await diagnostics(input.sessionID);
      if (signal?.aborted) throw new Error("Beads workflow unloaded");
      await session.prompt({
        ...input.prompt, sessionID: input.sessionID, delivery: input.delivery,
        text: `Report these observed Beads diagnostics. This is read-only; do not run store-opening commands, change configuration or infer live qualification.\n${report}\n\nUser request:\n${input.prompt.text}`,
      });
    },
  });
  return commands;
}
