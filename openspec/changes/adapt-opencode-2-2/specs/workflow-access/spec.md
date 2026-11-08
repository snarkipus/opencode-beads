## MODIFIED Requirements

### Requirement: Explicit native availability and fallback

The integration SHALL target exact OpenCode 2.2.6 qualification and `>=2.2.6 <2.3` admission. It SHALL distinguish admission from measured compatibility, preserve existing version pins and refuse unsupported host registration with diagnostics. It SHALL NOT retain a 2.1 compatibility layer or silently migrate installations. Publication remains separately authorized.

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

- **WHEN** the explicit invocation/location requires external-directory access or the existing guard withholds store access
- **THEN** the operation preserves that restriction and refuses before store-opening execution unless invocation context and the required OpenCode authority are established
- **AND** Beads retains ownership of its internal routing; no final-store attestation or additional internal-route confinement is promised
- **AND** normal intended routing is not a speculative blocker or a prerequisite for upstream routing-disable support or local repair logic
- **AND** unresolved OpenCode permission equivalence prevents the affected execution

#### Scenario: Agent claims and hands off tracked work

- **WHEN** a selected workflow writes, claims or renews tracked work, or delegates execution
- **THEN** it supplies the actual executor's explicit actor consistently and verifies audit author, account owner and assignee separately
- **AND** coordination or review does not silently transfer a claim, actor naming does not grant authority, and historical authorship is not rewritten

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
- **AND** diagnostic safety and observed qualification limits are preserved; the report identifies the loaded plugin package name/version from its own manifest alongside the observed host version, without inferring a unique build fingerprint

#### Scenario: Compact diagnostic history

- **WHEN** diagnostics is invoked with optional free text and native attachments/delivery
- **THEN** history shows the compact command and exact free text, while the dynamic report is captured once in a durable invocation snapshot and expanded only through primary/compaction hooks
- **AND** replay preserves the captured observation without regenerating diagnostics, duplicating instructions, mutating persisted input or expanding auxiliary requests

#### Scenario: Diagnostics is overridden or unloaded

- **WHEN** a user override is added or removed, or package diagnostics is unloaded while pending
- **THEN** native override precedence, package restoration after override removal and disposal are preserved, user-owned old status remains untouched, and unloaded work submits no late prompt

### Requirement: Capability-aware actor and context guidance

The integration SHALL render actual executor identity and request capabilities, deduplicate guidance while retaining authority, and retain full prime pending measurement. It SHALL preserve the original 29 workflow stems and selected advanced/admin workflows, replacing only package-owned status with diagnostics without an alias or user-override migration, with explicit links to 16 resources plus ADR. Durable references and freshness SHALL be operation-aware.

#### Scenario: Execute is denied

- **WHEN** execute is wholly denied for the actual request
- **THEN** composition is reported unavailable, while actually exposed direct Beads tools remain discoverable under their own permissions; direct shell is offered only if separately available and not held
- **AND** when composed tools, direct typed tools and shell are unavailable the limitation is reported without bypass or invented tool access

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
- **AND** visible text contains `/oc-beads:<stem>` and any exact untruncated literal details, while a durable versioned ocBeadsWorkflow v1 invocation snapshot retains the static instructions and installed resource paths
- **AND** single-line free text follows the command on the same line; multiline free text follows it on a new line, preserving its whitespace without generated headings or typed-argument parsing
- **AND** no synthetic pairing, retry, auxiliary model call or pending-command queue is introduced

#### Scenario: Request expansion and replay

- **WHEN** a retained tagged user message whose durable snapshot is present in the native latest-compaction context reaches primary or compaction context, including retained messages after replay or reload
- **THEN** its durable invocation snapshot is resolved through supported native session history and its request copy receives exactly one expansion, preserving content, foreign data, IDs and role without changing stored history or relying on model-message metadata
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
- **AND** recognized routing keys and serialized duplicate snapshots are excluded from provider input, expansion is stable across repeated requests, and malformed, unsupported, foreign and non-user metadata remains untouched in durable history
- **AND** new invocations write only ocBeadsWorkflow, without reconstructing old instructions from current command definitions or rewriting stored history

#### Scenario: Existing workflow authority and resource contracts

- **WHEN** any migrated workflow is invoked with action, help, guide, missing-input or explicit mode details
- **THEN** its existing purpose, common instructions, all installed skill/resource paths, required targets and acceptance ownership remain controlling with actual execution-derived actor/capabilities/native permission
- **AND** restore remains display-only absent --apply, compact --auto and --dolt each need separate authority, QuickStart uses current installed guidance, stats means issue-database overview, and no implicit administration, cascade, initialization or repair is inferred

#### Scenario: Snapshot retrieval is unavailable

- **WHEN** a retained workflow invocation cannot resolve its durable snapshot through the supported native history path
- **THEN** the request exposes the missing-guidance condition rather than silently inventing or reconstructing its instructions
- **AND** the integration does not re-admit the prompt, replay the operation or reinterpret stored text as new authority

#### Scenario: Model switch restores older transcript beyond the readable context

- **WHEN** native compaction on model A is followed by switching to model B that cannot replay A's native window, and the host restores earlier ordinary user messages whose snapshots are absent from the native latest-compaction context
- **THEN** affected historical workflow instructions or captured diagnostic reports are explicitly reported unavailable rather than claimed restored
- **AND** accessible current snapshots still expand normally; host-supplied replay content and Beads issues, notes and checkpoints are not rewritten or deleted

## ADDED Requirements

### Requirement: Documented snapshot-recovery deficiency

The package SHALL document unavailable historical workflow-snapshot recovery as an unresolved plugin deficiency with an upstream API blocker. User-facing documentation SHALL explain its trigger, impact and limits and link the upstream request. Accepting the limitation for a release SHALL NOT be described as resolving the deficiency.

#### Scenario: User evaluates the documented limitation

- **WHEN** a user reads the README's applicable compatibility/limitations section
- **THEN** it describes native compaction followed by an incompatible model switch, missing historical workflow instructions or captured reports, and unaffected Beads tracker data
- **AND** it links OpenCode #57424 and identifies the unresolved local follow-up without requiring Beads access to understand the limitation
- **AND** unreleased adaptation behavior is distinguished from the published beta's narrower host support
