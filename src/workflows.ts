import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "@opencode/plugin";
import type { CommandDefinition } from "@opencode/plugin/promise/command";

type SkillEditor = Parameters<Parameters<Plugin.Context["skill"]["transform"]>[0]>[0];
export type BeadsSkill = Parameters<SkillEditor["add"]>[0];

/** Package-relative paths survive npm installation, spaces and ignored/deep install roots. */
export const BEADS_SKILL_PATH = fileURLToPath(new URL("../assets/oc-beads/SKILL.md", import.meta.url));

/** Exact membership is checked against the selected immutable command inventory. */
export const WORKFLOWS = {
  audit: ["Inspect or explicitly record scoped audit evidence; never collect transcripts automatically.", "INTEGRATION_PATTERNS"],
  blocked: ["Inspect blocked work; distinguish explicit blocked status from dependency blocking.", "DEPENDENCIES"],
  close: ["Close only the requested work with acceptance and validation evidence and closure authority.", "WORKFLOWS"],
  comments: ["Read discussion or append the requested comment/checkpoint without replacing prior notes.", "RESUMABILITY"],
  compact: ["Explain or perform explicitly authorized administrative issue compaction using current CLI help; this is separate from conversation compaction.", "TROUBLESHOOTING"],
  create: ["Create the requested issue with useful description, acceptance/design and discovered-from provenance when applicable; leave it unassigned unless assignment is intentional.", "ISSUE_CREATION"],
  decision: ["Record the requested decision, rationale and alternatives; reference intended behavior and detailed rationale in their project-owned homes.", "INTEGRATION_PATTERNS"],
  delete: ["Inspect the requested deletion and its effects; delete only with explicit scoped authority, never as a substitute for closure.", "TROUBLESHOOTING"],
  dep: ["Inspect or change only the requested dependencies. Verify that X depends on Y in the intended direction.", "DEPENDENCIES"],
  epic: ["Inspect or manage the requested hierarchy; closed children alone do not establish parent acceptance.", "WORKFLOWS"],
  export: ["Export only the requested scope and destination with current CLI help; distinguish issue interchange from a full backup or memory export.", "CLI_REFERENCE"],
  import: ["Inspect current import help and requested input before an authorized import; disclose stale/upsert and partial-write risks and routing limits. Never initialize or restore implicitly.", "TROUBLESHOOTING"],
  init: ["Provide human-directed onboarding and current bd init help, explaining side effects. Do not initialize a store automatically.", "INTEGRATION_PATTERNS"],
  label: ["Inspect or update only requested labels while preserving the project's taxonomy.", "CLI_REFERENCE"],
  list: ["Retrieve issues with the requested supported filters. Retrieval does not authorize claims or task execution.", "CLI_REFERENCE"],
  prime: ["Use supplied current context when available; request a guarded full-context refresh only when authorized and no hold is active.", "RESUMABILITY"],
  quickstart: ["Provide onboarding using current prime/help and packaged guidance; the deprecated bd quickstart command is not assumed available.", "BOUNDARIES"],
  ready: ["Inspect actionable work. Honor an exact assignment; claim and execute only work already within the authorized scope.", "WORKFLOWS"],
  "rename-prefix": ["Explain the requested project identifier migration and reference impact using current CLI help; require explicit migration authority.", "TROUBLESHOOTING"],
  reopen: ["Inspect current state, then reopen only the requested issue with the supplied regression/correction reason.", "WORKFLOWS"],
  restore: ["Inspect supported historical retrieval/restoration in the installed Dolt-based CLI; do not assume legacy Git restore syntax or restore without authority.", "RESUMABILITY"],
  search: ["Search issues using supported filters; distinguish issue search from reusable memory search.", "CLI_REFERENCE"],
  show: ["Read requested issue details, prior notes, acceptance and dependencies without mutating them.", "RESUMABILITY"],
  stats: ["Report the requested issue overview without automatically claiming work.", "CLI_REFERENCE"],
  sync: ["Inspect current bd sync help: current federation synchronization differs from removed JSONL sync. Synchronize only with explicit authority; disclose conflicts without forcing a side.", "WORKTREES"],
  template: ["Discover supported templates/formulas through installed help; replace obsolete static template syntax and do not execute a formula automatically.", "MOLECULES"],
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

/** Build native prompt commands, never shell/template interpolation or synthetic continuation. */
export function createBeadsCommands(
  session: Pick<Plugin.Context["session"], "prompt">,
  status: (sessionID: string) => Promise<string>,
  skillPath = BEADS_SKILL_PATH,
  signal?: AbortSignal,
): CommandDefinition[] {
  const common = [
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
      await session.prompt({
        ...input.prompt,
        sessionID: input.sessionID,
        delivery: input.delivery,
        text: `${purpose}\n${common}\nSupporting guidance: ${JSON.stringify(resolve(dirname(skillPath), "resources", `${resource}.md`))}\n\nUser request:\n${input.prompt.text}`,
      });
    },
  }));
  commands.push({
    name: "oc-beads:status",
    description: "Inspect native discovery, conflicts, compatibility and context/persistence status without opening a store.",
    async execute(input) {
      if (signal?.aborted) throw new Error("Beads workflow unloaded");
      const report = await status(input.sessionID);
      if (signal?.aborted) throw new Error("Beads workflow unloaded");
      await session.prompt({
        ...input.prompt, sessionID: input.sessionID, delivery: input.delivery,
        text: `Report these observed Beads diagnostics. This is read-only; do not run store-opening commands, change configuration or infer live qualification.\n${report}\n\nUser request:\n${input.prompt.text}`,
      });
    },
  });
  return commands;
}
