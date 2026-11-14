# Design

## Context

See proposal.md for the bug and selected removal. Pinned Beads 1.3.4 (`7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde`) upgrade/migrate documentation and native Claude plugin hooks establish ordinary native prime and native upgrade ownership. Zeus SQL66 with a stale CLI witness produced our false hold; schema command success did not repair it. No corruption was demonstrated. Prior H/W proposals and failed memory composition remain historical evidence, superseded where they conflict with this owner decision.

## Goals / Non-Goals

**Goals:** Remove the redundant feature with minimal code, preserve native full context and actual integration boundaries.

**Non-Goals:** Replacement SQL/metadata health checks, custom memory rendering, native patches, automatic administration, new flags, routing frameworks, host mutations or broad schema qualification.

## Decisions

Keep `bd version` and config-only `bd context --json` discovery with supported protocol validation. Missing CLI/workspace and failed probes remain distinct. Delete marker filesystem access and schema-admission outcomes from both automatic context and typed dispatch. Keep existing permission, actor, location, cancellation and disposal paths. `autoMigrate` becomes a documented ignored legacy configuration key; no replacement or warning system.

Use ordinary `bd prime --full`, plus existing stealth behavior. Native Beads owns store opens, migrations, refusals and upgrade procedures. Do not parse memory banners or recreate memory selection. Preserve native output (including partial-availability notices) and actual command failures; success is not a guarantee of full memory delivery or store health. Explicit agent-initiated administration still requires its own user authority.

Diagnostics remains version/config-only and cached integration observations. It never opens a store or reports plugin-certified SQL health. Keep host and CLI versions unchanged. Remove only contract fixtures asserting withdrawn witness/migration behavior; retain init, prime, memory and task-operation checks and existing CI semantics.

## Risks / Trade-offs

- [Native ordinary opens may migrate] → State native ownership and link the pinned upgrade procedure; do not promise migration-free context or issue automatic remediation commands.
- [Native context can fail in a valid fixture] → Preserve exact failures and stop affected qualification, without a fallback or native bypass; independently validate product behavior with existing fixtures.
- [Prior option users] → Accept and ignore both boolean values without warnings.

## Migration Plan

The removal requires no plugin-issued store migration. Existing options need no edit. Source acceptance and independent review precede canonical synchronization and archival; publication remains a separate release action. Historical planning, reviews and failed experiments remain immutable; rollback of the plugin does not roll back native store state.
