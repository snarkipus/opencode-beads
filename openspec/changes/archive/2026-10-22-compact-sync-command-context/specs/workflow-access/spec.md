# Workflow access delta

## ADDED Requirements

### Requirement: Compact workflow history with effective instructions

The integration SHALL present all 29 WORKFLOWS callbacks as compact native user invocations while preserving full effective action/authority instructions, command descriptions and installed guidance. Diagnostics SHALL retain its dynamic observed-report path.

#### Scenario: Deliberately migrated workflow presentation

- **WHEN** a user invokes any of the 29 WORKFLOWS callbacks
- **THEN** its visible entry is the compact command invocation with exact user free text rather than generated workflow instructions
- **AND** all 30 names/descriptions, per-command purposes, authority contracts and guidance resources remain unchanged

#### Scenario: Normal native input admission

- **WHEN** any WORKFLOWS command is invoked with bare text or literal details, files, agents, skills and queue or steer delivery
- **THEN** exactly one ordinary native prompt preserves those inputs and native prompt-hook edits
- **AND** visible text contains `/oc-beads:<stem>` and any exact untruncated literal details, while durable versioned ocBeadsWorkflow v1 message metadata retains the static instructions and installed resource paths
- **AND** single-line free text follows the command on the same line; multiline free text follows it on a new line, preserving its whitespace without generated headings or typed-argument parsing
- **AND** no synthetic pairing, retry, auxiliary model call or pending-command queue is introduced

#### Scenario: Request expansion and replay

- **WHEN** a retained tagged user message reaches primary or compaction context, including after native-window replay or reload
- **THEN** its request copy receives exactly one instruction snapshot, preserving content, foreign metadata, IDs and role without changing stored history
- **AND** outbound provider input contains no routing marker or serialized duplicate snapshot, with stable expansion across identical requests and current-turn instructions present
- **AND** missing, unknown or non-user metadata and unmarked historical messages remain untouched

#### Scenario: Auxiliary context and summary retention

- **WHEN** title or generate context uses workflow history
- **THEN** it receives no expanded action snapshot
- **AND** summary-path recent context remains compact, while existing compaction guidance asks for preservation of an active workflow’s requested outcome, unresolved inputs or explicit modes, and applicable authority limits without promising verbatim retention

#### Scenario: Existing bounded sync execution

- **WHEN** bare sync or an explicit explanation is requested
- **THEN** existing bounded action versus explanation behavior remains controlling, with actual executor identity and capabilities recomputed at execution
- **AND** ordinary synchronization uses supported `bd sync --no-adopt`, existing configuration, applicable sandbox and native permissions/holds, reporting real success, partial failure or blockers honestly
- **AND** no adoption, provisioning, --yes, force resolution, manual repair loop or historical replayed operation is inferred

#### Scenario: Native lifecycle ownership

- **WHEN** admission fails ambiguously, delivery is queued or steered, or cancellation, revert, reload or compaction occurs
- **THEN** native scheduling and lifecycle remain authoritative without plugin retry, re-admission or manufactured continuation
- **AND** pre-admission unload protection and existing overrides/disposal remain effective

#### Scenario: Legacy snapshots and idempotent precedence

- **WHEN** retained user history contains a valid version-1 ocBeadsSync snapshot, a valid version-1 ocBeadsWorkflow snapshot, or both
- **THEN** the generalized snapshot wins when both are valid, otherwise the valid snapshot is expanded
- **AND** both recognized valid routing keys are stripped from the transient copy so repeated expansion is stable, while malformed, unsupported, foreign and non-user metadata remains untouched
- **AND** new invocations write only ocBeadsWorkflow, without reconstructing old instructions from current command definitions or rewriting stored history

#### Scenario: Existing workflow authority and resource contracts

- **WHEN** any migrated workflow is invoked with action, help, guide, missing-input or explicit mode details
- **THEN** its existing purpose, common instructions, all installed skill/resource paths, required targets and acceptance ownership remain controlling with actual execution-derived actor/capabilities/native permission
- **AND** restore remains display-only absent --apply, compact --auto and --dolt each need separate authority, QuickStart uses current installed guidance, stats means issue-database overview, and no implicit administration, cascade, initialization or repair is inferred
