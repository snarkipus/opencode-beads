# Planning reconciliation — 2026-10-18

**Verdict: READY for parent review and a separately authorized implementation workflow.** This is the planning agent's assessment, not independent reviewer approval, implementation acceptance or publication authority. Baseline: `3dc2ea327ed490ceb9cf0b95c31af77631613287`, branch `openspec/improve-beads-workflow-parity`. The planning bead `opencode-beads-d9n` remains open; no Beads commands were run.

## Decisions applied

| Owner selection | Operative artifacts |
| --- | --- |
| Complete marketplace-main reference | Proposal What Changes; analysis Selected marketplace-main reference; local-reference Reconciled comparison; inventory `marketplace_main`; upstream-review Relevant upstream source comparison |
| N1, OpenCode >=2.0.32 within V2 | Design decisions 1/3/4; workflow-access Explicit native availability and fallback and Restricted-agent typed operation boundary; tasks 1.1–1.2, 3.1–3.2 |
| Opt-in beta/next, no stable migration | Proposal breaking-change disclosure; design Migration Plan; workflow-access availability requirement; task 1.2; exact version/tag still separate release authority |
| Scope-bounded continuation | Design decision 5; workflow-access Authorized continuation without scope expansion; tasks 4.1–4.2 and 6.2 |
| Package-owned oc-beads and complete corpus | Design decision 2; inventory every selected_mapping; workflow-access discovery/ownership requirements; tasks 2.1–2.2 and 3.3; shared skill and user files preserved |
| Check-based upstream drift | Design decision 6; all upstream-review requirements; task 5.1; artifact-policy selected beta/next exception |
| Overall harness-native experience | Discovery → commands → task flow → contextual guidance → persistence/recovery → delegation/approval → diagnostics → unload are covered by design decisions 2–6 and tasks 2.1–4.2/6.2 |

F01–F12, D01–D06, E01–E06 and M01–M10/X01–X09 have explicit dispositions in analysis, design and inventory. All 29 command workflows and 15 resources plus ADR are mapped; advanced content is on demand, not excluded by prior defer recommendations. Host-specific/build/support members remain individually mapped evidence, not silently omitted payload. Historical recommendations and all 73 release blob/hash identities remain unchanged; new selected mappings are engineering reconciliation within the accepted groups.

## Opus review disposition

The [original review](../../../docs/reviews/opus-planning-review-e74b507.md) is preserved unchanged as a review of e74b507. Its REVISE verdict is not rewritten or claimed as approval of this reconciliation.

| Finding | Resolution and evidence | Acceptance still required |
| --- | --- | --- |
| F1: installed notes differ; stable-only target misses marketplace changes | Local-reference Reconciled comparison characterizes all 16 edits/one addition; analysis distinguishes current 74 from historical 73. GitHub main resolves to installed `4a67d0d…`; five guidance files use append-notes, but WORKFLOWS retains contradictory overwrite prose that the selected adaptation must correct. Upstream-review and task 5.1 now compare marketplace-main. No ancestry inferred from dates. Current memory/prime support differences are also characterized. | Supported CLI append retention and acknowledgement contracts (3.1, 6.1); actual notes/recovery behavior (6.2) |
| F2: typed visibility/identity/save/external access | Design decision 3; workflow-access Restricted-agent typed operation boundary; native Lifecycle and alternatives. Released S05 filters `options.permission`; S15 uses invocation agent and saves only nonempty save lists; S18 checks external directories before shell permission. Fixed argv, shell permission category, context.agent, empty/exact saved grants, guard and location checks are explicit. | Direct/code-mode restricted agents, selective deny, ask/reject, saved grant, external target and post-approval cancellation fixtures/live checks (1.1, 3.1) |
| F3: unreachable prepared-write compaction state | Design decision 4; work-continuity reference-only compaction scenario; native M03; task 3.2. Writes complete in typed calls; compaction adds only acknowledged references and known gaps. No queue, recursive same-runner prompt, semantic wait or permission escalation. Released S03 awaits callbacks without a generic timeout; S06 has separate summary/native preparation. | Reference-only behavior and honest unsaved status in both compaction paths (3.2, 6.2) |
| F4: GitHub review issues conflict with tracker policy | Upstream-review Check-based review notification; design decision 6; task 5.1. Existing read-only scheduled check pattern is the selected alert sink. No issue-write grant or external tracker. | Drift/error/repeated-output fixtures and later workflow check (5.1); workflow unchanged here |
| F5: cosmetic/provenance/organization | Analysis says three capability deltas; command/skill doc links use released `843a6c5…`; tasks remove obsolete freeze/tracker history; N2/X choices live under design decision 5. | Static validation below |

The review's N0-first recommendation is retained as historical advice; Matt explicitly selected N1. Its compaction and permission findings informed the selected design. No broad new research, monitoring service or speculative product smoke harness was introduced.

## Normative requirement coverage

The validator checks exact requirement titles, unique task IDs and complete mapping. Each row covers all scenarios under that requirement; 6.2 is behavioral evidence, not a replacement for the task-local fixtures.

| Capability | Requirement | Task IDs |
| --- | --- | --- |
| work-continuity | Meaningful progress checkpoints | 2.1, 3.1, 6.2 |
| work-continuity | Relevant reusable knowledge | 2.1, 3.1, 6.2 |
| work-continuity | Recovery from durable state | 3.2, 4.2, 6.2 |
| work-continuity | Delegated knowledge and closure evidence | 4.1, 4.2, 6.2 |
| work-continuity | Native trigger and semantic responsibility separation | 3.2, 4.2, 6.2 |
| work-continuity | Honest persistence acknowledgement | 3.1, 3.2, 6.1, 6.2 |
| workflow-access | Discoverable selected workflows | 1.1, 2.1, 2.2, 6.2 |
| workflow-access | Coherent context and authority | 2.1, 3.1, 3.2, 6.2 |
| workflow-access | Owned installation and user customization | 2.2, 3.3, 6.1 |
| workflow-access | Scope-preserving execution and visible failure | 3.1, 4.1, 4.2, 6.2 |
| workflow-access | Explicit native availability and fallback | 1.1, 1.2, 3.3, 6.1 |
| workflow-access | Restricted-agent typed operation boundary | 1.1, 3.1, 6.2 |
| workflow-access | Authorized continuation without scope expansion | 4.1, 4.2, 6.2 |
| workflow-access | Read-only native diagnostics | 2.2, 3.3 |
| upstream-review | Relevant upstream source comparison | 5.1 |
| upstream-review | Check-based review notification | 5.1 |
| upstream-review | Explicit baseline disposition | 5.1 |

## Source identities and genuine gates

- Selected marketplace main and installed reference: `4a67d0d0288c1b4ee23e17fc896f47616931ba2d`; 74 selected files, including 57 plugin files, 29 commands, 15 resources and one ADR. Read-only GitHub retrieval succeeded; no source blocker.
- Historical Beads v1.3.1: `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`; original 73-file evidence remains separately validated.
- Selected released OpenCode v2.0.32: `843a6c514e606b436a7fe713422ace0a93ad3d61`. Historical minimum v2.0.26: `9b4ec5714d481559990db0a816d5dec19541a814`. Development comparison only: `8f7b0120eb6b4aa3da1f82b1a9094a9fb4db2d06`.

No owner selection or source-retrieval blocker remains. Implementation has not been requested. Permission/external-target equivalence, collision/rebuild preservation, installed namespace dispatch and stop/late-child races are bounded technical acceptance gates, not proven guarantees. If a concrete incompatibility changes the selected contract, stop that path and report the smallest remedy; do not silently drop guarantees. Live/model recovery and note quality remain wholly unexecuted. Exact prerelease publication remains separately authorized work.

## Validation boundary

Executed: `openspec validate improve-beads-workflow-parity --strict --no-interactive` passes; `openspec validate --all --strict --no-interactive` reports 1 passed/0 failed; `python3 docs/validate-parity-planning.py /opt/data/cache/scratch/parity-sources` passes historical/current identities, 41 native files in 21 source groups, published tarball integrity, complete member dispositions, 13 unique unchecked tasks and all 17 requirement mappings. `git diff --check` passes; validator whitespace/link checks include the untracked reconciliation record (17 planning files checked, 16 edited). Current OpenSpec status reports all four artifact kinds done; that is artifact presence, not semantic readiness. SHA-256 before/after comparison proves AGENTS.md and both .codex files byte-identical to turn start. Full change-set inspection found only the 16 authorized planning edits beyond preexisting operator setup, with no staged changes. No product tests, model sessions, database access, implementation, staging, commits, pushes or publication are part of this reconciliation.
