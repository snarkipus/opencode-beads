# Proposal

## Why

The existing comparison established only the `bd setup claude` lifecycle target, not the full Claude Code Beads experience. Matt's reported differences in task notes and memory use motivate a broader, source-backed effort to recover attempts, learning, rationale, blockers and next actions across sessions without repeated prompting; the report does not establish model or host causality.

## What Changes

- Review the entire pinned Claude integration corpus: setup/init, marketplace hooks, rich and shared skills, every resource/ADR, all 29 commands, agent, configuration, memory and errors/approvals. Analysis and the machine-readable inventory are completed planning evidence in `docs/claude-code-integration-analysis.md` and `docs/claude-code-integration-inventory.json`.
- Establish an explicit owner decision gate covering the full corpus and extension model. Matt must accept/adapt/defer/exclude the surfaces and choose the recommended architecture/compatibility bundle, ownership and consequential continuation/experimental policies before feature selection becomes normative. The linked native assessment supplies low-level mappings rather than requiring the owner to design them. No acceptance is recorded yet.
- Propose common outcome contracts for durable work continuity and discoverable, authority-respecting workflow access. Concrete commands, skill packaging, routing defaults, bounded workers, Luna and guard/permission changes remain provisional until the gate and follow-on revision.
- Recommend the source-backed N1 native continuity adapter with typed checkpoint/recall operations, awaited context/tool/compaction hooks, observational lifecycle events and D01+D04 package-owned commands/skill. Recommend 2.0.32 qualification and eventual minimum for permission assertion; N0 preserves 2.0.26 through ordinary permissioned CLI execution. Both remain owner decisions. Assess N2 continuation and X01–X09 experimental/adjacent options explicitly; no wholesale vendoring or predetermined catalog subset.
- Qualify deterministic integration behavior separately from model-dependent recovery outcomes, controlling provider/model and installation-path confounds where feasible.
- Add review-driven upstream drift detection for selected integration source paths against a reviewed release/commit baseline. Recommend scheduled path-scoped Git comparison, not a prescribed hash-map implementation. Alert maintainers without automatic repackaging or baseline advancement.
- Reassess invocation scope separately from atomic claiming: recommend exact single-bead stopping plus explicitly authorized batch/goal continuation. Upstream repeats the ready-work cycle; universal one-bead termination remains a pending policy choice.

## Capabilities

### New Capabilities

- `work-continuity`: meaningful progress/learning preservation, relevant memory retrieval, cross-session recovery and delegated knowledge handoff, within existing authority.
- `workflow-access`: discoverable approved workflows, coherent context/authority handling, and explicit ownership of selected native integration surfaces.
- `upstream-review`: detect relevant upstream source changes and maintain an explicit human-reviewed baseline without automatic repackaging.

### Modified Capabilities

None. Canonical specs are empty. The new deltas cover only intended touched contracts; existing code is evidence, not automatically the desired specification.

## Impact

Current changes are docs and OpenSpec planning only. Conditional implementation may touch guidance/context/host/guard/agents/instruction minimization, packaged resources or command registration/install surfaces, their focused tests and user docs. No dependency upgrade or host/runtime configuration change is selected. OpenSpec owns intended behavior, docs preserve evidence/rationale, and Beads execution tracking comes later when authorized.

**Implementation is blocked** until Matt's dispositions are recorded against the decision packet, all artifacts are revised coherently and strictly revalidated, and a subsequent implementation request is received. Planning completeness is not gate approval. This assignment performs no product changes, Beads commands/store operations, commits, pushes or integration regeneration.
