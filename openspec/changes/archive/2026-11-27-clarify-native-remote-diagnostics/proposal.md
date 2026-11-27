# Proposal

## Why

Diagnostics must distinguish a local-only Beads store from a configured native target and from observed remote-history differences. Hook installation alone cannot answer those questions, and target resolution alone cannot establish synchronization.

## What Changes

- Keep exactly three remote-related Beads rows: extend **Git hooks**, add **Sync target** and **Remote history**, independently of Plugin health.
- Add a bounded strict-readonly native remote listing to ordinary diagnostics and details. Permit native store opening for that read; do not fetch or contact the sync remote. Use native context and listing evidence rather than guessing Git origin.
- Add exact trimmed case-insensitive **remote** and **details remote** selectors to the existing command. On current Beads pins, report that no qualified fresh history check is available; do not fetch. A future explicit check requires supported native exact-branch fetch and comparison against the fetched tip, with disclosed local object/ref writes and applicable native maintenance effects.
- Make missing optional hooks neutral. Preserve independently established safe warnings without running hooks or inventing a warning collector.
- Preserve deterministic headers/statuses, full prime/memories, capture/replay, attachments/delivery and override contracts. Keep help static and default history unperformed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-access`: diagnostic collection boundary, actual target/history producers, explicit selectors/effects, optional-hook policy and evidence-based roll-up.

## Impact

Future implementation extends `src/guard.ts`'s retained native context fields, the existing diagnostics collector/renderer and host callback, and the diagnostics command purpose/help/docs. The published store-free command promise changes to strict-readonly ordinary store access. Fresh remote history remains deferred until a supported native exact-branch comparison is qualified. No runtime change is made by this planning revision.

The owner selected both collection modes following the independent Claude review. No further generic approval of those design choices is pending; implementation still requires separate dispatch. No new public command, dependency, background polling, plugin cache, custom resolver, schema guard, permission framework, replication, synchronization or repair is proposed. `opencode-beads-80m` remains separate.
