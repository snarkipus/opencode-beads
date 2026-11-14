# Spec Delta

## MODIFIED Requirements

### Requirement: Coherent context and authority
The integration SHALL preserve applicable user and repository authority across injected workflow, skills, commands and delegated guidance. It SHALL distinguish missing or failed context from context withheld by an explicit hold, and SHALL NOT recommend bypassing a hold through manual fallback.

#### Scenario: Migration hold conflicts with prime-first advice

This scenario covers explicit user or repository restrictions, not a plugin-generated schema hold.

- **WHEN** an explicit user or repository restriction withholds store access, including a user-requested migration hold
- **THEN** skill, command and worker recovery guidance preserves that restriction
- **AND** reports the reason and required owner action without opening the store

#### Scenario: Context is already available

- **WHEN** current applicable workflow context has already been supplied
- **THEN** discovery guidance does not require another prime solely because the skill was loaded
- **AND** distinct applicable local constraints remain available when duplicate guidance is reduced

#### Scenario: Explicit invocation and incidental automation

- **WHEN** a user invokes a sufficiently specified workflow
- **THEN** the invocation carries that invoking user's authority for its bounded purpose without redundant generic authorization
- **AND** actual host permissions, repository restrictions, holds, actor identity, parent acceptance and required inputs or explicit modes remain controlling
- **AND** unrelated writes, incidental synchronization and inferred remote adoption remain unauthorized

### Requirement: Restricted-agent typed operation boundary
Typed tools and direct shell fallback SHALL respect shell visibility and operation-specific permissions using actual invocation identity, canonical resources and narrow saved grants. CLI/workspace compatibility, location, attribution and cancellation SHALL be rechecked after approval and before execution. Beads owns database/routing/consistency semantics; normal CLI equivalence does not promise filesystem confinement.

#### Scenario: Agent wholly denies shell

- **WHEN** a restricted agent's effective rules wholly deny shell
- **THEN** typed tools are absent from both its native code-mode inventory and direct-tool fallback, not merely denied after selection; native shell is never callable inside execute

#### Scenario: Invoking agent differs from session default

- **WHEN** a typed operation is called by an agent with more restrictive rules than the session's default agent
- **THEN** permission evaluation uses the invoking agent and does not broaden saved approvals to unrelated bd operations

#### Scenario: Saved approval remains narrow

- **WHEN** a typed operation requests approval with `save: []`
- **THEN** even an “always” response installs no new saved grant and guidance explains possible repeat prompts
- **AND** existing shell `bd *` grants may authorize equivalent typed operations, while configured denies retain precedence

#### Scenario: User corrects or declines a typed operation

- **WHEN** the host permission assertion returns user correction with feedback or explicit decline
- **THEN** the adapter propagates the assertion rejection unchanged and preserves correction feedback without executing the rejected target operation
- **AND** it does not acknowledge target success or automatically retry the operation
- **AND** the host owns outer code-mode decline/continuation behavior; qualification records actual target-host behavior without downstream repair or relabeling historical observations
- **AND** rejection of one operation does not promise whole-step termination; every later operation retains its own permission checks, and explicit Stop/Cancel remains a separate cancellation guarantee

#### Scenario: External target or held workspace

- **WHEN** the explicit invocation/location requires external-directory access or CLI/workspace compatibility checks fail
- **THEN** the operation preserves that restriction and refuses before store-opening execution unless invocation context and the required OpenCode authority are established
- **AND** Beads retains ownership of its internal routing; no final-store attestation or additional internal-route confinement is promised
- **AND** normal intended routing is not a speculative blocker or a prerequisite for upstream routing-disable support or local repair logic
- **AND** unresolved OpenCode permission equivalence prevents the affected execution

#### Scenario: Agent claims and hands off tracked work

- **WHEN** a selected workflow writes, claims or renews tracked work, or delegates execution
- **THEN** it supplies the actual executor's explicit actor consistently and verifies audit author, account owner and assignee separately
- **AND** coordination or review does not silently transfer a claim, actor naming does not grant authority, and historical authorship is not rewritten

### Requirement: Read-only native diagnostics
The package SHALL expose effective discovery, compatibility, ownership conflicts and context/persistence status through `oc-beads:diagnostics` without opening a store, changing configuration or exposing credentials. Diagnostics SHALL distinguish unavailable, failed, withheld and uncertain outcomes.

#### Scenario: Discovery collision

- **WHEN** a user customization prevents an owned entry from taking effect
- **THEN** diagnostics reports effective names/descriptions and detectable overrides while preserving native user-config precedence
- **AND** a description mismatch may identify an override but SHALL NOT be presented as proof of ownership; public owner identity and identical-description overrides remain unobservable and are disclosed
- **AND** command registration status reflects actual registration and lookup outcomes rather than an obsolete blanket hold

#### Scenario: Integration health and issue overview are requested

- **WHEN** a user invokes diagnostics or stats
- **THEN** diagnostics uses only the existing safe version/context probes and cached integration state without opening a store, while stats remains an issue-overview workflow using `bd status` (alias `bd stats`)
- **AND** version/workspace/protocol observations do not certify SQL health or complete native memory delivery
- **AND** diagnostic safety and observed qualification limits are preserved; the report identifies the loaded plugin package name/version from its own manifest alongside the observed host version, without inferring a unique build fingerprint

#### Scenario: Compact diagnostic history

- **WHEN** diagnostics is invoked with optional free text and native attachments/delivery
- **THEN** history shows the compact command and exact free text, while the dynamic report is captured once in a durable invocation snapshot and expanded only through primary/compaction hooks
- **AND** replay preserves the captured observation without regenerating diagnostics, duplicating instructions, mutating persisted input or expanding auxiliary requests

#### Scenario: Diagnostics is overridden or unloaded

- **WHEN** a user override is added or removed, or package diagnostics is unloaded while pending
- **THEN** native override precedence, package restoration after override removal and disposal are preserved, user-owned old status remains untouched, and unloaded work submits no late prompt

## ADDED Requirements

### Requirement: Native Beads store ownership

The integration SHALL delegate store opening, schema bounds and upgrade semantics to native Beads. It SHALL NOT read CLI version witnesses for store admission, infer pending SQL migration from them or add migration/remediation commands. It SHALL retain the supported CLI minimum and config-only workspace/protocol checks, ordinary full native prime and real per-operation authority.

#### Scenario: CLI witness differs or is missing

- **WHEN** a supported CLI and workspace pass integration checks with an older, matching, newer or missing CLI witness
- **THEN** the integration does not impose a witness-based hold on context or authorized typed operations or prescribe marker recovery
- **AND** native Beads determines store behavior and failures, including any native migration on ordinary open

#### Scenario: Legacy autoMigrate configuration

- **WHEN** an existing configuration sets autoMigrate true or false
- **THEN** it loads with the option ignored, without migration-policy changes or repeated warnings

#### Scenario: Full native context and partial results

- **WHEN** eligible context loads through ordinary bd prime --full
- **THEN** native workflow and persistent-memory output, including native partial-availability notices, is preserved without local memory reconstruction
- **AND** command failures are reported honestly and success does not certify complete memory delivery or store health

#### Scenario: Missing or failed prerequisites

- **WHEN** CLI availability, minimum version or config-only workspace/protocol observation fails
- **THEN** the integration preserves the distinction between missing prerequisites and failed or unsupported observations without substituting a store-opening probe

#### Scenario: Explicit administration

- **WHEN** an agent considers migration, repair, initialization, update, bootstrap or synchronization as an administrative action
- **THEN** that action still requires its own applicable user authority and permissions; ordinary native open semantics do not authorize extra administration
