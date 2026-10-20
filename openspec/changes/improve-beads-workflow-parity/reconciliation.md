# Planning reconciliation — 2026-10-18

**Current verdict: READY for review of the 2.1.1 planning delta; PAUSED FOR REVIEW.** The older reconciliation and independent reviews below are historical evidence, not approval of this new baseline. This is the planning agent's assessment, not independent reviewer approval, implementation acceptance or publication authority. Original baseline: `3dc2ea327ed490ceb9cf0b95c31af77631613287`; final correction candidate: `50919ae0f6b192bb8c2773398685c550fdaad22f`, branch `openspec/improve-beads-workflow-parity`. The planning bead `opencode-beads-d9n` remains open; no Beads commands were run.

## Decisions applied

| Owner selection | Operative artifacts |
| --- | --- |
| Complete marketplace-main reference | Proposal What Changes; analysis Selected marketplace-main reference; local-reference Reconciled comparison; inventory `marketplace_main`; upstream-review Relevant upstream source comparison |
| N1, OpenCode >=2.1.1 <2.2; exact 2.1.1 target | Design decisions 1/3/4; workflow-access Explicit native availability and fallback and Restricted-agent typed operation boundary; tasks 1.1–1.2, 3.1–3.2 |
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
| F2: typed visibility/identity/save/external access | Design decision 3; workflow-access Restricted-agent typed operation boundary; native Lifecycle and alternatives. Released S05 filters `options.permission`; S15 uses invocation agent and saves only nonempty save lists; S18 checks external directories before shell permission. Fixed argv, shell permission category, context.agent, absent new saved grants, guard and location checks are explicit. | Direct/code-mode restricted agents, selective deny, ask/reject, saved grant, external target and post-approval cancellation fixtures/live checks (1.1, 3.1) |
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
| workflow-access | Owned installation and user customization | 2.2, 3.3, 6.1, 6.2 |
| workflow-access | Scope-preserving execution and visible failure | 3.1, 4.1, 4.2, 6.2 |
| workflow-access | Explicit native availability and fallback | 1.2, 1.1, 3.3, 6.1 |
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

## Original reconciliation validation boundary

At the original reconciliation (published as 50919ae), executed: `openspec validate improve-beads-workflow-parity --strict --no-interactive` passes; `openspec validate --all --strict --no-interactive` reports 1 passed/0 failed; `python3 docs/validate-parity-planning.py /opt/data/cache/scratch/parity-sources` passes historical/current identities, 41 native files in 21 source groups, published tarball integrity, complete member dispositions, 13 unique unchecked tasks and all 17 requirement mappings. `git diff --check` passes; validator whitespace/link checks include the untracked reconciliation record (17 planning files checked, 16 edited). Current OpenSpec status reports all four artifact kinds done; that is artifact presence, not semantic readiness. SHA-256 before/after comparison proves AGENTS.md and both .codex files byte-identical to turn start. Full change-set inspection found only the 16 authorized planning edits beyond preexisting operator setup, with no staged changes. No product tests, model sessions, database access, implementation, staging, commits, pushes or publication are part of this reconciliation.

## Final review corrections — candidate 50919ae

The [supplied independent review](../../../docs/reviews/opus-planning-review-50919ae.md) retains its **REVISE** verdict. Actual trace model: `claude-opus-5-5`; explicit medium invocation is parent-reported, not introspectable by the reviewer. The following is the planning agent’s correction assessment, not a second independent approval. No second full review was requested or required by that review.

| Finding / recommendation | Exact correction evidence | Future acceptance boundary |
| --- | --- | --- |
| B1 ordering and absent host | Tasks 1.2 → 1.1 prepares dependency/types first; 1.1 only minimal throwaway host tool/command probes; 3.1 retains adapter fixtures. Design decisions 3/6 and migration, SDK contract final paragraphs, validator B1 assertions and availability mapping above agree. Stable IDs remain unchanged. | Live 1.1/4.2/6.2 need a separately authorized isolated host pinned initially to 2.0.32 within >=2.0.32 <3; image 2.0.29 stays untouched. No environment is qualified. Source/assets/fixtures and 5.1 need not wait for it. |
| R1 collisions | Design decision 2; workflow-access ownership scenario; task 2.2; native Final review correction evidence. S13 supervisor ordered pre/packages/post and ConfigCommandPlugin post contradict the review’s blanket config-overwrite inference. Command editor still lacks conditional lookup. Preserve user entries; withhold affected names where possible, never accept overwrite as fallback. | Initial/rebuilt/disposed registry checks, including later config overrides; stop affected path if public APIs cannot meet preservation. No generic registry. |
| R2 full resource access | Design decision 2; workflow-access discovery scenarios; tasks 2.1/2.2/6.2; artifact policy. Future SKILL.md explicitly links all 15 resources plus ADR, with a narrow unpacked-package link fixture. S13 auto-listing truncates at ten. | Installed-base reachability, external_directory ask/deny and honest unavailable diagnostics in 6.2, with no permission bypass. |
| R3 saved approvals | Design decision 3; workflow-access Saved approval remains narrow; task 1.1; SDK/native evidence. save: [] creates no new saved rule; always can be one-call/repeated prompts. Existing shell bd * grants may authorize equivalent typed operations, subject to configured denies. | Minimal host approval probes in 1.1; adapter authorization/identity fixtures in 3.1, installed restricted behavior in 6.2. No convenience broadening. |
| R4 failed drift alert | Design decision 6; upstream-review check notification/repeated detection; task 5.1; artifact policy/native evidence. Unreviewed drift fails distinct check/job; drift and retrieval/comparison failures have distinct error diagnostics. | Later check fixtures/workflow acceptance only; workflow unchanged, no issues/writes. |
| R5 independent drift work | Task 5.1 no longer depends on 1.1; validator guards that edge removal. | Independently useful read-only source comparison can proceed under later implementation authority. |
| R6 stable maintenance | Design Migration Plan and artifact policy require settling stable 1.0.x maintenance branch strategy before prerelease compatibility changes reach stable main. | Release-gated decision, not present source blocker or new owner interview; no branch/release actions. |

The historical 73-member and current 74-member inventories/dispositions and all 17 requirement titles remain intact. Inventory changes only add four same-pin source identities for collision ordering and shell grant evidence (45 native files, 21 groups). Validator excludes only the installed cache’s non-payload `.in_use` marker, not any source file; all payload hashes/membership remain exact. The supplied review itself is included in whitespace/local-link validation.

**Correction verdict: READY for parent verification and separately authorized implementation.** B1 is corrected in the executable plan. No source or owner-selection blocker remains. Actual live acceptance is blocked by the absence of a qualified, authorized disposable >=2.0.32 <3 environment (and any required model access); later authority must provide it. Runtime/behavioral results are entirely unexecuted, all 13 implementation tasks remain unchecked, and concrete incompatible contracts still stop their affected paths. This verdict does not grant installation, implementation, publication or tracker authority.

### Correction validation results

Strict change validation passed; strict all-change validation reported 1 passed/0 failed. The planning validator passed all six groups: 73 historical files, 74 current files with complete dispositions, 45 pinned native files/21 groups, npm evidence, 13 unique unchecked tasks, all 17 requirement mappings, and whitespace/local links for 18 planning artifacts including the new untracked review. `git diff --check` passed. `openspec status --change improve-beads-workflow-parity` reports 4/4 artifact kinds complete; that is presence, not runtime acceptance.

Exact SHA-256 comparison against `/opt/data/cache/scratch/opencode-beads-reconcile-preserved-files.json` passed for AGENTS.md, .codex/config.toml and .codex/hooks.json, with no additional .codex files. Review body comparison confirms all supplied review substance is retained. Full changed-file inspection found 12 planning artifacts (11 edits and the new review), plus only the preexisting AGENTS.md/.codex setup. No staged changes; HEAD remains 50919ae0f6b192bb8c2773398685c550fdaad22f. No implementation, product tests, host/model experiments, installs/upgrades, Beads operations, commits or publication occurred.

## 2026-10-20 host-baseline delta

The [contract-delta memo](../../../docs/opencode-2.1.1-contract-delta.md) supersedes only the operative host baseline: 2.1.1 `ba546ec1598a70db2570e9c6258028d955ba8f58`, proposed admission >=2.1.1 <2.2. Historical 2.0.32 identities, inventory and passed reviews remain intact. Provider replay/compaction fields and retained history need fixture adaptation (1.2/3.2/6.2); released session.list remains unnecessary. Permission, registration, stop and unload contracts retain bounded qualification. No new services, compatibility layer, tasks or owners.

The 13-task/17-requirement map above remains exact. Existing epic vuy and .1–.9 remain blocked/unassigned/implementation_authorized=false; .6 owns deterministic evidence consumed by gated .8, and .9 still awaits complete live acceptance. Review URLs at 84ab18e/dd56cf1 are explicitly historical; this unpublished delta has a local content digest, not an invented commit. d9n remains open. Setup custody now uses committed 907232a, not the old dirty-file assumption.

Source retrieval and artifact integrity establish a source-backed planning baseline only. No actual 2.1.1 host compatibility is claimed. Live environment/model authority and all implementation authority remain absent; pause for parent/owner review after static checks and scoped tracker readback.
