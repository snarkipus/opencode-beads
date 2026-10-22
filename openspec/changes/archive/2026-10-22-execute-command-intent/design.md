# Design

## Context

See proposal.md for the failure. Ordinary native callbacks forward to session.prompt; the current purpose-first text leaves the bare invocation implicit. Diagnostics already obtains an observed report and stays intact. Owner accepted F1 invocation authority, F2 unconditional no-adopt for ordinary sync and F3 bounded validation in the operative Bead.

## Goals / Non-Goals

Expose invocation and requested outcome directly while retaining native metadata, overrides, disposal, permissions and actual executor identity. Preserve 30 names and 17 links. No keyword intent parser, hidden authority token, deterministic executor, manager/router, raw plugin spawn or shell interpolation. No upstream repair or routing/confinement framework.

## Decisions

- Keep prompt-first callbacks: render invoked name and outcome before optional literal details; instruct contextual interpretation of explicit help/explain, focused missing-input clarification and meaningful guide/report artifacts. Help inspection prepares action rather than completing it. A special sync executor would expand responsibilities and is excluded.
- Rewrite sync/delete/import/restore/rename-prefix/compact authority clauses as well as common text and the shared incidental-sync restriction. Explicit invocation requests only its bounded purpose; actual host/repository restrictions, holds, parent acceptance, restore --apply, compact modes, concrete migration prefix and no unrelated writes still apply.
- Ordinary sync uses existing project configuration and supported --no-adopt, actual executor actor and applicable sandbox policy. Missing remote is a blocker; no --yes, adoption/provisioning, manual pull/push repair loops or force resolution. Explicit adoption is a distinct request; no machinery is added.
- Remap sync/audit/show/import/init/quickstart to CLI_REFERENCE and epic to DEPENDENCIES. Keep WORKTREES secondary and CLI_REFERENCE concise. Preserve onboarding and bare compact/migration explanation purposes.
- Use small RED/GREEN rendering, purpose/resource and actual callback slices, retaining logs. Reuse existing guard/actor/permission/result tests. Fixtures establish contracts, never genuine model intent.

## Risks / Trade-offs

Prompt interpretation remains model-dependent → record one genuine named configuration on one exact admitted host. R1 bare sync must converge seeded nonconflicting divergence on a local disposable remote with --no-adopt/actor; R2 explain makes no sync; R3 missing update inputs clarifies with zero writes; R4 denied sync blocks/pends without bypass; R5 bare compact or init gives a guide without admin/store mutation. Preserve first R1 failure and stop semantic remediation; no retry-until-pass or executor fallback. Missing runtime/current native access leaves semantic acceptance unexecuted while source work continues.

## Migration Plan

Validate this packet before runtime edits. Implement allowed files, run focused/full/type/package and named/global strict checks, then return source and semantic evidence separately for parent verification. Use normal public installed entrypoint and record distinct local archive checksum despite unchanged beta.2 version. Evaluation owns transient HOME/XDG/store/remote/server and current-access-only credential import; no refresh capability or operator writes. Clean owned processes/listeners/credentials and verify nonsecret operator fingerprints. No commits, release, archive, closure or tracker sync. Rollback is reverting the bounded uncommitted changes.
