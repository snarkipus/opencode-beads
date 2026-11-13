# Design

## Context

See proposal.md for motivation. Baseline is plugin 2.1.0 at `63386812c6b57b1e91e8f834c3240f22b418e1d8`. Reuse `/opt/data/research/opencode-2.3.0-plugin-impact/assessment.md` and its pinned `sources/2.3.0/` tree (OpenCode `a6b15d33daf6ab7d35569f6d711fdb630b9f04e7`); the comparison target was 2.2.7 `fedc6f208aa2bd54c1019227214568083f6380ad`. No upstream reinvestigation is needed.

`packages/core/src/tool/plugin/subagent.ts:18-55` returns a running session handle and has no background option. `session/execution/subagent-report.ts:74-127` admits reports with steer delivery and wakes the parent. `session/subagent-completion.ts:55-80` can format a running report while period metadata says completed. These are pinned source facts, not observations of our candidate on a running host.

The scheduled SDK run 43398899144 actually installed SDK 2.3.0 and passed 231 tests / 12,300 assertions, typecheck and package smoke; only its unreviewed-release gate failed. The current `src/host.ts` guard and package peer range still exclude 2.3. Native qualification remains future work.

## Goals / Non-Goals

**Goals:** preserve the existing integration through a small transport-wording/cue correction and measured report freshness, with a bounded support policy and representative qualification.

**Non-Goals:** no orchestration layer, polling, dispatcher, retry, report persistence, metadata-based snapshot restoration, replay redesign, history backfill, o66 remediation, new API/tools or upstream patches. Do not alter agent profiles, actor derivation, permission resources, claims, custody, cancellation machinery or Beads-owned storage semantics. Workflow snapshot lookup remains through native latest-compaction context; workflow-access's prohibition on relying on model-message metadata remains unchanged.

## Decisions

### Owner-selected support policy

The owner approved `>=2.3.0 <2.4` admission and exact 2.3.0 qualification. This drops admitted 2.2 and is a breaking support-policy change; independent spec review and parent acceptance precede separate implementation dispatch. Approval of this target is not authority to change the guard during planning. A minor-line ceiling follows the existing bounded policy and makes no tested-compatibility claim for future patches. Exact-only `2.3.0` admission is narrower but would require a guard/package update for every reviewed patch; no evidence currently justifies that extra restriction. No unbounded major range is proposed.

A neutral instruction (“reconcile actual child results/reports; a tool return alone is not completion”) and a neutral execute.after cue can preserve 2.2 blocking returns with negligible shared-code cost. However, advertising both `>=2.2.6 <2.4` would retain two native delivery semantics and a corresponding regression obligation. The existing 2.2 evidence predates this change. Retention is not required by the assignment, and no version switch or compatibility layer is needed for the recommended floor. Retention was not selected; no 2.2 regression campaign or dual-version layer is planned. The floor is recommended for the smallest qualification obligation, not because the SDK proves 2.2 cannot work.

### Smallest delegation adaptation

In `src/guidance.ts`, replace “normal blocking child return” with native launch acknowledgement and later idle reports. Clarify that the host's background transport is permitted for the already-authorized delegation, while additional workers, nested automation, follow-up work and parent continuation still require existing scope. Reconcile actor/session, evidence and acceptance on real reports; idle or completed-period labels do not close a task. Update the task-agent prompt's background wording consistently so it prohibits additional automation without contradicting its own native transport.

In `src/host.ts:488-495`, replace the unconditional “A child returned” cue with an acknowledgement-neutral cue: a subagent call finished; it may only acknowledge launch/follow-up; reconcile actual reports/results before relying on completion. Preserve lazy invalidation and next-request recovery, result immutability and no prompt/restart calls. Do not parse result metadata into a task-completion decision. A neutral cue is smaller than separate success/failure/version machinery and remains honest for tool errors and old blocking returns.

The report itself remains native host input. No plugin receipt collection, message copying, synthetic notification or event-to-write conversion is introduced. Existing persistent guidance already asks for current task/knowledge at child handoff; make its applicability to actual reports explicit. Adjust the nearby CODE_MODE resource's “child returns” wording only as necessary to agree.

### Report freshness must be measured on the actual path

`src/host.ts:502-513` invalidates cached prime on parent execution start. That covers the expected idle-parent wake path, but does not establish freshness for a report steering a parent already executing. The launch-time invalidation is not proof of report-time freshness: the parent can consume that refresh before the child changes durable state.

Use the existing context hook/controller and permissioned task/knowledge reads. Qualification must capture a real report and the subsequent parent request/readback against a known authorized durable checkpoint, including a parent that remains active. Verify that stale cached prime is refreshed where needed, or its freshness limitation is disclosed and current relevant state is obtained before reliance. Guidance alone and manually firing execution.started in a fixture are not evidence that native report delivery does this. If the check demonstrates stale reliance, stop the affected acceptance and return the precise gap for disposition; any correction must use an established supported request/event seam, with a focused test, not invent a report event or metadata detector. No speculative invalidation framework is planned.

### Existing responsibility boundaries remain sufficient

Retarget the Native trigger and semantic responsibility separation scenario from “selected 2.2 host” to “selected host”, and the Documented snapshot-recovery deficiency scenario from “current 2.2 integration behavior” to “current 2.3 integration behavior”. These are wording-only support-policy consequences: no metadata simplification, replay-semantic change or o66 resolution.

Apart from that wording-only retarget, the work-continuity delta modifies Delegated knowledge and closure evidence, retaining both scenario identities and adding two consolidated cases. Native trigger and semantic responsibility separation, Honest persistence acknowledgement and Typed daily-loop composition already govern stop, semantic judgment and uncertain writes. Workflow-access's Child result arrives after stop remains controlling without duplication or relaxation. A native wake after a report is transport activity, not authorization to resume stopped task work. Distinguish explicit child cancellation from stopping the parent; do not promise a cancellation cascade.

The Code Mode VM-only engine and cooperative context.signal settlement merit representative checks, not adapter redesign. Keep the eleven JSON tools, per-operation permission checks, actual executor attribution and combined invocation/plugin cancellation. Reuse `tests/continuity.test.ts` started-abort and post-approval cancellation cases and `tests/host.test.ts` uncertainty/recovery cases.

## Representative qualification design

The following is the original probe design. The owner subsequently accepted the measured subset and deferred repeated idle reports with the same work outstanding and cancellation while the real bd process is executing. Both remain unexecuted, not passed; no runtime guarantee changed. See the [qualification decision and rationale](../../../../docs/opencode-23-qualification-xwq.md), which supersedes only the further-execution obligation for those two cases. The observed cancellation seam was a real landed write followed by interrupted acknowledgement, not mid-CLI termination.

All checks below require separate future dispatch. Use one authorized exact 2.3.0 disposable host and one available owner-selected model route, with existing approved authentication. Do not access operator hosts/Zeus/services, copy credentials or create auth profiles. Do not create synthetic records in the live project tracker. Writes require a separately authorized existing work item with meaningful evidence, or an expressly disposable isolated tracker; if neither is authorized, report the blocked write check rather than fabricate live work.

1. **Delegation/report lifecycle:** one bounded authorized child assignment, with observed launch handle, later real report, parent request/context and current state readback. Exercise both idle-parent wake and steering an active parent in the same bounded sequence. Include a later idle report with outstanding work; reconcile durable evidence and keep acceptance incomplete. Explicitly stop the child and separately observe a parent stop/late report, retaining incomplete status without plugin resumption, new work or closure. Preserve exact parent/child session identities, actual actors, claim readback and custody; a test transcript is not tracker acceptance.
2. **VM composition and cancellation:** discover the native beads namespace and compose a representative read (find then get returned IDs), observing actual permission identity and declared outputs. Use the existing started-write cancellation seam for one authorized checkpoint, then current durable readback before any further write. Record whether the write landed, failed, or remains uncertain; do not force an ambiguous outcome or retry merely to obtain a desired result. If cancellation timing never exercises the uncertain branch, mark that evidence incomplete. Record explicit child stop separately from outer execute cancellation.

Record exact plugin candidate, host, SDK, Beads and model/effort identities; input/launch/report/request/readback evidence; granted/denied permissions; stop action; actual observations and unresolved gaps. SDK/fixture evidence and native/model evidence receive separate verdicts. This is a representative sample, not a reliability or cross-provider claim.

## Risks / Trade-offs

- Dropping 2.2 affects existing consumers → the owner selected this floor; preserve existing exact pins and explain operator-owned migration.
- Active-parent reports may bypass the current cache invalidation timing → verify the actual next-request/readback path; disclose a demonstrated gap and stop affected acceptance instead of adding speculative event handling.
- Period status can look like task completion → use report content and durable acceptance evidence, never status-only closure.
- Host cancellation timing can leave write outcome unknown → preserve existing uncertainty and readback, with no blind retry or cascade promise.
- SDK success can mask native incompatibility → keep evidence classes separate and do not advertise native qualification before measured acceptance.

## Migration Plan

Planning changes no product, pins or reviewed marker. After explicit package/support-policy acceptance and separate implementation dispatch, align the guard, peer range and intended SDK typing pin with the chosen policy; update only current references and affected packaged guidance/tests. Consumer plugin pins, `.opencode/opencode.json`, runtime installations and `.github/opencode-reviewed-version` stay unchanged absent their own owner disposition. Record new native evidence rather than rewriting dated 2.2 records. Publication/versioning and operator host upgrades are separate work. Consumers remaining on 2.2 retain their previously qualified exact plugin pin; no automatic rollback, database migration or installation change is promised.
