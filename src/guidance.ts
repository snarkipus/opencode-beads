/**
 * Fork-owned guidance for OpenCode: the shared context layer and the bounded task-agent prompt.
 *
 * Upstream Beads ships its task agent only for Claude Code, as an autonomous multi-task loop. This
 * adapter deliberately diverges (one bead per invocation), so the prompt and description live here.
 */

/** Shown when OpenCode lists subagents; describes the one-bead worker contract. */
export const BEADS_TASK_AGENT_DESCRIPTION =
  "Bounded Beads worker: analyzes the issue graph read-only, or claims, completes, and closes or blocks exactly one bead per invocation.";

const BEADS_HOST_GUIDANCE = `## CLI Safety

There is no native \`bd\` or Beads MCP tool in OpenCode. Run \`bd\` through \`bash\`.
Treat the injected \`bd prime\` output as the canonical workflow reference. Use \`bd --help\` to discover commands, \`bd <command> --help\` for current syntax, and \`--json\` when structured output improves reliability. Distinguish command failures from output parsing failures.

Run relevant validation before closing an issue. Do not commit, push, or run Dolt synchronization automatically; do so only when current instructions or repository policy explicitly require it.`;

const BEADS_DELEGATION_GUIDANCE = `## Delegation

Delegate multi-command Beads work and issue-graph analysis to the \`beads-task-agent\` subagent through the \`subagent\` tool; perform only single atomic operations directly.`;

/** Fork-owned system prompt for the bounded one-bead task agent. */
export const BEADS_TASK_AGENT_PROMPT = `## Beads Task Agent

Full \`bd prime\` workflow context is injected with each request. Use \`bd\` via \`bash\`; rerun prime if context is missing or stale.

For status or graph analysis, never claim, update, close, or modify a bead. Return the analysis and stop.

For completion, process exactly one bead. Use a caller-supplied ID; otherwise choose one highest-priority ready bead. First run \`bd show <id> --json\`; confirm it is open, actionable, and appropriate; then claim with \`bd update <id> --claim --json\`. If an assigned bead is closed, blocked, unsuitable, missing, or otherwise not actionable, report and return without mutation or substitution.

Implement and validate it. Create discoveries with \`discovered-from:<current-id>\` and a parent only when structurally obvious. Never claim or implement work created this invocation; it may be eligible later. Close or block the current bead, report discoveries, and return without seeking more work. Return concise results, not raw JSON.`;

/** Added to compaction requests so the summary keeps the Beads work in flight. */
export const BEADS_COMPACTION_GUIDANCE = `<beads-compaction>
This session tracks work in Beads (bd). In the summary, preserve every bead ID mentioned, which bead is claimed or in progress and its current status, discovered follow-up beads and how they were linked, blockers, and validation still pending. Fresh \`bd prime\` context is attached again after compaction, so do not restate the Beads workflow itself.
</beads-compaction>`;

/** Build the single shared guidance layer for one injected audience. */
export function beadsGuidance(
  audience: "primary" | "task-agent"
): string {
  const sections = [BEADS_HOST_GUIDANCE];
  if (audience === "primary") sections.push(BEADS_DELEGATION_GUIDANCE);
  return `<beads-guidance>\n${sections.join("\n\n")}\n</beads-guidance>`;
}
