# Proposal

## Why

OpenCode 2.3.0 acknowledges subagent launches immediately and delivers later, possibly repeated idle-period reports. The plugin currently excludes 2.3 and incorrectly asks for blocking return and announces a child return at launch; passing SDK fixtures does not qualify that native behavior.

## What Changes

- Target exact 2.3.0 native qualification and correct launch/report/accepted-completion guidance while preserving scope, actors, atomic claims, custody, permissions, parent acceptance and uncertain outcomes.
- **BREAKING (owner-approved support target):** use a 2.3 floor with bounded `>=2.3.0 <2.4` admission, replacing `>=2.2.6 <2.3`, and qualify exact 2.3.0. Later admitted patches are not described as tested. Spec review and parent acceptance remain prerequisites to implementation dispatch.
- Remove the unconditional child-return cue at native launch; verify freshness when a real report wakes or steers the parent. Host transport remains host-owned and grants no additional or nested work.
- Qualify representative native delegation, VM namespace discovery/composed read, and cancellation/uncertain-write readback after separate execution authorization.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-access`: explicit bounded support target/admission policy and wording-only retarget of the documented snapshot-recovery deficiency.
- `work-continuity`: clarify launch acknowledgement, repeated idle reports and evidence-based acceptance within delegated knowledge and closure evidence; retarget the native replay scenario to the selected host without changing replay behavior. Existing transport/semantic separation, stop and persistence rules remain controlling.

## Qualification disposition

The owner accepted bounded native qualification with two cases deferred and unexecuted: repeated idle reports while the same work remains outstanding, and cancellation while the real bd process is executing. The [qualification decision](../../../../docs/opencode-23-qualification-xwq.md) records evidence, cost rationale, residual uncertainty and revisit triggers. Neither case is labelled passed; behavioral guarantees and publication boundaries are unchanged. No further timing campaign is selected.

## Impact

Future implementation is limited to delegation wording in `src/guidance.ts`, the subagent cue/freshness seam and admission guard in `src/host.ts`, affected tests, and consistent compatibility references/package declarations after policy acceptance. Shared lifecycle and typed-tool mechanisms remain intact. Existing SDK 2.3 evidence (231 tests / 12,300 assertions, typecheck and package smoke) is reusable fixture evidence, not native qualification.

Planning leaves product files, pins, reviewed-release marker and canonical specs untouched. No implementation epic or Beads derivation before acceptance. No metadata-based snapshot restoration, replay changes, o66 resolution, history recovery framework, new API/tools, polling/dispatcher/retry/report store, upstream patches, installs, operator/service/auth access, model runs or release activity. Parent owns acceptance, synchronization, custody transfer and closure.
