# Proposal

## Why

The package's integration diagnostic command is confused with the upstream issue overview, and several workflow descriptions obscure their native operation. Apply the owner-approved command clarity plan at baseline e2f1152141ce6ffb3c500e4cb3b3ec9d2bb47859 without expanding runtime behavior.

## What Changes

- **BREAKING**: Replace package-owned `oc-beads:status` with `oc-beads:diagnostics`, without an alias. Retain `stats` for issue overview and preserve user-owned old-name overrides without migration.
- Keep exactly 30 package entries and the original 29 workflow stems. Explain centrally that workflows are prompts guiding permitted operations, not exact CLI aliases.
- Clarify semantic `bd admin compact`, display-only `bd restore` versus explicitly authorized `--apply`, neutral quickstart wording, and Dolt-remote sync versus federation sync.
- Document compact analyze/apply preference, separate authority for external-AI `--auto` and storage-GC `--dolt`, and explicit `--actor`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-access`: amend only Discoverable selected workflows, Read-only native diagnostics, and Capability-aware actor and context guidance.

## Impact

Current command descriptions/registration, README, six packaged guidance files, focused tests and packed callback checks change. Diagnostics keeps existing safe probes, payload keys and lifecycle behavior; all 17 guidance links remain. No configuration migration, upstream repair, administration execution, version/dependency change, new host/model qualification, canonical spec edit or archive. Bead `opencode-beads-ghq` owns execution evidence; parent owns acceptance and closure.
