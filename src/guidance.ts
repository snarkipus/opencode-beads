/**
 * Project-owned guidance for OpenCode: the shared context layer and the bounded task-agent prompt.
 *
 * Upstream Beads ships its task agent only for Claude Code, as an autonomous multi-task loop. This
 * adapter deliberately diverges (one bead per invocation), so the prompt and description live here.
 */

/** Shown when OpenCode lists subagents; describes the one-bead worker contract. */
export const BEADS_TASK_AGENT_DESCRIPTION =
  "Bounded Beads worker: analyzes the issue graph read-only, or claims, completes, and closes or blocks exactly one bead per invocation.";

const BEADS_HOST_GUIDANCE = `## CLI Safety

There is no native \`bd\` or Beads MCP tool in OpenCode. Run \`bd\` through the \`shell\` tool.
Treat the injected \`bd prime\` output as the canonical workflow reference. Use \`bd --help\` to discover commands, \`bd <command> --help\` for current syntax, and \`--json\` when structured output improves reliability. Distinguish command failures from output parsing failures.

Run relevant validation before closing an issue. Do not commit, push, or run Dolt synchronization automatically; do so only when current instructions or repository policy explicitly require it.`;

const BEADS_RECOVERY_GUIDANCE = `## Work continuity

At the first eligible request after a fresh session, compaction, interruption, child handoff or important change, retrieve the assigned task and relevant reusable knowledge under the current permissions and guard. Re-read current state when external writers may have changed it; cached absence is not proof of absence. Missing, withheld, failed and intentionally empty workflow context are different outcomes; never bypass a hold with manual prime.

Append task-specific attempts, measured outcomes, rationale, blockers and the next authorized action at meaningful transitions. Keep hypotheses qualified. Reusable project memory is for validated findings with scope and evidence: search or recall relevant existing knowledge before adding or correcting it. No redundant write quota applies.

Only actual CLI results acknowledge persistence. A timeout or interrupted append/remember is uncertain: inspect durable state before another write, with no blind retry. A landed memory with failed or indeterminate commit retains its reference and qualified status; do not force it or automatically commit. Empty found memory differs from a missing key. Every authorized write uses the actual executor's explicit Beads actor, separate from the host permission agent; never use human Git identity or a model-supplied impersonation.

Typed continuity activation is withheld pending host qualification. The installed Beads CLI owns database, routing and consistency semantics; the adapter invokes normal supported operations from the actual project context under OpenCode permissions. Typed writes derive a stable readable actor from the actual invocation session and agent. That attribution is not authentication and never transfers assignment: deliberate handoffs still require their own authorized claim/update and evidence. Where an authorized permission check uses save: [], an always reply grants this call only and ask may prompt again; existing shell grants remain subject to denies.`;

const BEADS_DELEGATION_GUIDANCE = `## Delegation

Delegate multi-command Beads work and issue-graph analysis to the \`beads-task-agent\` subagent through the \`subagent\` tool; perform only single atomic operations directly.`;

/** Project-owned system prompt for the bounded one-bead task agent. */
export const BEADS_TASK_AGENT_PROMPT = `## Beads Task Agent

Full \`bd prime\` workflow context is injected with each request. Use \`bd\` via the \`shell\` tool; rerun prime if context is missing or stale.

For status or graph analysis, never claim, update, close, or modify a bead. Return the analysis and stop.

For completion, process exactly one bead. Use a caller-supplied ID; otherwise choose one highest-priority ready bead. First run \`bd show <id> --json\`; confirm it is open, actionable, and appropriate; then claim with \`bd update <id> --claim --json\`. If an assigned bead is closed, blocked, unsuitable, missing, or otherwise not actionable, report and return without mutation or substitution.

Implement and validate it. Create discoveries with \`discovered-from:<current-id>\` and a parent only when structurally obvious. Never claim or implement work created this invocation; it may be eligible later. Close or block the current bead, report discoveries, and return without seeking more work. Return concise results, not raw JSON.`;

/** Shown instead of context when `bd prime` fails, as upstream's Codex hook reports refresh failures. */
export function primeFailureNotice(reason: "failed" | "timed out"): string {
  return `<beads-notice>
Beads workflow context could not be loaded: \`bd prime\` ${reason}. Beads may still work; run \`bd prime\` to load the workflow and see the error, and tell the user if it keeps failing.
</beads-notice>`;
}

/** Added to compaction requests so the summary keeps the Beads work in flight. */
export const BEADS_COMPACTION_GUIDANCE = `<beads-compaction>
This session tracks work in Beads (bd). Carry acknowledged durable task/memory references, current scope, attempts, blockers, pending validation and known unsaved or uncertain gaps into the summary or native-provider context. A summary is not a Beads write. Do not persist, wait for permission or a queued write, or request a recursive same-session checkpoint during compaction. Earlier meaningful checkpoints support recovery; no final-write guarantee applies. Fresh guarded context is requested after compaction. Preserve host-owned native replay, metadata.keepID and legacy metadata.recent; do not inject result.native.messages or a replacement result to add references.
</beads-compaction>`;

/** Build the single shared guidance layer for one injected audience. */
export function beadsGuidance(
  audience: "primary" | "task-agent"
): string {
  const sections = [BEADS_HOST_GUIDANCE, BEADS_RECOVERY_GUIDANCE];
  if (audience === "primary") sections.push(BEADS_DELEGATION_GUIDANCE);
  return `<beads-guidance>\n${sections.join("\n\n")}\n</beads-guidance>`;
}
