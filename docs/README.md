# Documentation index

## Where each kind of truth lives

| Kind | Home | Authority |
| --- | --- | --- |
| Intended behavior | Canonical specs under `openspec/specs/` | **Normative.** Change it only through an owner-approved OpenSpec change. |
| Design rationale | Archived changes under `openspec/changes/archive/` | Explains decisions at the time; does not override the specs. |
| User guidance | [README](../README.md), [user guide](user-guide.md), packaged [`assets/oc-beads/`](../assets/oc-beads/SKILL.md) | Explains current behavior; must agree with the specs. |
| Reference facts | [OpenCode integration reference](opencode-sdk-contract.md), [Beads artifact policy](beads-artifact-policy.md) | Pinned upstream interfaces, sources and implementation mapping; not product rules. |
| Qualification evidence | [Compatibility evidence](compatibility-evidence.md), with links to the original runs | Records which configurations and behaviors were actually tested, not what the plugin admits. |
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
- [Diagnostics reference](diagnostics.md): normal/details/help views, row sources and states, remedies, instruction scope, hooks and native boundaries.
- [OpenCode integration reference](opencode-sdk-contract.md): pinned host interfaces and where the adapter uses them.
- [Beads artifact policy](beads-artifact-policy.md): what is and is not taken from upstream Beads, and the `bd` contract check.
- [Native release probe](native-release-probe.md): opt-in canary runbook for maintainers.
- [Compatibility evidence](compatibility-evidence.md): measured coverage and exclusions behind the current compatibility claims.

## Historical records

Archived OpenSpec designs explain past decisions. `docs/reviews/`, [`docs/history/`](history/),
and dated analysis, qualification and acceptance records describe their named revisions.
Follow those records to investigate a past decision, not to learn current operating
instructions. Preserve original verdicts and failures; link to a pinned Git revision
when a superseded report no longer needs a live path.
