# Tasks

This archived checklist records accepted implementation scope. All task IDs were independently accepted before archival; executor-facing dispatch and unchecked-marker instructions below describe the historical workflow, not pending work. Beads record `opencode-beads-aoy` owns task IDs **1.1, 2.1, 2.2, 2.3 and 3.1**; subsequent owners are mapped in their sections. Live execution status remains in Beads.

## Apply-wide proportionality boundary

- Reuse existing runner, guard, context cache, instruction minimizer, command callback/snapshot and cleanup paths. The only planned new production module is the small `src/diagnostics.ts`; two collectors and a renderer do not authorize a generic check registry or plugin framework.
- Production edits are limited to the named seams in tasks 2.1–2.3. Beads storage/schema/routing, OpenCode SDK/permission internals, authentication, service management and remote transport are verification-only and must not be modified.
- Keep observations as bounded fields on existing per-session state. No new persistence, polling, background workers, dependencies, model calls or public commands.
- Reuse existing unit tests and the CLI contract entrypoint. Cover shared failure behavior with representative cases, not a hooks × versions × context states × host modes matrix. Native qualification is the two minimal fixtures in 1.1, not an integrity or performance campaign.
- Reuse unchanged qualification receipts at final acceptance; repeat only checks invalidated by the implementation delta. The cheap existing full suite/typecheck/package gate remains required, without adding a new live host/model campaign absent a demonstrated need.
- Stop before widening this edit boundary or building new test infrastructure. Report the concrete missing capability and smallest proposed extension for owner disposition; a task's verification clause is not permission to redesign an adjacent subsystem.

## 1. Qualify the bounded native contract

- [x] 1.1 Qualify the exact diagnostics probe paths and scoped metrics/OTel suppression at Beads 1.3.1 and pinned 1.3.4 in minimal disposable embedded fixtures with isolated HOME/config/cache and no remote or operator stores. Capture version/context/hook-list argv, JSON keys/exits, absent hooks and native `--beads` layout, before/after membership/hashes, and scoped suppression with a tiny isolated queued-metrics fixture. Verify the existing 1.3.1 context-absence contract and source paths, including startup/tail effects; do not equate hashes with proof of no network. Extend only relevant `scripts/bd-contract.ts` assertions and pinned reference facts in `docs/beads-artifact-policy.md` as needed. Deliver actual receipts and a pass/blocker verdict before enabling the collector; stop for owner disposition if preserving no-store/no-config/no-network behavior needs a new policy, CLI floor, upstream patch or deeper probe.

## 2. Implement observations and captured reporting

- [x] 2.1 After 1.1 passes, add `src/diagnostics.ts` with the two collectors, finding model, qualified hooks/context/witness observations and bounded local reads; preserve existing plugin registry/capability/persistence evidence. Add the smallest optional child-env overlay in `src/prime.ts` and diagnostic-only wiring in `src/host.ts`/`src/guard.ts`; leave ordinary full prime, typed execution and admission unchanged. Verify actual collector/runner argv and environment forwarding, boundary parsing and partial failures with focused tests: no/foreign/shim/outdated hooks, match/differ/missing witness, malformed output and timeout, omitted remote secrets, no store/network fallback. Document the qualified collection boundary and native effects in `docs/user-guide.md` alongside this work.

- [x] 2.2 Extend `src/context.ts`/`src/guard.ts` with successful-load time and preceding CLI-version provenance; extend `src/instructions.ts` and existing `src/host.ts` request observation with bounded latest counts and per-rebuild skill-collision evidence. Verify exact-body reduction preserves customized/unmarked text, full/minimal/Codex and duplicate block counts, root-file vs request scope, shared-skill missing/unreadable/effective coexistence, absent vs loading/empty/failed/withheld cache, version-change evidence, typed invalidation, and forget/location/unload cleanup. Update user guidance for these limits; do not add request-time I/O or health scans.

- [x] 2.3 Wire the deterministic renderer through the real registered diagnostics callback and `src/workflows.ts` v1 captured-report path. Keep command inventory/descriptions, compact exact free text, attachments/delivery and model-relay limitations. Verify prioritized two-module output, action effect/verification wording and a concise limits line with fixed-observation snapshots; exercise the real command dispatch and replay so collection occurs once, no late prompt follows unload, overrides retain precedence and findings never produce admission holds or repeated context notices. Update diagnostics help prose in README/user guide and `docs/opencode-sdk-contract.md` where the delivery description changes, without inventing a direct host-rendered UI.

## 3. Integrate and return for parent acceptance

- [x] 3.1 After 2.1–2.3, run `bun run typecheck`, `bun test`, `bun run test:package`, the extended native contract check against the exact qualified versions, strict change/canonical validation and whitespace checks. Inspect requirement/scenario coverage against this delta, especially both supplied operator cases, no marker gate, full native prime/memories, current permissions/actors/cancellation and unchanged CLI/host support. Deliver an evidence-backed candidate and any demonstrated blocker for explicit parent acceptance; no test result alone authorizes canonical synchronization, archive, closure, release or rollout.

## Requirement coverage

| Delta requirement | Implementing/qualifying task IDs | Acceptance |
| --- | --- | --- |
| Read-only native diagnostics (full modified block, all original scenarios retained) | 1.1, 2.1, 2.3 | 3.1 |
| Actionable observational health report | 1.1, 2.1, 2.3 | 3.1 |
| Managed guidance and skill visibility | 2.2, 2.3 | 3.1 |
| Context observation provenance | 2.2, 2.3 | 3.1 |

The dependency order is 1.1 → 2.1 → 2.2 → 2.3 → 3.1. They share one deliverable and acceptance boundary; separate tickets per check or document would duplicate this checklist. Each task has one mapped Bead owner, with no implementation assignee selected during planning.

## Workflow follow-up

- Parent/owner independently accepts this planning candidate and explicitly dispatches the blocked implementation record before task 1.1 begins; closing the planning record does not supply dispatch.
- After implementation acceptance, parent/owner separately authorizes canonical spec synchronization and archive. Keep the full modified requirement block and original scenario identities during that integration.
- Parent controls tracker closure/synchronization. Versioning, publication and operator rollout require separate authority and are not implementation task IDs here.

## 4. Compact presentation follow-on (opencode-beads-30e only)

The original five completed task lines above are retained as accepted history. The owner-authorized presentation amendment supersedes their old normal-output footer wording without rewriting those historical task descriptions. Only opencode-beads-30e owns new task IDs 4.1, 4.2 and 4.3; live execution and acceptance remain in that Bead.

- [x] 4.1 Reconcile the existing proposal/design/delta with the accepted compact normal-plus-details presentation, membership truncation and Recorded bd naming; preserve original requirement/scenario identities and completed task lines, strictly validate the change and all three canonical specs before production edits, and record exclusive task mapping on 30e.
- [x] 4.2 Implement fixed compact Markdown identity/tables and assessed-check severity/coverage in existing diagnostics.ts, expose existing membership truncation in host.ts, and pass invocation text through the existing workflows.ts callback for deterministic details selection and one-time capture. Preserve collectors/native paths, exact input/delivery, replay, overrides and cancellation; update directly affected existing tests/smoke/docs with focused real renderer/callback RED/GREEN cases.
- [x] 4.3 Run isolated typecheck, full tests, exact package smoke, strict change/all-canonical specs and whitespace checks; return representative normal/details captures, baseline-relative hashes, decision/spec/task/source/test mapping and limits for parent acceptance, leaving these new markers unchecked and all original markers unchanged. Reuse unchanged native qualification and operator evidence; no new native or live campaign.

## 5. TUI polish and static help (opencode-beads-5gb only)

Only opencode-beads-5gb owns 5.1–5.3. Original 1–3 and accepted 4.x lines/checkmarks remain unchanged. Parent acceptance, quick Claude QC and closure are separate; the executor leaves these markers unchecked.

- [x] 5.1 Concur with the accepted TUI concept using current source, reconcile proposal/design/delta for short labels, neutral headings, separate footer paragraphs and static help, and strictly validate the active change and all three canonical specs before production edits.
- [x] 5.2 Implement cohesive renderer/callback/snapshot changes, self-contained static help and focused diagnostics reference with directly affected docs/tests/package smoke. Exercise real seams RED/GREEN for markers, clipping vs membership, exact selectors, unchanged literal history/delivery and help skipping collection/replay; preserve native collectors, inventories and responsibility boundaries.
- [x] 5.3 Run isolated full tests, typecheck, exact package smoke, strict change/all-canonical and whitespace gates including new files; return fixture normal Zeus/VPS, details/help artifacts, baseline-relative complete membership/hashes, source/test/spec mapping and actual session evidence for parent acceptance and quick Claude QC. Reuse unchanged native receipts; no operator/config/publication changes.

## 6. Report template boundaries and header metadata (opencode-beads-c4a only)

Only opencode-beads-c4a owns 6.1–6.3. All eleven accepted 1–5 task lines/checkmarks remain unchanged. The new header supersedes prior footer wording in operative clauses; accepted task history is retained. Parent owns independent acceptance, new markers and closure; executor leaves these unchecked.

- [x] 6.1 Amend the existing proposal/design/workflow-access delta for exact code-populated DATE/VERSION/native root PATH below the title, finished report delimiters and real separator bytes, preserving identities and accepted tasks; strictly validate the active change and all three canonical specs before production edits.
- [x] 6.2 Implement the bounded renderer/workflow framing change and directly affected docs/tests/package smoke. Exercise real renderer/callback/snapshot RED/GREEN for header order/root/missing root, literal populated report and framing, exact inputs/delivery, normal/details/help, once/idempotent replay, old snapshots and unload; use installed OpenCode 2.3 OpenAI Chat serializer on actual expanded messages to prove separated report/invocation without changing generic payloads or native paths.
- [x] 6.3 Run isolated focused/full tests, typecheck, exact package smoke, strict active/all-canonical and whitespace gates including new files; return labeled normal/details/help fixture Markdown, captures/serialized sample, complete baseline-relative inventory/hashes and source/spec/task/test map with actual executor/session and limits. Reuse unchanged native receipts; leave c4a assigned/in_progress for parent acceptance, without closure or a new reviewer/canary.
