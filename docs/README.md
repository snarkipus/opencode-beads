# Documentation index

## Where each kind of truth lives

| Kind | Home | Authority |
| --- | --- | --- |
| Intended behavior | Canonical specs under `openspec/specs/` | **Normative.** Change it only through an owner-approved OpenSpec change. |
| Design rationale | Archived changes under `openspec/changes/archive/` | Explains decisions at the time; does not override the specs. |
| User guidance | [README](../README.md), [user guide](user-guide.md), packaged [`assets/oc-beads/`](../assets/oc-beads/SKILL.md) | Explains current behavior; must agree with the specs. |
| Reference facts | [OpenCode integration reference](opencode-sdk-contract.md), [Beads artifact policy](beads-artifact-policy.md) | Pinned upstream interfaces, sources and implementation mapping; not product rules. |
| Historical evidence | `docs/reviews/`, dated qualification/evaluation/acceptance records in `docs/`, [`docs/history/`](history/opencode-sdk-contract-ledger.md) | Frozen at the time written. Original verdicts and failures stand; do not edit them to sound current. |
| Live execution status | Beads (`bd`) | Assignment, progress, acceptance and closure; do not duplicate it as mutable state in specs or guides. Dated acceptance evidence remains in historical records. |

For intended product behavior, the canonical specs are authoritative. These homes
answer different questions; they are not a ranking that overrides observed facts
or execution authority. Correct inaccurate explanatory prose within the assigned
scope, but never rewrite historical evidence or invent an upstream API to make it
agree with a spec. A mismatch between the spec, implementation, SDK facts or test
results must be reported with its evidence for disposition. Changing the accepted
behavior requires an owner decision; a product requirement never grants dispatch,
publication or activation authority.

## Canonical specs

- [workflow-access](../openspec/specs/workflow-access/spec.md): commands, skill, diagnostics, permissions and actors, host admission, workflow snapshots and the documented snapshot-recovery deficiency.
- [work-continuity](../openspec/specs/work-continuity/spec.md): checkpoints, knowledge, recovery, compaction responsibilities, honest persistence and typed daily-loop composition.
- [upstream-review](../openspec/specs/upstream-review/spec.md): upstream source comparison and review disposition.

## Current documents

- [User guide](user-guide.md): installation details, options, upgrading, context, native store behavior, workflows, task agent, compatibility and troubleshooting.
- [OpenCode integration reference](opencode-sdk-contract.md): pinned host interfaces and where the adapter uses them.
- [Beads artifact policy](beads-artifact-policy.md): what is and is not taken from upstream Beads, and the `bd` contract check.
- [2.2.6 qualification](opencode-22-qualification-5rj2.md): the frozen evidence summary behind the current host support.

Dated analyses, reviews and qualification/evaluation records describe their named
revisions. Read them to trace decisions and evidence, not as current operating
instructions. Executable tooling under `docs/` retains its separate code role.
