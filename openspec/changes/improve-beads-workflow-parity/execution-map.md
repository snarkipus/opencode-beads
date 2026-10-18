# Execution map

Epic **`opencode-beads-vuy`** maps accepted candidate `84ab18e76be43f9a733bd799c5a506fed03ce7f6` on `openspec/improve-beads-workflow-parity`. This is a review index into actual Beads records, not a second tracker. [Pinned tasks](https://github.com/snarkipus/opencode-beads/blob/84ab18e76be43f9a733bd799c5a506fed03ce7f6/openspec/changes/improve-beads-workflow-parity/tasks.md), [design](https://github.com/snarkipus/opencode-beads/blob/84ab18e76be43f9a733bd799c5a506fed03ce7f6/openspec/changes/improve-beads-workflow-parity/design.md), [owner selections](https://github.com/snarkipus/opencode-beads/blob/84ab18e76be43f9a733bd799c5a506fed03ce7f6/openspec/changes/improve-beads-workflow-parity/owner-decisions.md), [requirement coverage](https://github.com/snarkipus/opencode-beads/blob/84ab18e76be43f9a733bd799c5a506fed03ce7f6/openspec/changes/improve-beads-workflow-parity/reconciliation.md) and the [preserved review](../../../docs/reviews/opus-planning-review-50919ae.md) remain authoritative. No product choices or source pins changed.

## Authority and current status

One epic and nine children were created with bd 1.3.1 using `--sandbox` on every write. Every new record is **blocked**, unassigned, with **implementation_authorized=false**. The block is current execution authority, distinct from dependency readiness: even a future `bd ready` result is not dispatch permission. Only parent-reviewed explicit implementation scope may unblock/claim a child. Dependency-edit authority, disposable-host installation/access, model access and release authority are separate. Nothing was claimed, implemented or closed; all 13 OpenSpec markers remain unchecked. Planning `opencode-beads-d9n` remains in_progress with an appended mapping note. Deferred historical `opencode-beads-hgo` and its children were not reused or modified.

## Exclusive task ownership and blocking graph

Each task appears exactly once in the ownership column. Prerequisites point from the dependent to records that must finish their scoped source or qualification deliverable. Parent-child edges are structural, not authorization; the epic has a discovered-from link to d9n.

| Actual child ID | Owned OpenSpec tasks | Deliverable | Blocking prerequisites |
| --- | --- | --- | --- |
| `opencode-beads-vuy.1` | 1.2 | types | none |
| `opencode-beads-vuy.2` | 1.1 | host | `opencode-beads-vuy.1` |
| `opencode-beads-vuy.3` | 2.1 | assets | none |
| `opencode-beads-vuy.4` | 3.1, 3.2 | continuity | `opencode-beads-vuy.1` |
| `opencode-beads-vuy.5` | 2.2, 3.3 | package | `opencode-beads-vuy.1`, `opencode-beads-vuy.3`, `opencode-beads-vuy.4` |
| `opencode-beads-vuy.6` | 4.1, 4.2 | flow | `opencode-beads-vuy.3`, `opencode-beads-vuy.4`, `opencode-beads-vuy.5` |
| `opencode-beads-vuy.7` | 5.1 | drift | none |
| `opencode-beads-vuy.8` | 6.1 | integration | `opencode-beads-vuy.5`, `opencode-beads-vuy.7` |
| `opencode-beads-vuy.9` | 6.2, 6.3 | acceptance | `opencode-beads-vuy.2`, `opencode-beads-vuy.6`, `opencode-beads-vuy.8`, `opencode-beads-vuy.5` |

Types precede host probes and continuity. Assets and drift have no blocking prerequisites; neither waits for a live host. Continuity groups adapter and context fixtures; package delivery groups registration and lifecycle; task flow groups guidance and child handoff; final acceptance groups installed behavior and measured documentation. This grouping deliberately avoids one ticket per checkbox or approval gate. Shared src/host.ts and guidance edits must be coordinated by these owners, not duplicated.

## Partial contribution versus completion

`opencode-beads-vuy.6` exclusively owns 4.2. After 4.1 and 3.3 deterministic evidence, it records the tested source revision, exact passing child-handoff fixture commands/results and explicitly pending live checks in its Beads notes. Parent verifies this contribution before dispatching `opencode-beads-vuy.8` for 6.1. The `related` edge from .8 to .6 records that evidence relationship; it is intentionally not a completion-blocking edge. The contribution is currently **not_started**, with no evidence. It does not complete 4.2 or close .6. Relevant source edits invalidate the contribution and require rerunning affected checks.

The .6 live subphase additionally waits for successful .2 (1.1) and separately authorized disposable-host/model access. Because that gate applies only to its live subphase, there is no whole-child .6 → .2 blocking edge to serialize source fixtures. .9 has real blocking dependencies on .2, .6 and .8 (and package .5): 6.2 cannot run until 1.1, all of 4.2 and 6.1 pass; 6.3 follows 6.2. No task ownership is shared or split across tickets.

Source/fixture delivery in .4 and .5 is not live activation acceptance. Their source contributions may finish without a host, but the 1.1 activation boundary in tasks 3.1/2.2 remains operative and is consumed by .9. No source child closure or merged code can assert N1/namespace activation or end-to-end parity. OpenSpec acceptance must retain those unresolved gates until measured qualification passes.

## Acceptance boundaries and gates

All records carry exact task text with edit/test/doc seams, minimal changes, stop conditions, immutable planning/spec URLs and requirement contributions. Complete corpus ownership remains 29 commands plus status, 15 resources plus ADR, with historical 73/current 74 member dispositions intact. All 17 normative requirements map through the existing task coverage to these owners; the exported check also maps discovery, commands, task flow, context, persistence, recovery, delegation, approvals, diagnostics, lifecycle and drift to owned tasks.

Live 1.1/4.2/6.2 requires a separately authorized isolated disposable **exact OpenCode 2.0.32**, source `843a6c514e606b436a7fe713422ace0a93ad3d61`, within selected `>=2.0.32 <3`, plus required model/provider access. Operator 2.0.29 stays untouched. The selected marketplace-main pin remains `4a67d0d0288c1b4ee23e17fc896f47616931ba2d`; historical Beads remains `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`. Missing live access gates qualification, not unrelated source work. No installation or runtime-upgrade authority follows from dependency preparation.

Epic closure requires measured end-to-end results, full requirement/corpus coverage and no unresolved selected guarantees. Resource access must honor ask/deny; user-command collisions cannot overwrite customizations; saved approvals stay narrow; compaction stays reference-only; exact assignments stop while authorized batches may continue. Unreviewed drift fails a distinct check with separate retrieval errors. No quotas, fake-host assertions or architecture alone establish behavioral acceptance. Stable maintenance strategy is a release gate before compatibility changes reach stable main, not a new source-work blocker. Publication/archive/tracker closure remain separately authorized.

## Review packet and verification

Actual full epic/child records (descriptions, acceptance, metadata, notes and dependencies), planning note, mapping and lint/readiness snapshots: `/opt/data/cache/scratch/opencode-beads-epic-map-records.json`. Reproducible programmatic check: `/opt/data/cache/scratch/opencode-beads-epic-map-check.json`; results: `/opt/data/cache/scratch/opencode-beads-epic-map-check-results.json`. These snapshots let parent/Claude review without opening the store.

Verification results are recorded in the scratch report: exact task-set equality and unique ownership, expected ten new scoped IDs, blocking/structural acyclicity and phase-order checks, 17 requirement and full corpus coverage, objective coverage, scoped lint, strict OpenSpec change/all validation, planning validator and whitespace including this map. Protected setup hashes are checked against the supplied preservation manifest. The mapping worker performed no synchronization or publication. Parent readback verified all ten exact records remain blocked, unassigned and implementation-unauthorized. The [independent Claude cross-check](../../../docs/reviews/opus-epic-map-review-vuy.md) returned **READY**, with no material corrections. Parent owns subsequent publication and synchronization. Treat .6 as the authoritative deterministic-handoff evidence record; .8 references that evidence and must remain blocked until the parent verifies it, regardless of graph readiness. Any copied handoff summary is non-authoritative. No runtime acceptance or implementation dispatch follows from this review.
