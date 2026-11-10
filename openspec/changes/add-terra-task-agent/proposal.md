# Proposal

## Why

Offer Terra Medium as an optional implementation worker without taking Luna Max away from existing users or changing the normal model-inheriting task agent. An orchestrator should select a named worker while retaining the same Beads scope, permissions and acceptance boundaries.

## What Changes

- Add opt-in `terra: true`, registering `beads-task-agent-terra` with `openai/gpt-6.1-terra` and reasoning variant `medium`.
- Keep `luna: true`, `beads-task-agent-luna` and its Luna Max route unchanged. Both options can be enabled independently or together.
- Keep the always-available `beads-task-agent` model-inheriting; no parent-session model change or silent route fallback.
- Treat Terra as a normal Beads task agent for context eligibility, actor derivation, permissions, interruption limits, native override precedence and cleanup.
- Document selection, provider prerequisites and the distinction between an available worker and authority to execute a task.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-access`: add the optional named task-agent profile contract, including additive selection and unchanged execution/ownership boundaries.

## Impact

Expected production edits are confined to `src/agents.ts` and the option forwarding in `src/host.ts`, with focused existing fixtures, package smoke assertions and current user guidance. The existing shared task-agent guidance and lifecycle mechanisms are reused; amend a relevant reference only if it enumerates profiles.

No dependency, host compatibility, Beads minimum, typed-operation, workflow-command or storage change is proposed. No routing framework, model fallback, migration, benchmark campaign or Hermes/Codex configuration change is included. This is a backward-compatible feature suitable for a later 2.1.0 release; version preparation, publication and consumer activation remain separately authorized.

## Scope and authority

This package is a proposal for owner review, not permission to implement, release or activate Terra. Native Claude/Codex onboarding in this source repository is separately verified maintenance, not part of the shipped Terra feature or its qualification.
