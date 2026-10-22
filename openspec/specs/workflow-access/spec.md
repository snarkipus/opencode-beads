# workflow-access Specification

## Purpose
Make selected Beads workflows discoverable and usable through native OpenCode capabilities while preserving project authority, explicit ownership and honest failure handling.

Owner selections apply to the complete marketplace-main corpus: core workflows adapted, advanced guidance available on demand, supported administration accessible under normal permissions, and obsolete or host-specific content corrected/replaced. The inventory maps every member to native delivery; acceptance evidence is recorded separately from inventory and discovery.

## Requirements

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

### Requirement: Owned installation and user customization

The OpenCode npm package SHALL supply and register the complete owner-selected integration, including its selected command, skill/resource, agent and lifecycle surfaces. Advertised capability SHALL NOT depend on a separate undocumented or manual skill/resource installation. The installed Beads CLI and upstream-owned workspace/data initialization remain external prerequisites.

#### Scenario: Package installed in an initialized workspace

- **WHEN** a supported OpenCode host loads the package in an initialized Beads workspace with its prerequisites satisfied
- **THEN** the selected packaged workflows and supporting guidance are available through native registration without separately installing the rich Claude plugin or copying skills
- **AND** qualification verifies effective discovery and installed resource paths rather than source-tree presence alone

Selected integration surfaces SHALL document who installs, updates and removes them and how user overrides are resolved. Updates and removal SHALL preserve unrelated or user-modified artifacts and SHALL NOT silently overwrite the upstream-owned shared skill or runtime configuration.

#### Scenario: User customizes an installed workflow

- **WHEN** an integration update or removal encounters user configuration, file commands or a colliding artifact
- **THEN** it preserves user-owned files and ordinary configuration/file command overrides through native post-ordered precedence on initial load and rebuild
- **AND** does not remove unrelated commands, skills or configuration
- **AND** registers all selected namespaced commands without setup-time withholding; same-name conflicts with other plugin transforms follow native order, with detectable conflicts diagnosed rather than a promise of universal collision prevention
- **AND** removing a user override restores the package entry through native rebuild; skill candidate collisions use the public per-rebuild editor check rather than a permanent setup-time gate

#### Scenario: Installed package is unloaded and reactivated

- **WHEN** the installed package is unloaded and subsequently reactivated on the qualified disposable host
- **THEN** owned entries disappear on unload and the expected commands and skill return once under native user-override precedence
- **AND** an eligible request receives one Beads context injection, without a late result from work pending in the unloaded generation
- **AND** acceptance records actual host lifecycle results rather than treating fixture disposal or registry rebuilds as installed reactivation evidence

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

Typed tools and direct shell fallback SHALL respect shell visibility and operation-specific permissions using actual invocation identity, canonical resources and narrow saved grants. Guard holds, location, attribution and cancellation SHALL be rechecked after approval and before execution. Beads owns database/routing/consistency semantics; normal CLI equivalence does not promise filesystem confinement.

#### Scenario: Agent wholly denies shell

- **WHEN** a restricted agent's effective rules wholly deny shell
- **THEN** typed tools are absent from its code-mode inventory, not merely denied after selection; default typed tools have no direct registration and native shell is never callable inside execute

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
- **AND** code-mode composition remains available despite the owner-accepted OpenCode 2.1.1 limitation that a plain decline may become an inner error in an outer completed result and permit subsequent model steps or independently permissioned work
- **AND** rejection of one operation does not promise whole-step termination; every later operation retains its own permission checks, and explicit Stop/Cancel remains a separate cancellation guarantee

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

Canonical execution SHALL allow continuation within an authorized batch or goal, with atomic claims and per-bead validation. Exact assignments SHALL stop without substitution; discovery SHALL NOT expand authority. Cancellation, exhausted scope or a decision blocker SHALL stop continuation, and plugin events SHALL NOT restart it. Denied authority SHALL block the rejected operation; the typed-operation scenarios define the accepted code-mode continuation exception.

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
