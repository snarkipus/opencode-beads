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

The integration SHALL target bounded qualification on exact OpenCode 2.3.0, 2.4.1, and 2.4.2. Registration and diagnostics SHALL share `>=2.3.0 <2.4 || 2.4.1 || 2.4.2` as the stable host selector and report refusal outside it. Admission SHALL NOT imply measured compatibility. The integration SHALL preserve existing pins and SHALL NOT retain a 2.1 compatibility layer or silently migrate installations. Publication remains separately authorized.

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

The package SHALL expose integration and native Beads observations through `oc-beads:diagnostics`. Ordinary collection SHALL use local evidence and strict-readonly native store access without changing user configuration, contacting the sync remote or fetching. If qualified remote observation is enabled, diagnostics SHALL disclose its native effects. Diagnostics SHALL distinguish unavailable, failed, withheld and uncertain outcomes without credentials, repairs or background scans.

#### Scenario: Discovery collision

- **WHEN** a user customization prevents an owned entry from taking effect
- **THEN** diagnostics reports effective names/descriptions and detectable overrides while preserving native user-config precedence
- **AND** a description mismatch may identify an override but SHALL NOT be presented as proof of ownership; public owner identity and identical-description overrides remain unobservable, with explanations retained in explicit details and documentation
- **AND** command registration status reflects actual registration and lookup outcomes rather than an obsolete blanket hold

#### Scenario: Integration health and issue overview are requested

- **WHEN** a user invokes diagnostics or stats
- **THEN** ordinary diagnostics collection uses version, config-only context, qualified native hook listing, strict-readonly native remote listing, cached integration state and bounded local file observations, while stats remains an issue-overview workflow using `bd status` (alias `bd stats`)
- **AND** version/workspace/protocol observations do not certify SQL health or complete native memory delivery
- **AND** diagnostic safety and observed qualification limits are preserved; the report identifies the loaded plugin package name/version from its own manifest alongside the observed host version, without inferring a unique build fingerprint

#### Scenario: Compact diagnostic history

- **WHEN** diagnostics is invoked with optional free text and native attachments/delivery
- **THEN** history shows the compact command and exact free text, while the dynamic report is captured once in a durable invocation snapshot and expanded only through primary/compaction hooks
- **AND** replay preserves the captured observation without regenerating diagnostics, duplicating instructions, mutating persisted input or expanding auxiliary requests; older v1 snapshots are replayed as captured without boundary backfill, and generic workflow payloads remain unchanged
- **AND** the captured report is fully populated and rendered deterministically by plugin code; new diagnostic instructions delimit it with literal BEGIN_DIAGNOSTIC_REPORT / END_DIAGNOSTIC_REPORT lines and actual newline separators before the preserved invocation, requesting only the report with values/labels/order/Markdown intact and no markers, invocation or added commentary; subsequent model relay is guidance, not guaranteed verbatim presentation

#### Scenario: Diagnostics is overridden or unloaded

- **WHEN** a user override is added or removed, or package diagnostics is unloaded while pending
- **THEN** native override precedence, package restoration after override removal and disposal are preserved, user-owned old status remains untouched, and unloaded work submits no late prompt

#### Scenario: Qualified local probe boundary

- **WHEN** diagnostics collects native evidence in a confirmed session location
- **THEN** ordinary collection adds only `bd --readonly dolt remote list --json --sandbox` to `bd version`, `bd context --json` and `bd hooks list --json`, using bounded execution and preserving existing plugin-disposal cancellation and location restrictions
- **AND** the existing diagnostic environment remains scoped to child processes and suppresses native metrics/export effects without changing user configuration; strict readonly preserves ordinary no-mutation intent, disables native auto-start/maintenance and does not fetch; a server-backed listing uses its native database connection, not a sync-remote reachability check
- **AND** collection never substitutes prime, doctor, where, explicit upgrade/migrate, SQL, initialization, hook installation, hook execution or synchronization; ordinary full-prime lifecycle behaviour remains separate and unchanged
- **AND** the submitted diagnostics prompt retains ordinary full prime and memories, which may open or migrate a store under native rules; neither strict-readonly collection nor help changes that later lifecycle

#### Scenario: A collector is incomplete

- **WHEN** a probe fails, returns an unsupported shape, or a bounded local file observation is unreadable or truncated
- **THEN** normal output identifies the producer through a precise row label and literal unavailable/partial value; explicit details identifies its scope and limitation, without treating failure as absence or fabricating a measured success
- **AND** independent observations remain useful, secrets and raw configuration are omitted, and no diagnostic result changes runtime admission or repairs the underlying condition

#### Scenario: Explicit remote observation is requested

- **WHEN** exact trimmed case-insensitive `remote` or `details remote` is invoked in a confirmed workspace with an established native target and a qualified native exact-branch comparison for that context
- **THEN** diagnostics performs one bounded native observation that fetches the selected peer's corresponding current branch and compares the fetched tip, through the existing callback/runner; the fetch may write local objects and refs
- **AND** command purpose and static help/docs disclose remote contact, local fetched objects/refs/cache, native version-bump maintenance/migration and applicable native CLI-remote preparation; diagnostics does not invoke synchronization, merge, push or standalone migration/repair commands
- **AND** invocation requests the bounded operation under applicable authority and host semantics; no new typed-tool permission machinery, human-origin guarantee, per-invocation abort promise, retry or polling is introduced
- **AND** existing timeout and plugin-disposal cancellation remain effective and unloaded work submits no late report

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

### Requirement: Documented snapshot-recovery deficiency

The package SHALL document unavailable historical workflow-snapshot recovery as an unresolved plugin deficiency with an upstream API blocker. User-facing documentation SHALL explain its trigger, impact and limits and link the upstream request. Accepting the limitation for a release SHALL NOT be described as resolving the deficiency.

#### Scenario: User evaluates the documented limitation

- **WHEN** a user reads the README's applicable compatibility/limitations section
- **THEN** it describes native compaction followed by an incompatible model switch, missing historical workflow instructions or captured reports, and unaffected Beads tracker data
- **AND** it links OpenCode #57424 and identifies the unresolved local follow-up without requiring Beads access to understand the limitation
- **AND** current 2.3 integration behavior is distinguished from the published beta's narrower host support

### Requirement: Optional named task-agent profiles

The integration SHALL offer independent opt-in Luna Max and Terra Medium task-agent profiles alongside its unchanged model-inheriting default. Fixed profiles SHALL select explicit provider, model and reasoning variant without changing the parent route or silently falling back. All profiles SHALL preserve existing Beads scope, permissions, context, ownership and lifecycle behavior and native user-configuration precedence.

#### Scenario: Existing configuration remains unchanged

- **WHEN** neither option is enabled, or only existing `luna: true` is enabled
- **THEN** the default `beads-task-agent` remains model-inheriting
- **AND** Luna is absent unless enabled, and enabled Luna retains `beads-task-agent-luna` with `openai/gpt-6-luna` at `max`
- **AND** Terra is not registered without `terra: true`

#### Scenario: Terra is selected independently

- **WHEN** `terra: true` is enabled and Luna is not enabled
- **THEN** `beads-task-agent-terra` is registered with `openai/gpt-6.1-terra` at `medium` alongside the unchanged default
- **AND** no Luna profile is added and the parent session route is unchanged

#### Scenario: Both fixed profiles are selected

- **WHEN** `luna: true` and `terra: true` are enabled together
- **THEN** the default, Luna and Terra profiles are independently selectable with their respective routing
- **AND** selecting a profile does not authorize additional work, synchronization, publication or closure

#### Scenario: Terra participates in the existing task-agent lifecycle

- **WHEN** a Terra task agent executes a permitted read-only assignment or authorized task
- **THEN** it receives the same applicable Beads context, guidance, interruption cap and permission rules as the other task-agent profiles, with identity derived from its actual invoking session and agent
- **AND** existing stop, partial-result, ownership and parent-acceptance requirements remain controlling
- **AND** native configuration overrides and plugin disposal apply without changing unrelated user artifacts

#### Scenario: The configured provider route is unavailable

- **WHEN** an enabled fixed profile cannot use its configured provider, model or variant
- **THEN** the host-reported inability is preserved without a plugin-selected substitute model or a claim of successful execution

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

### Requirement: Actionable observational health report

Diagnostics SHALL render fixed compact Markdown Plugin / Beads tables and labeled header metadata with Check / Status / Value columns. Assessed checks SHALL roll up to healthy ✅, mismatch ⚠️ or unhealthy ❌. Neutral incomplete fields SHALL remain visible without heading counts. Normal output SHALL omit full evidence and routine provisos; explicit details SHALL retain bounded evidence and explanations. Conditional actions SHALL state concise effects and verification.

#### Scenario: Findings need different responses

- **WHEN** the same report contains a real integration incompatibility, native maintenance advice and unknown historical completion
- **THEN** normal output distinguishes known integration failures as unhealthy, observed setup differences as mismatch and incomplete observations as neutral fields; explicit details retains producer, scope, observation time, meaning and limits
- **AND** normal output has no default provisos or limits line; conditional short actions state useful effects and a check, while detailed explanations are available on request
- **AND** section and overall severity use unhealthy > mismatch > healthy, neutral fields are visible but excluded from severity and heading counts, and no assessed checks remains neutral
- **AND** header metadata places DATE, VERSION and PATH in separate rendered paragraphs immediately after the title and before the summary, without repeating them at the bottom; DATE uses exact capture time, VERSION the executing manifest name/version, and PATH observed native cwd_repo_root or explicit not observed, without inference, path stripping, slash appending or implicit cwd fallback; native beads_dir remains in details and observed host/CLI versions stay in their rows; unmeasured schema/maintenance rows and default persistence uncertainty are omitted while actual unresolved writes remain concise; Git hooks, Sync target and Remote history are the three remote-related rows, including neutral target/history observations
- **AND** success is limited to the observed check; neither a loaded version label nor an admitted version is evidence of unique build identity or fresh live qualification

#### Scenario: Native hook report is available

- **WHEN** native hook-list output reports missing, installed, shim or outdated entries
- **THEN** normal output extends the single Git hooks row with concise installation counts and independently established safe warnings; explicit details retains bounded native entries and their observation scope
- **AND** installed shims are healthy observed installations, without CLI-version comparison or inferred execution/configuration health; static installation never proves successful execution or current wrapper policy
- **AND** absent optional hooks and ambiguous native false-installed entries are neutral and receive no mismatch or installation demand, including an established local-only setup; a native false installed flag remains a missing/unreadable/unresolved observation, not proof of a broken file
- **AND** positively observed outdated or unrecognized installed entries, or a safely observed runtime/configuration warning, are mismatch; a failed/unavailable listing is neutral and does not establish absence
- **AND** concise review/refresh advice for observed installation problems identifies hook/configuration writes and applicable layout review, recommends verification with native hook listing, and never runs installation

#### Scenario: Hook warning and native target disagree

- **WHEN** an existing allowlisted native observation actually reports a no-configured-remote hook warning while independent native evidence resolves the target
- **THEN** Git hooks retains the warning and Sync target remains Resolved with separate provenance; neither finding overwrites the other
- **AND** diagnostics never adds a warning collector or executes a hook to obtain this evidence; without an allowlisted observation it reports no warning, because missing configuration and source-code knowledge are not observed warnings

#### Scenario: CLI witness is inspected

- **WHEN** a local CLI version witness is readable alongside an observed CLI version
- **THEN** the Recorded bd version row shows the bounded recorded value; the value states equality or difference from the CLI without history inference; equality is healthy, difference is mismatch rather than unhealthy, and missing/unreadable/unsupported values remain neutral literal fields
- **AND** neither equality nor difference establishes SQL schema, reconciliation, hook freshness or maintenance completion, produces migration advice, or affects context or typed-operation admission

#### Scenario: Remote or historical maintenance freshness is requested

- **WHEN** diagnostics has only local evidence
- **THEN** normal output shows Sync target from the available native evidence and Remote history as Not checked, or Not applicable only for established local-only operation; details identifies missing evidence and states source-Git freshness is not checked
- **AND** configured remote presence is a bounded hint without URL or credentials, never proof of effective resolution, connectivity or freshness; absent config fields and absent hooks establish neither local-only operation nor failure
- **AND** ordinary collection uses strict-readonly native remote listing without sync-remote contact, fetch, pull, synchronization or a custom resolver
- **AND** release-note maintenance applicability and completion remain unmeasured; details points to reviewable native release guidance rather than prescribing a sequential SQL migration chain

#### Scenario: Normal and requested details are captured once

- **WHEN** diagnostics is invoked normally or with an exact trimmed case-insensitive `details`, `help`, `remote` or `details remote` selector
- **THEN** exact `details` captures bounded evidence with the compact tables; exact `help` selects a static self-contained reference before collection, file reads or registry probes; exact `remote` and `details remote` request a comparison with normal tables or bounded evidence respectively, but report Not checked when no qualified producer is available and Not applicable for established local-only; bare or other text selects local normal tables without full evidence JSON
- **AND** `details remote` evidence distinguishes a successful fresh Beads history comparison, an attempted failure and an unperformed comparison; it does not claim a completed comparison was not checked or imply that source-Git freshness was checked
- **AND** exact free text, attachments/delivery, user overrides and the one-time v1 snapshot/replay path are preserved without recollection
- **AND** static help explains markers, each row/source/state, useful remedies/checks and limits, links the repository diagnostics reference and preserves the ordinary subsequent prompt/prime lifecycle
- **AND** author-facing relay instructions request faithful presentation but do not guarantee host-rendered or byte-exact model output

#### Scenario: Incomplete evidence and command clipping

- **WHEN** a command registry observation is incomplete or descriptions are clipped
- **THEN** the existing membership-truncation flag is exposed separately; complete membership may support measured present/expected command-name counts using the existing definition inventory, despite partial description comparison; description-cap evidence appears only in details, and incomplete membership remains explicit and neutral while retaining any comparable observed description changes
- **AND** unknown membership or description equality does not prove missing commands, ownership or no override, and incomplete fields do not become measured mismatches or defects
- **AND** a report with no assessed checks remains neutral rather than fabricating healthy

#### Scenario: Remote findings contribute to the summary

- **WHEN** the report contains target/history observations alongside plugin and local Beads observations
- **THEN** Local-only and Resolved assess only the target check; In sync assesses only a fresh successful history comparison; Unknown, Not checked and Not applicable are neutral and excluded from severity
- **AND** Unresolved, Local ahead, Remote ahead, Diverged and an actually attempted Check failed contribute mismatch, not an automatic unhealthy local-store or Plugin verdict
- **AND** the existing worst-assessed-check roll-up is retained, with a concise summary saying Remote history not checked whenever applicable so a healthy heading cannot imply synchronization; no assessed checks remains neutral
- **AND** Local ahead is described as unpublished work, with short review/sync-under-separate-authority actions and no corruption claim, automatic sync, retry, repair or migration advice

### Requirement: Managed guidance and skill visibility

Diagnostics SHALL distinguish bounded project-file observations, effective skill registration and request-time instruction observations. It SHALL identify managed block types, duplicates, retained/reduced blocks, shared-skill presence and detectable plugin-skill overrides without rewriting files or asserting semantic freshness, contradiction or actual model use from presence alone.

#### Scenario: Managed instructions accompany prime

- **WHEN** an observed request reduces complete managed bodies already present in attached prime or retains other marked bodies
- **THEN** normal output uses the exact AGENTS Configured label with bd block or duplicate bd blocks for recognized markers; no marker, missing file and unreadable/truncated observations remain neutral rather than broken or semantically complete, and explicit details alone retains bounded root-file/request counts and their observation times, preserving the exact-body reduction rule
- **AND** repeated full blocks are a mismatch needing review; Codex/minimal blocks are recognized configuration markers; retained bodies alone are informational. Raw marker counts and request instrumentation remain details-only, without runtime harness inference. Explicit details explains potential customization rather than asserting conflict or obsolescence
- **AND** no request observation means unobserved, not zero blocks; root-file counts are separate from actual request counts, and unmarked prose is not classified

#### Scenario: Shared or overriding skills are present

- **WHEN** the shared Beads skill is missing or unreadable, a named Beads skill is effectively registered alongside oc-beads, or a detectable oc-beads candidate collision occurs
- **THEN** diagnostics distinguishes file presence/readability, effective registry evidence and collision evidence without treating a shared-skill absence as plugin failure or presence as use/freshness
- **AND** user overrides and unrelated files are preserved; any optional native setup advice discloses its broader instruction/hook writes and is never executed by diagnostics
- **AND** the plugin does not recommend installing `bd setup opencode`; any optional removal of redundant legacy guidance requires review of local customization

### Requirement: Context observation provenance

Diagnostics SHALL report cached context status, available load time and the CLI version observed for that load, independently of current CLI/workspace observations. It SHALL distinguish missing evidence, withheld, failed, loading, empty and ready context and preserve existing invalidation behavior without refreshing context solely for diagnostics or claiming to observe external writes.

#### Scenario: Context observation is absent or old

- **WHEN** the diagnostic snapshot has no cache entry, lacks provenance, or precedes a later request
- **THEN** it reports missing or unobserved evidence at capture time without asserting that no eligible request occurred or that integration is persistently broken
- **AND** loading, withheld, empty and failed states retain their distinct meanings; an observed ready state does not certify complete native memory delivery

#### Scenario: Runtime or workspace changes after context load

- **WHEN** a current observed CLI version differs from the version associated with cached context or external state might have changed
- **THEN** diagnostics reports the version difference and available load time as freshness evidence with supported next-session or configured idle-refresh guidance
- **AND** age alone does not prove staleness, typed-write invalidation remains in effect, and unobserved shell or external writes remain a limitation in details/documentation
- **AND** instruction observations describe the last observed request rather than implying automatic synchronization with later file or hook edits

### Requirement: Evidence-based native sync target

Diagnostics SHALL derive Local-only, Resolved or Unknown from native context and strict-readonly remote-list evidence for the selected native default-name seam. Unresolved is reserved for positive evidence from an allowlisted native producer that an expected target failed resolution; the current listing supplies no such evidence. Target status SHALL remain independent of hooks, connectivity and history. The plugin SHALL NOT reconstruct native routing or guess Git origin.

#### Scenario: Native origin is listed

- **WHEN** complete successful native listing contains `origin` in an unambiguous supported direct Dolt context
- **THEN** Sync target is Resolved and identifies only the native remote name; a qualified explicit history observation, if available, selects that same `origin`
- **AND** resolution proves neither connectivity nor synchronization; missing hooks or YAML configuration do not negate it

#### Scenario: Native listing establishes local-only operation

- **WHEN** a complete successful native listing is empty in a confirmed embedded Dolt context
- **THEN** Sync target is Local-only and Remote history is Not applicable
- **AND** details explains that native push may offer Git-origin adoption with consent; diagnostics never adopts a remote or promises permanent local-only operation

#### Scenario: Target evidence is ambiguous or fails

- **WHEN** listing is empty in server mode, contains only non-origin remotes, fails or is incomplete, or native context is missing, conflicting, unrecognized, non-Dolt or proxied-server
- **THEN** Sync target is Unknown with the actual evidence limitation, rather than local-only or an invented failure
- **AND** a native embedded label accompanied by server endpoint evidence is conflicting evidence; the plugin retains the smallest native mode projection without reproducing config/environment precedence
- **AND** Unresolved requires positive native evidence of an expected target's failed resolution; generic listing errors or missing configuration are insufficient, and no speculative error classifier is required
- **AND** a configured but unreachable target is never recast as Local-only; target/history failures never change runtime admission

### Requirement: Fresh native remote history evidence

Only exact explicit remote selectors SHALL trigger a qualified native exact-branch comparison. Comparative states SHALL require evidence that the current invocation fetched the selected peer's corresponding native branch and compared that fetched tip. Generic fetch success, reachability, cached counts and transport hashes are insufficient.

#### Scenario: No fresh comparison is performed

- **WHEN** the target is Local-only, no remote selector was requested, the target/context is unknown, unresolved or unsupported, or no qualified native exact-branch operation is available before spawn
- **THEN** Remote history is Not applicable for Local-only and otherwise Not checked with an unperformed/unsupported/withheld reason in details
- **AND** without a qualified native operation there is no fetch; Beads 1.3.1 and 1.3.4 have no qualified history probe, and exact remote selectors explain this limitation
- **AND** ordinary/details remains local without fetch; known proxied-server mode is unsupported rather than an attempted history failure
- **AND** `remote please`, reversed tokens or other non-exact selector text does not trigger a remote operation

#### Scenario: Fresh native comparison succeeds

- **WHEN** the requested native observation establishes that the exact branch existed at the selected peer during this fetch and returns valid nonnegative integer ahead/behind counts against the fetched tip
- **THEN** zero/zero means In sync, positive/zero Local ahead, zero/positive Remote ahead, and positive/positive Diverged
- **AND** details records producer, time, scope and native effects; it does not invent a branch-name field absent from the producer or compare Git transport hashes with Dolt commits
- **AND** Local ahead describes unpublished work, not corruption; the result is captured once and replayed without rerunning any probe

#### Scenario: An attempted history observation fails

- **WHEN** a started qualified command times out, exits unsuccessfully, reports a missing branch or failed reachability, or lacks a valid comparable selected-peer result
- **THEN** Remote history is Check failed with a concise bounded sanitized actual reason if report submission remains available; negative/missing counts and malformed output are failed comparison evidence
- **AND** cached counts are discarded whenever branch freshness is not established, even when native process exit or reachability indicates success; URLs and credentials never enter the captured report or details
- **AND** unsupported/withheld operations skipped before spawn remain Not checked, disposal prevents late prompt submission, and no failure starts retries, synchronization or repair

#### Scenario: A native exact-branch producer is considered for enablement

- **WHEN** a released supported native operation is proposed for fresh comparison
- **THEN** enabling it requires separate approval and disposable qualification proving the comparison binds the same invocation, peer, branch and fetched tip
- **AND** qualification covers unchanged and changed remote tips, a missing branch with a cached tracking ref including an empty destination, and an unreachable destination; a missing or unverified branch never yields comparative counts
