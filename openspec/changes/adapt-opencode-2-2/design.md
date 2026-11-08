# Design

## Context

The [proposal](proposal.md) changes two concrete host seams. It reuses assessment `opencode-beads-tzq` and independent Sol/Astra findings; decisive source evidence and its limits are summarized here so review does not depend on machine-local artifact paths. The planning base is `f8db6a3e9c5b1804e18adb44bf6ba98b0ace1cb5`; its only runtime-assessment successor change is repository-local configuration.

Pinned OpenCode comparison: 2.1.3 `bb25a2f4a3f3f04d7c344bec0c0574ea3510b3b1` → 2.2.6 `dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06`. The existing SDK fixtures pass after two test-only AI API updates, but bypass the broken history projection. They are not host qualification.

## Decisions

### Keep durable snapshots; resolve them by native message identity

Continue writing version-1 `ocBeadsWorkflow` metadata through one ordinary prompt. During primary/compaction preparation, read `ctx.session.context({ sessionID })` once and match its durable user records to request user-message IDs. Expand only validated package snapshots into transient request copies; retain existing generalized-over-legacy precedence. Never reconstruct past instructions from current command definitions or mutate stored history.

Use the actual plugin API, not the wider standalone client: published SessionDomain includes `context`, but does **not** expose `session.message.get`. Its context result contains durable SessionMessage records, including user metadata. The [host binding](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/plugin/host.ts#L609) delegates to a read-only store-context load, not another model preparation. [User lowering](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/session/runner/to-llm-message.ts#L241-L254) retains the ID. Verify this whole chain on the installed host.

Use a request-local lookup only: one native current-context read, no per-message RPC loop, long-lived cache, pagination or full transcript scan. Move the existing location check ahead of snapshot lookup; check generation/cancellation afterward. Match only IDs exposed by published request types, without casts inventing an ID contract. Ordinary unmarked history remains ordinary input. Unresolvable workflow snapshots produce an explicit unavailable-guidance notice, not invented instructions or another prompt; recognizing a compact invocation for that diagnostic does not reconstruct its authority. If the read rejects, disclose unavailable snapshot guidance for identifiable workflow invocations, leave request content untouched and continue other applicable guidance rather than retrying admission or failing unrelated input.

Here, **accessible** means a durable user record present in the native latest-compaction context. After native compaction on model A, switching to model B that cannot replay A's native window can restore ordinary pre-compaction user messages to B's request, while this reader omits their stored snapshots. This is not restricted to opaque legacy windows. Preserve host replay content, expand accessible snapshots, and explicitly disclose unavailable instructions/reports for the affected historical commands. The expected qualification outcome for that precise case is **disclosed unavailable**, not restored snapshots or a silently passing restoration check. See the pinned [history boundary selection](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/session/history.ts#L45-L84).

Treat this as an **unresolved plugin deficiency with an upstream blocker**, not a solved upstream quirk. The owner selected explicit disclosure and follow-up rather than parallel storage. Task 1.1 must add README coverage of trigger, missing historical instruction/diagnostic context, unaffected Beads data and upstream [#57424](https://github.com/anomalyco/opencode/issues/57424). `opencode-beads-o66` remains blocked and unassigned; it does not gate this adaptation or stable release and cannot close merely because the limitation is accepted or an upstream PR merges. Revisit a released supported API, verify recovery, then update docs/specs. Prior [PR #49568](https://github.com/anomalyco/opencode/pull/49568) closed unmerged. No duplicate GitHub issue, polling service, backfill or side store is selected.

Alternatives rejected: casting metadata cannot restore dropped data; generated visible instructions regress the accepted UX; synthetic inputs, pending queues and durable side stores duplicate host lifecycle. Native keyed instruction entries are promising for stable context, but session-wide state is not a drop-in historical invocation snapshot and is unnecessary for this repair. Keep current guarded prime injection.

### Follow native tool availability

Retain the eleven definitions and their shell-equivalent permissions. Derive guidance from the actual request catalog: prefer native composition with `execute`; otherwise use exposed direct Beads leaves; use direct shell for supported advanced/fallback work only when independently available. Registration alone proves neither request visibility nor permission. Do not expose shell inside code mode or force direct registration to emulate host fallback.

The [2.2.6 snapshot](https://github.com/anomalyco/opencode/blob/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06/packages/core/src/tool.ts#L251-L318) supplies this fallback while retaining leaf permission filtering and actual invocation identity.

### One target, bounded acceptance

Use exact SDK/host 2.2.6 and proposed admission `>=2.2.6 <2.3`; Beads minimum remains 1.3.1. No 2.1 adapter or minimum/current host matrix. Update the removed AI Promise subpath and flattened `generate` API in tests. A projection-boundary regression must fail against beta.5 before the repair; hand-built metadata-bearing hook fixtures alone are insufficient.

Use normal cheap repository gates and one frozen installed candidate in an isolated host scenario set. Cover compact action/explanation and diagnostics, retained legacy/current history, primary/compaction versus title/generate, composed/direct/denied tools, actual worker identity and Stop/unload. Reuse unchanged command-purpose and argv coverage rather than replaying all 30 workflows with a model. Host-owned summary/native retention must be exercised; do not demand verbatim summary retention or universal whole-step termination after a declined inner operation.

## Edit boundary and stop conditions

Expected production edits: `src/workflows.ts`, `src/host.ts`, `src/guidance.ts`, with a small adjacent context/type adjustment only if required. Existing tests/package smoke, manifest/admission declarations and current compatibility/install docs change with those seams. `src/continuity.ts`, guard/database behavior, agent prompts and upstream monitoring are preservation/verification surfaces, not redesign targets.

Stop and revise the design if IDs present in the native latest-context read cannot resolve their snapshots, or the repair needs a new store, scheduler, upstream patch or transport interception. The specifically documented model-switch deficiency has the disclosed-unavailable outcome above, not a restoration guarantee. An unavailable provider/isolated runtime leaves qualification pending; it is not permission for auth/database copying, operator changes or another infrastructure project.

## Risks and migration

- Missing or stale history → disclose unavailable snapshots; never replay operations or recover authority by guessing.
- Lookup overhead → one read of native current context and a request-local ID map; no persistent cache or benchmark campaign.
- Native permission/compaction behavior differs → preserve original observations and record actual target outcomes, distinguishing host limitations from adapter failures.

No Beads data migration, config rewrite or historical-message backfill is needed. Preserve existing exact beta/stable pins; a separately approved plugin 2.0.0 release can move `latest` after qualification and explain the new host floor. Existing installations are not upgraded by this work. Source acceptance includes canonical spec synchronization/archive; publication and operator activation remain separate gates.

## Tooling

Installed OpenSpec is 1.16.0; latest released 1.16.1 fixes malformed/closed-heading validation and version checking. This package uses ordinary recognized headings, so no tooling upgrade is required to draft it. Do not upgrade the CLI or regenerate repository integrations as part of this adaptation. Report inherited strict-validation warnings separately from new errors.
