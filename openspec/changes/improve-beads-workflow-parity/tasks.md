# Tasks

**STOP at the owner gate.** These are OpenSpec planning/conditional implementation tasks, explicitly requested for this package; they do not create Beads execution tracking. All product work below section 2 is blocked until Matt accepts dispositions, the package is revised and validated, and implementation is separately requested. Do not infer approval from artifact completeness or checked analysis tasks.

## 1. Completed planning evidence

- [x] 1.1 Inspect local source/tests/docs and pin upstream sources; deliver the full analysis and 73-file source inventory with all 29 commands, 15 resources and ADR represented and every owner disposition pending.
- [x] 1.2 Correct the historical parity scope and V2 command-surface conflation without replacing prior evidence; verify the changes are limited to docs and this OpenSpec package.
- [x] 1.3 Validate the change strictly, report the empty canonical baseline honestly, programmatically verify source-inventory coverage and inspect tracked/new-file whitespace and protected-file hash; record exact outcomes in the planning handoff.

## 2. Owner decision gate and planning revision — required before product work

- [ ] 2.1 Present the complete decision packet to Matt: F01–F12, every command/resource/ADR, D01–D06 and E01–E06. Record accept/adapt/defer/exclude dispositions, rationale, ownership, extension/default model and approval evidence/date/reviewed revision; verify no selected or excluded capability relies on implied consent.
- [ ] 2.2 Resolve native delivery and minimum-host compatibility choices for the selected features using targeted source/fixture evidence; if verification needs execution beyond planning authorization, obtain that authority first. Deliver selected mappings and any compatibility limitation, not a guessed API assumption.
- [ ] 2.3 Revise proposal, deltas, design, inventory and the conditional tasks to the accepted scope, replacing alternatives with concrete mappings and splitting selected implementation work into reviewable steps. Re-run strict validation and coverage checks; verify deferred/excluded surfaces are explicit and no longer appear as implicit implementation obligations.
- [ ] 2.4 Verify an explicit subsequent implementation request and applicable store authorization exist before starting section 3. If either is absent, stop with the gate record; do not run bd or remove MIGRATION-FREEZE as part of planning.

## 3. Conditional selected workflow delivery

- [ ] 3.1 Implement the selected guidance/skill/resource route after section 2, preserving upstream-owned shared skill and local authority. Add focused discovery/resource-path and conflict tests and document triggers, ownership and update/removal; verify from the installed artifact, not only the source tree.
- [ ] 3.2 Implement only the selected command equivalents via the chosen native route; add argument, available-tool, attachment/delivery and collision/override tests as applicable. Document actual names and supported CLI semantics; verify every accepted command disposition maps to an entry or explicit equivalent and no stale MCP/version assumptions remain.
- [ ] 3.3 Implement ownership-preserving installation/update/removal only if a file-install route was selected; otherwise verify package registration/removal. Include changed-user-file and unrelated-artifact cases and user documentation; verify no silent runtime-config or shared-skill overwrite.

## 4. Conditional continuity, context and extension behavior

- [ ] 4.1 Implement selected checkpoint, memory-selection/retrieval and recovery guidance with reachable examples; add focused integration checks for those surfaces and document task notes versus reusable memory. Verify a failed approach and reusable discovery have distinct intended persistence paths without write quotas.
- [ ] 4.2 Implement the accepted freshness and context-conflict treatment, including withheld versus failed context, duplicate prime avoidance and preservation of distinct local policy. Add focused context/host/guard/instruction tests and recovery docs; verify holds cannot be bypassed by supplied fallback guidance.
- [ ] 4.3 Implement selected delegation/worker/permission/Luna extension dispositions, including semantic handoff and incomplete/closure evidence. Add routing/result/permission tests and document defaults/options; verify atomic requests and read-only graph analysis remain scoped, and model choice is not used as proof of parity.

## 5. Conditional integrated qualification and evidence update

- [ ] 5.1 Run appropriate repository typecheck, tests and package checks for implemented changes; run any authorized CLI contracts only in disposable fixtures. Record actual commands/results and compatibility versions; do not use this repository's held store as a test fixture.
- [ ] 5.2 Execute the representative behavioral scenarios in the decision packet with recorded installation path, host, provider/model and reasoning setting. Inspect durable records and fresh-session recovery, repeat uncertain cases proportionately, and report failed outcomes and confounds separately from deterministic checks.
- [ ] 5.3 Update scope/status and qualification evidence in docs and selected specs without claiming broader parity than measured. Revalidate the final change and affected canonical specs strictly; verify accepted dispositions are accounted for and pending behavior is explicitly identified before proposing completion.

## Workflow follow-up

- Beads execution tracking resumes only in a later authorized workflow after the applicable hold is resolved; no tracking store changes are part of this plan.
- Archive only after accepted implementation and qualification are complete and archival is requested. Keep rationale/source evidence in docs; synchronize only the touched behavioral contracts.
