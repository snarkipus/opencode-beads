# Workflow access

## Purpose

Make selected Beads workflows discoverable and usable through native OpenCode capabilities while preserving project authority, explicit ownership and honest failure handling.

Owner selections apply to the complete marketplace-main corpus: core workflows adapted, advanced guidance available on demand, supported administration accessible under normal permissions, and obsolete or host-specific content corrected/replaced. The inventory maps every member to native delivery; acceptance is still unexecuted.

## ADDED Requirements

### Requirement: Discoverable selected workflows

The package-owned `oc-beads` skill, all 15 resources plus ADR rationale and all 29 `oc-beads:<command>` entries (including documented replacements) SHALL have a documented native entry point that exposes its purpose and relevant supporting guidance. Advertised command and skill behavior SHALL match the installed implementation and available tools rather than assume absent MCP tools or unreachable resources.

#### Scenario: User invokes a selected command

- **WHEN** a user discovers and invokes an installed selected command with arguments
- **THEN** the advertised workflow receives the intended arguments through its documented native entry point
- **AND** uses available execution tools without inventing a Beads MCP tool

#### Scenario: Task requires deeper guidance

- **WHEN** a selected workflow directs an agent to a supporting resource
- **THEN** that resource is reachable from the installed guidance's documented base
- **AND** SKILL.md explicitly links all 15 resources plus ADR rather than relying on the host’s ten-file auto-listing
- **AND** its presence alone is not reported as evidence that the model used it

#### Scenario: Installed resource requires external access

- **WHEN** an installed resource outside the workspace encounters external-directory ask or deny
- **THEN** the integration respects approval/rejection and reports unreachable guidance honestly without bypassing permission

### Requirement: Coherent context and authority

The integration SHALL preserve applicable user and repository authority across injected workflow, skills, commands and delegated guidance. It SHALL distinguish missing or failed context from context withheld by an explicit hold, and SHALL NOT recommend bypassing a hold through manual fallback.

#### Scenario: Migration hold conflicts with prime-first advice

- **WHEN** workflow context is withheld because store access is not authorized
- **THEN** skill, command and worker recovery guidance preserves that restriction
- **AND** reports the reason and required owner action without opening the store

#### Scenario: Context is already available

- **WHEN** current applicable workflow context has already been supplied
- **THEN** discovery guidance does not require another prime solely because the skill was loaded
- **AND** distinct applicable local constraints remain available when duplicate guidance is reduced

### Requirement: Owned installation and user customization

The OpenCode npm package SHALL supply and register the complete owner-selected integration, including its selected command, skill/resource, agent and lifecycle surfaces. Advertised capability SHALL NOT depend on a separate undocumented or manual skill/resource installation. The installed Beads CLI and upstream-owned workspace/data initialization remain external prerequisites.

#### Scenario: Package installed in an initialized workspace

- **WHEN** a supported OpenCode host loads the package in an initialized Beads workspace with its prerequisites satisfied
- **THEN** the selected packaged workflows and supporting guidance are available through native registration without separately installing the rich Claude plugin or copying skills
- **AND** qualification verifies effective discovery and installed resource paths rather than source-tree presence alone

Selected integration surfaces SHALL document who installs, updates and removes them and how user overrides are resolved. Updates and removal SHALL preserve unrelated or user-modified artifacts and SHALL NOT silently overwrite the upstream-owned shared skill or runtime configuration.

#### Scenario: User customizes an installed workflow

- **WHEN** an integration update or removal encounters a user-modified or colliding artifact
- **THEN** it preserves that customization and reports the conflict or documented override behavior
- **AND** does not remove unrelated commands, skills or configuration
- **AND** withholds and diagnoses affected colliding entries where possible if preservation cannot be established across rebuilds; documented override behavior does not authorize overwriting user commands

### Requirement: Scope-preserving execution and visible failure

Selected workflows SHALL preserve the user's requested execution scope, distinguish inspection from mutation, and report unsuccessful or partial operations accurately. Optional extensions SHALL expose their scope and constraints without silently replacing base workflows or authorizing unrelated actions.

#### Scenario: Graph analysis is read-only

- **WHEN** the user requests an issue-graph overview without authorizing task execution
- **THEN** the workflow returns the analysis without claiming, editing or closing issues

#### Scenario: Single atomic operation

- **WHEN** the user authorizes one issue operation
- **THEN** the workflow completes or reports failure of that operation without automatically starting unrelated ready work

#### Scenario: Optional worker limit interrupts work

- **WHEN** a selected bounded worker or permission constraint stops before completion
- **THEN** the result identifies the incomplete work, relevant context and next action
- **AND** does not claim that the task or durable write succeeded

### Requirement: Explicit native availability and fallback

The redesign SHALL use N1 with exact OpenCode 2.1.1 qualification and `>=2.1.1 <2.2` admission through opt-in beta/next delivery. It SHALL NOT silently migrate stable consumers, promise arbitrary minor/major compatibility or substitute N0. Concrete incompatibilities SHALL block the affected path with diagnostics. Publication remains separately authorized.

#### Scenario: A different host version is considered

- **WHEN** a future admitted patch or a version outside the declared range is considered
- **THEN** an admitted patch is not described as tested without measured evidence, and an out-of-range host remains unsupported pending explicit contract review

#### Scenario: Host cannot satisfy N1

- **WHEN** the host lacks the selected permission or lifecycle contract
- **THEN** the integration reports the unsupported path and does not enable privileged fallback execution or silently weaken guarantees

#### Scenario: Experimental capability is considered

- **WHEN** a released experimental mechanism could improve task flow or recovery
- **THEN** the packet records its semantics, qualification, maintenance and fallback consequences before adoption
- **AND** instability alone is neither approval nor automatic exclusion

#### Scenario: Plugin reloads or a session changes location

- **WHEN** registrations are unloaded or a session moves, forks or is deleted
- **THEN** the selected integration disposes or re-resolves affected state and observers without leaking task context across sessions or locations
- **AND** it preserves user overrides and does not claim cleanup guarantees a final durable write

### Requirement: Restricted-agent typed operation boundary

Typed continuity tools SHALL inherit shell visibility and operation-specific allow/ask/deny in direct and code-mode use. Assertions SHALL use actual invocation identity, canonical resources and narrow or absent saved grants. Explicit location access, guard holds and cancellation SHALL be rechecked after approval and before execution. Beads SHALL own database/routing/consistency semantics; CLI equivalence SHALL NOT promise absolute final-store confinement.

#### Scenario: Agent wholly denies shell

- **WHEN** a restricted agent's effective rules wholly deny shell
- **THEN** write-capable continuity tools are absent from its direct and code-mode tool inventory, not merely denied after selection

#### Scenario: Invoking agent differs from session default

- **WHEN** a typed operation is called by an agent with more restrictive rules than the session's default agent
- **THEN** permission evaluation uses the invoking agent and does not broaden saved approvals to unrelated bd operations

#### Scenario: Saved approval remains narrow

- **WHEN** a typed operation requests approval with `save: []`
- **THEN** even an “always” response installs no new saved grant and guidance explains possible repeat prompts
- **AND** existing shell `bd *` grants may authorize equivalent typed operations, while configured denies retain precedence

#### Scenario: External target or held workspace

- **WHEN** the explicit invocation/location requires external-directory access or the existing guard withholds store access
- **THEN** the operation preserves that restriction and refuses before store-opening execution unless invocation context and the required OpenCode authority are established
- **AND** Beads retains ownership of its internal routing; no final-store attestation or additional internal-route confinement is promised
- **AND** normal intended routing is not a speculative blocker or a prerequisite for upstream routing-disable support or local repair logic
- **AND** unresolved OpenCode permission equivalence prevents the affected execution

#### Scenario: Agent claims and hands off tracked work

- **WHEN** a selected workflow writes, claims or renews tracked work, or delegates execution
- **THEN** it supplies the actual executor's explicit actor consistently and verifies audit author, account owner and assignee separately
- **AND** coordination or review does not silently transfer a claim, actor naming does not grant authority, and historical authorship is not rewritten

### Requirement: Authorized continuation without scope expansion

Canonical execution SHALL allow continuation within an already-authorized batch or goal while retaining atomic claims and per-bead validation. Exact assignments SHALL stop without substitution. Discovery alone SHALL NOT authorize executing follow-up work. Cancellation, denied authority, exhausted scope or a blocker requiring a decision SHALL stop continuation; plugin events SHALL NOT restart it.

#### Scenario: Exact assignment completes

- **WHEN** the assigned bead is complete or cannot be acted on
- **THEN** the workflow reports its evidence or blocker and returns without selecting another bead

#### Scenario: Authorized batch has more work

- **WHEN** one bead meets its acceptance and another actionable bead remains within the authorized batch
- **THEN** the workflow may continue after recording evidence and claiming that bead atomically
- **AND** newly discovered out-of-scope work remains a reported follow-up

#### Scenario: Child result arrives after stop

- **WHEN** a child completion races a deliberate stop
- **THEN** the integration does not initiate renewed work or closure from the notification and preserves partial status for later authorized recovery

### Requirement: Read-only native diagnostics

The package SHALL expose effective discovery, compatibility, ownership conflicts and context/persistence status through a native status entry without opening a withheld store, changing configuration or exposing credentials. Diagnostics SHALL distinguish unavailable, failed, withheld and uncertain outcomes.

#### Scenario: Discovery collision

- **WHEN** a user customization prevents an owned entry from taking effect
- **THEN** status identifies the collision and effective entry while preserving the customization
