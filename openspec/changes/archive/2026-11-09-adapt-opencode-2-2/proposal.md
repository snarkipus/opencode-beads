# Adapt to OpenCode 2.2

## Why

OpenCode 2.2.6 no longer forwards stored user metadata into model-request messages, breaking beta.5's compact workflow expansion if its version guard is widened. Native direct-tool fallback also makes its capability guidance incomplete. Repair these concrete seams without redesigning the integration.

## What Changes

- **BREAKING:** select OpenCode 2.2.6 as the qualification target and `>=2.2.6 <2.3` as the proposed admission window; retire 2.1 support rather than add a compatibility layer.
- Preserve compact invocations and stored instruction snapshots; resolve snapshots through the released native current-context API instead of relying on model-message metadata.
- Describe the actual request's composed, direct-typed and shell capabilities, retaining existing permissions and actor identity.
- Document snapshot recovery after native compaction/model switching as an unresolved plugin deficiency with upstream API blocker [#57424](https://github.com/anomalyco/opencode/issues/57424), tracked in `opencode-beads-o66`. Disclose it in the README; accepting it for a release does not mean fixing it.
- Update SDK/test APIs and add coverage of history-to-request lowering, followed by representative installed-host qualification.
- Prepare for stable plugin 2.0.0 with clear migration guidance and existing version pins left available. Publication and operator upgrades remain separately authorized.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-access`: host admission, durable snapshot expansion, diagnostics, user-visible deficiency disclosure and permission-aware native tool availability.
- `work-continuity`: describe retained summary/native replay against the selected host contract rather than 2.1-specific field names.

## Impact

Expected edits are in workflow/context wiring and capability guidance, their tests, SDK/admission declarations and current installation documentation. Keep all 30 commands, eleven typed operations, command semantics, resources, agents, attribution, cancellation and upstream-owned Beads behavior.

Excluded: scheduled source monitoring (`opencode-beads-rou`), changes to Beads minimum 1.3.1, new operations, automatic checkpoints/continuation, persistent queues, host/provider patches, GUI work, and wholesale adoption of instruction-entry or idle APIs. This package authorizes planning only; no implementation, release or deployment.
