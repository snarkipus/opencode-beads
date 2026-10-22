# Spec Delta

## MODIFIED Requirements

### Requirement: Discoverable selected workflows

The package-owned `oc-beads` skill, all 15 corpus resources plus CODE_MODE and ADR rationale and all 29 `oc-beads:<command>` entries plus `oc-beads:diagnostics` (including documented replacements) SHALL have a documented native entry point that exposes its purpose and relevant supporting guidance. Advertised command and skill behavior SHALL match the installed implementation and available tools rather than assume absent MCP tools or unreachable resources.

#### Scenario: User invokes a selected command

- **WHEN** a user discovers and invokes an installed selected command with or without trailing details
- **THEN** the advertised workflow receives the invoked name, requested outcome and any literal details through its documented native entry point
- **AND** uses available execution tools without inventing a Beads MCP tool

#### Scenario: Task requires deeper guidance

- **WHEN** a selected workflow directs an agent to a supporting resource
- **THEN** that resource is reachable from the installed guidance's documented base
- **AND** SKILL.md explicitly links all 15 corpus resources plus CODE_MODE and ADR rather than relying on the host’s ten-file auto-listing
- **AND** its presence alone is not reported as evidence that the model used it

#### Scenario: Installed resource requires external access

- **WHEN** an installed resource outside the workspace encounters external-directory ask or deny
- **THEN** the integration respects approval/rejection and reports unreachable guidance honestly without bypassing permission

#### Scenario: Package diagnostic name is replaced

- **WHEN** the package registers its command surface
- **THEN** exactly 30 package commands include the original 29 workflow stems and `oc-beads:diagnostics`, with `stats` retained and no package-owned `oc-beads:status` alias
- **AND** documentation directs integration-health users to diagnostics and issue-overview users to stats; user-owned old-name overrides remain untouched without configuration migration

#### Scenario: Workflow purpose differs from native argv

- **WHEN** a user invokes a selected workflow
- **THEN** guidance explains that workflow prompts guide permitted operations rather than act as exact CLI aliases, including broader init, prime, version, decision, template and workflow purposes
- **AND** quickstart uses neutral installed-help wording without an unsupported deprecation claim, and sync distinguishes Dolt-remote synchronization from `bd federation sync` and removed JSONL sync

#### Scenario: Bare invocation retains the request

- **WHEN** a user invokes a command without trailing details
- **THEN** the command name and advertised bounded operation or artifact remain the user request
- **AND** supporting guidance addresses that workflow rather than only syntax discovery

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

#### Scenario: Explicit invocation and incidental automation

- **WHEN** a user invokes a sufficiently specified workflow
- **THEN** the invocation carries that invoking user's authority for its bounded purpose without redundant generic authorization
- **AND** actual host permissions, repository restrictions, holds, actor identity, parent acceptance and required inputs or explicit modes remain controlling
- **AND** unrelated writes, incidental synchronization and inferred remote adoption remain unauthorized

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

#### Scenario: Sufficient inputs request an action

- **WHEN** an action workflow has the required inputs and available permissioned capabilities
- **THEN** it performs the requested operation and reports actual results or an identified blocker
- **AND** help inspection alone does not complete the action

#### Scenario: Explanation or missing required inputs

- **WHEN** the user explicitly requests help/explanation or required action inputs are missing
- **THEN** it explains without performing the advertised mutation or asks focused clarification for the missing inputs respectively
- **AND** advertised guide/report workflows deliver their useful artifact, including bare compact or init without administration/store initialization

#### Scenario: Bare synchronization with existing configuration

- **WHEN** the user invokes ordinary or bare sync
- **THEN** it attempts supported bd sync --no-adopt under existing project configuration, actual executor actor and applicable sandbox policy
- **AND** a missing configured remote or denied permission is reported honestly without adoption, provisioning, --yes, force resolution, unrelated writes or manual pull/push repair loops
- **AND** explicit adoption remains a distinct request never inferred from synchronization
