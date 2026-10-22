# Workflow Access Delta

## MODIFIED Requirements

### Requirement: Discoverable selected workflows

The package-owned `oc-beads` skill, all 15 corpus resources plus CODE_MODE and ADR rationale and all 29 `oc-beads:<command>` entries plus `oc-beads:diagnostics` (including documented replacements) SHALL have a documented native entry point that exposes its purpose and relevant supporting guidance. Advertised command and skill behavior SHALL match the installed implementation and available tools rather than assume absent MCP tools or unreachable resources.

#### Scenario: User invokes a selected command

- **WHEN** a user discovers and invokes an installed selected command with arguments
- **THEN** the advertised workflow receives the intended arguments through its documented native entry point
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

### Requirement: Read-only native diagnostics

The package SHALL expose effective discovery, compatibility, ownership conflicts and context/persistence status through `oc-beads:diagnostics` without opening a withheld store, changing configuration or exposing credentials. Diagnostics SHALL distinguish unavailable, failed, withheld and uncertain outcomes.

#### Scenario: Discovery collision

- **WHEN** a user customization prevents an owned entry from taking effect
- **THEN** diagnostics reports effective names/descriptions and detectable overrides while preserving native user-config precedence
- **AND** a description mismatch may identify an override but SHALL NOT be presented as proof of ownership; public owner identity and identical-description overrides remain unobservable and are disclosed
- **AND** command registration status reflects actual registration and lookup outcomes rather than an obsolete blanket hold

#### Scenario: Integration health and issue overview are requested

- **WHEN** a user invokes diagnostics or stats
- **THEN** diagnostics uses only the existing safe version/context probes and cached integration state without opening a store, while stats remains an issue-overview workflow using `bd status` (alias `bd stats`)
- **AND** the diagnostic payload and observed qualification limits remain unchanged apart from user-facing command-name wording

#### Scenario: Diagnostics is overridden or unloaded

- **WHEN** a user override is added or removed, or package diagnostics is unloaded while pending
- **THEN** native override precedence, package restoration after override removal and disposal are preserved, user-owned old status remains untouched, and unloaded work submits no late prompt

### Requirement: Capability-aware actor and context guidance

The integration SHALL render actual executor identity and request capabilities, deduplicate guidance while retaining authority, and retain full prime pending measurement. It SHALL preserve the original 29 workflow stems and selected advanced/admin workflows, replacing only package-owned status with diagnostics without an alias or user-override migration, with explicit links to 16 resources plus ADR. Durable references and freshness SHALL be operation-aware.

#### Scenario: Execute is denied

- **WHEN** execute is wholly denied for the actual request
- **THEN** code-mode-only Beads tools are unavailable and guidance offers direct shell only if separately available and not held
- **AND** when both capabilities are unavailable the limitation is reported without bypass or invented tool access

#### Scenario: Typed and shell writes share an executor

- **WHEN** a primary or delegated agent alternates typed and direct-shell writes
- **THEN** context and typed results expose the same actor derived from the actual request/invocation session and agent; attribution grants no permission, and permission checks separately use actual context.agent
- **AND** child executors keep their own identities, no model-controlled actor argument exists, and beads-task-agent remains an optional execution profile

#### Scenario: A write changes cached state

- **WHEN** a memory write may have landed, external state changes, or recovery needs current knowledge
- **THEN** relevant location context is refreshed or its uncertainty reported
- **AND** issue-write prime refresh is retained until supported prime content is verified independent of issue state
- **AND** acknowledged writes avoid redundant generic recovery cues, while uncertain results preserve targeted readback needs

#### Scenario: Actor or capabilities change

- **WHEN** a request changes agent, session or effective capabilities
- **THEN** rendered actor/capability guidance is recomputed without leaking cached identity or promising unobserved permissions
- **AND** deduplication preserves distinct local authority and the required scope, stop, ownership and honest-outcome rules

#### Scenario: Semantic issue compaction is requested

- **WHEN** compact guidance is invoked
- **THEN** it identifies semantic `bd admin compact`, distinguishes Dolt-history squashing with `bd compact` and conversation compaction, and clarifies ambiguous operation or authority before action; bare invocation is explanation only
- **AND** linked guidance prefers agent-driven analyze/apply; `--auto` external-AI mode and `--dolt` storage garbage collection each require separate explicit authority; ordinary compact approval selects neither
- **AND** any authorized admin compact invocation supplies explicit `--actor` because its local default is agent
- **AND** guidance discloses the conflicting upstream examples and discard/restore wording without promising recovery or executing administration to validate prose

#### Scenario: Pre-compaction issue content is retrieved

- **WHEN** restore guidance is invoked
- **THEN** it identifies `bd restore` as pre-compaction issue-content retrieval, display-only by default, with explicit authority required for `--apply` to write content back
- **AND** it does not imply database backup recovery or guaranteed reversibility
