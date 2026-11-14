# Proposal

## Why

The plugin treats `.local_version`, a CLI witness, as SQL migration evidence and withholds working context and typed operations. Owner-selected removal delegates store opening, schema bounds and upgrade semantics to native Beads. Native ordinary opens can migrate; the former plugin-level no-automatic-migration guarantee is withdrawn.

## What Changes

- Remove witness reads, schema inference, migration-pending holds and recovery advice.
- Keep version and config-only workspace/protocol checks, host admission, permissions, actors, cancellation and ordinary native `bd prime --full`, including native persistent memories and stealth behavior.
- Retire `autoMigrate`: existing true/false configurations load unchanged and the option is ignored without warnings.
- Keep diagnostics config-only and describe its limits; do not infer SQL health or complete memory delivery from success.
- Reconcile current guidance and contract tests; preserve historical evidence and maintenance workflow semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-access`: remove plugin schema admission, retain actual authority and expose compatibility observations with their limits.

## Impact

Guard, host/context and typed dispatch dependencies, tests, CLI contract, package description, current docs and packaged guidance. OpenCode >=2.3.0 <2.4 (qualified 2.3.0) and Beads minimum 1.3.1 (validated 1.3.4) remain unchanged. The owner authorized local implementation and spec reconciliation; parent retains source acceptance, closure and sync. No release or operator-store action is included.
