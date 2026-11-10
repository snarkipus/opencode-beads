# Design

## Context

See [proposal](proposal.md) for motivation and the [workflow-access delta](specs/workflow-access/spec.md) for behavior. Current source at `56e3a3bb4c261e500ce81b8c337073f1710eaa22` builds the inherited agent and optional Luna in `src/agents.ts`; `src/host.ts` forwards `luna`, and task-agent recognition uses the exported agent-name set. Native configuration already overrides registered fields.

## Goals / Non-Goals

Add one explicit opt-in profile through the existing mechanism. Do not introduce a model router, configurable profile registry, fallback, new permissions, dependency changes, store work or token/latency benchmark. Existing lifecycle/typed-operation mechanisms are verification-only unless an actual Terra recognition omission requires a direct correction.

## Decisions

1. **Add `terra?: boolean`; keep `luna?: boolean`.** False or omitted means no corresponding registration. Both true means three agents. Replacement or a Luna-labelled Terra route would unnecessarily change a public contract.
2. **Use the exact native route** `{ providerID: "openai", id: "gpt-6.1-terra", variant: "medium" }`. Broaden the existing model type only enough for both constants; no arbitrary model-selection framework. Host/provider support is an explicit prerequisite, not an inference from Codex availability.
3. **Reuse the base definition.** Terra gets the same shared prompt, description, step cap and permission policy. Add its name to existing recognition so context/actor handling does not misclassify it as an unrelated subagent. Preserve per-rebuild user override precedence and normal disposal.
4. **Reuse existing tests and package smoke.** Cover neither/Luna/Terra/both, literal routes and shared policy equality. Extend one host fixture for actual option forwarding and Terra eligibility; use existing customization/disposal checks rather than multiplying the entire lifecycle suite.

## Risks / Trade-offs

- Provider availability differs by host → verify the exact OpenCode catalog/variant before a single disposable native dispatch; preserve host errors and do not add fallback logic.
- Registration alone misses context eligibility → assert the actual recognized Terra request path using the existing host fixture.
- A public option needs current instructions → update the user-guide option table/example and relevant installed guidance only if it enumerates profiles. Do not rewrite frozen evidence or command semantic baselines for an agent-only addition.

## Verification and acceptance boundary

Implementation requires owner acceptance of this package and later execution tracking. Expected editable production modules are only `src/agents.ts` and option forwarding in `src/host.ts`; relevant existing fixtures/package smoke and current docs are in scope. Stop and discuss if new provider APIs, persistence/permission machinery, dependency acquisition or unrelated lifecycle changes become necessary.

After source checks, qualify registration and one small read-only child dispatch on an owned disposable supported OpenCode host with an already-authorized provider login. Verify actual selected model/variant and observed child tool results; do not copy credentials, use the operator session or create junk issues in a live tracker. A missing host/auth prerequisite is a named pending gate, not a reason for another integration platform or repeated model campaign. Existing unchanged qualification remains evidence for unchanged mechanisms.

## Migration and release

No data or configuration migration is needed. Existing users keep Luna and the inherited agent. Later consumers opt into `terra: true`; disabling it removes only the Terra profile through normal rebuild. A future 2.1.0 release is appropriate, but preparation/publication/activation are outside this draft. After accepted implementation, reconcile canonical specs and archive this change under separately granted closeout authority.
