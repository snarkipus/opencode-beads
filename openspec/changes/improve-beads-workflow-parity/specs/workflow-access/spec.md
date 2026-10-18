# Workflow access

## Purpose

Make selected Beads workflows discoverable and usable through native OpenCode capabilities while preserving project authority, explicit ownership and honest failure handling.

The owner decision gate controls feature selection. These common proposed contracts do not approve any specific command set, skill installation, delegation default or extension. Selected mappings require revision and validation before implementation.

## ADDED Requirements

### Requirement: Discoverable selected workflows

Each owner-selected workflow SHALL have a documented native entry point that exposes its purpose and relevant supporting guidance. Advertised command and skill behavior SHALL match the installed implementation and available tools rather than assume absent MCP tools or unreachable resources.

#### Scenario: User invokes a selected command

- **WHEN** a user discovers and invokes an installed selected command with arguments
- **THEN** the advertised workflow receives the intended arguments through its documented native entry point
- **AND** uses available execution tools without inventing a Beads MCP tool

#### Scenario: Task requires deeper guidance

- **WHEN** a selected workflow directs an agent to a supporting resource
- **THEN** that resource is reachable from the installed guidance's documented base
- **AND** its presence alone is not reported as evidence that the model used it

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

Before implementation, the owner gate SHALL record the recommended architecture bundle, selected minimum host, experimental dispositions and consequential fallback behavior against pinned released contracts. Development-only and unqualified runtime capabilities SHALL NOT be presented as released guarantees. Low-level mappings SHALL be supplied by the decision packet rather than left for the owner to design.

#### Scenario: Preferred typed operation needs a newer host

- **WHEN** the preferred adapter requires plugin permission assertion unavailable at the existing minimum
- **THEN** the owner chooses the recommended qualified minimum or the documented permissioned-CLI fallback before dependency changes
- **AND** the fallback does not silently bypass authorization through privileged plugin execution

#### Scenario: Experimental capability is considered

- **WHEN** a released experimental mechanism could improve task flow or recovery
- **THEN** the packet records its semantics, qualification, maintenance and fallback consequences before adoption
- **AND** instability alone is neither approval nor automatic exclusion

#### Scenario: Plugin reloads or a session changes location

- **WHEN** registrations are unloaded or a session moves, forks or is deleted
- **THEN** the selected integration disposes or re-resolves affected state and observers without leaking task context across sessions or locations
- **AND** it preserves user overrides and does not claim cleanup guarantees a final durable write
