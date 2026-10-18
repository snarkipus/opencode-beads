# Design

## Context

See [proposal](proposal.md) for motivation and [the decision packet](../../../docs/claude-code-integration-analysis.md) for pinned sources, every command/resource, current implementation evidence and qualification scenarios. The first-pass source baseline was `c5c29f2e0cca98826658cc09b7806eb95afca360`; this revision starts at published planning commit `7e710b6e5608bb8aef73fccadbd08e761a77a652`; canonical specs are empty. OpenSpec 1.14.2 is already initialized for all accepted tools. Its live spec-driven schema applies; no generated integration or config rewrite is needed.

Current code attaches cached full prime to eligible requests, guards automatic store opening, refreshes on compaction/idle, and registers bounded workers. It ships no skill/commands and depends on bd-owned shared-skill discovery. Rich Claude resources add cognitive depth but contain conflicts and stale examples. Native V2 offers both executable plugin commands and file/JSON prompt commands. The original source pin is development, despite its 2.0.32 package version. Released V2 2.0.32 is tag commit `843a6c514e606b436a7fe713422ace0a93ad3d61`; the existing minimum remains 2.0.26. See the [native assessment](../../../docs/opencode-native-parity-assessment.md) for release/package evidence and exact call sites.

## Goals / Non-Goals

**Goals:** preserve durable meaning across sessions; provide native access to the owner-selected full experience; keep dynamic CLI syntax separate from cognitive guidance; make ownership and routing explicit; test observable outcomes separately from prompt delivery.

**Non-Goals:** implementing product changes in this planning turn; migrating or inspecting this repository's store; blindly copying upstream; universal claims about host/model superiority; new orchestration/telemetry services; token or write quotas; exhaustive model matrices; bulk conversion of historical docs into specs. Advanced resources/admin commands remain owner choices, not silently excluded goals.

## Decisions

### 1. Owner gate precedes feature-specific design

**Accepted planning boundary, not owner feature acceptance:** this package contains common outcome contracts and a complete provisional adoption packet. Product implementation is blocked. The live CLI's `isPlanningComplete` reports artifact existence, not owner authorization.

Matt chooses N1 (recommended) versus N0 compatibility fallback, N2 continuation and X01–X09 dispositions, then reviews F01–F12, the command/resource/ADR rows, delivery choices D01–D06 and extensions E01–E06. Record accept/adapt/defer/exclude, rationale, final native mapping, defaults, ownership and compatibility prerequisites. Grouped dispositions must explicitly cover their members. Record approval evidence/date and the reviewed revision, then revise this design, both deltas, proposal, tasks and inventory consistently and validate again. A later implementation request is required. Do not fill pending cells by inference or start a “safe subset” while selection is unresolved.

The alternatives are silently locking in recommendations or delaying all analysis until a decision. The former makes review a rubber stamp; the latter gives Matt nothing concrete to assess. This staged package makes the full choice reviewable now. Architecture-changing choices below are therefore **gate decisions**, not deferred implementation questions.

### 2. Separate behavioral authority from evidence and execution

OpenSpec owns intended touched behavior, docs retain rationale/source analysis, and Beads owns later execution tracking when authorized. Preserve the historical narrow comparison with a scope correction. Do not baseline unrelated existing implementation. No global config addition is needed because this change's gate is local to this proposal.

### 3. Native continuity adapter is the preferred base

Recommend N1 from the native assessment: a narrow `ctx.tool.transform` adapter for model-selected checkpoint/recall/memory operations, backed by supported CLI arguments and Beads records; awaited context/tool hooks for recovery and feedback; an awaited compaction hook for already-prepared authorized writes and summary references; observational events for invalidation/status/cleanup. No new database, daemon or semantic transcript harvester. Scope state by actual location/session/audience, deduplicate operation acknowledgements, abort/dispose on unload and deletion, and preserve user overrides.

Typed writes should complete synchronously before acknowledgement; no deferred batching queue is proposed. Permission assertion must preserve existing shell/worker and location restrictions: a new default-allow custom action is not equivalent. Qualify that mapping or fall back to N0.

The model owns materiality, failed-approach interpretation, rationale and reusable-memory selection. Native interception provides timely opportunities and reliable acknowledgement on examined paths, not semantic correctness. Ordinary CLI workflows remain available. Re-read relevant task/memory state on recovery and meaningful transitions because external writers are not covered by a proven change feed. Primary and workers share continuity contracts; command-count delegation and bounded workers are not architectural prerequisites.

Recommend qualifying 2.0.32 and, after owner acceptance, raising the minimum to it for `ctx.permission.assert` in plugin-owned operations. This method is absent from published 2.0.26, although core hook/registration declarations are shared. N0 retains 2.0.26 with hooks and normally permissioned model CLI calls, giving up typed persistence acknowledgement. Do not silently run plugin-owned shell operations as the fallback. No peer dependency is changed by this plan.

Lifecycle: load registrations and abortable observers → first eligible request resolves authority/task and recovers relevant records → model selects meaningful writes → adapter validates, asserts permission, executes and acknowledges → targeted context refresh → compaction flushes only already-prepared authorized work and carries durable references → terminal observations expose status without forcing another turn → cleanup aborts observers, later recovery reads durable Beads state. Failed/ambiguous persistence remains visible; no exactly-once or crash-final-write promise.

### 4. Package-owned discovery supports the native runtime

Recommend D01 executable command registration plus D04 a distinct supplemental skill with installed asset paths. Commands forward arguments, attachments and delivery to `ctx.session.prompt`; skills/resources explain checkpoint semantics and advanced workflows without stale MCP examples. Preserve upstream shared-skill ownership. Check existing commands before registration (the command editor only exposes add), report collisions, and verify effective precedence after user/plugin overrides. Installed-package resolution and disposal are required qualification.

D02/D05 editable file installation remains a valid alternative if owner customization outweighs installer maintenance; D03 config remains user-managed; D06 guidance-only is the lower-discovery fallback. These are consequential alternatives to a recommendation, not equally preferred choices. Never interpolate untrusted arguments into command shell blocks, which bypass normal tool permission flow.

N2 may use host background child delivery for authorized long work and explicit checkpoint-then-manual-compaction. Host background notifications wake by default and no synthetic-admission veto hook was found; qualify cancellation/stop races before selecting background continuation, otherwise prefer blocking child return. Do not create a second job poller or resume on every stop/idle event. X03 nested delegation and X04 portable scanner are useful optional experiments with scoped qualification/fallback; X01 transport hooks and X02 terminal reads are assessed but not base memory mechanisms. X05 legacy V1 experiments, X06 released native compaction, X07 lower-level hooks, X08 adjacent domains and X09 development-only listing have explicit dispositions in the assessment. Experimental status alone is not a rejection reason.

### 5. Preserve meaning, not write volume

Recommended triggers: meaningful progress, failed approach, validated reusable discovery, decision change, blocker, handoff and logical stopping point. Task notes preserve current position and next action; retain significant prior evidence through notes/comments rather than erasing it. Search/recall supports reuse before recording overlapping memory. Reusable knowledge needs scope and evidence; temporary state stays with its task. No new data store/schema is proposed.

Recovery reads relevant task details and memories. The current cache is per session/audience and refreshed by compaction or idle, so it is not a sufficient freshness guarantee during continuous work. Prefer explicit targeted reads/refresh when relevant over full-prime polling or a new service. The selected implementation must report failed writes and incomplete recovery. No hook guarantees a final checkpoint on a crash; earlier meaningful checkpoints reduce potential loss. Public event callbacks cannot delay compaction. The awaited compaction hook may finish prepared authorized I/O, but cannot wait for the same runner to produce a semantic checkpoint. Do not initiate a new permission wait there; failed/timed-out persistence is disclosed and summary references must not claim success. Automatic semantic extraction via transient generation is a future opt-in seam only if evaluation justifies its cost and failure modes.

### 6. Make routing and extensions explicit

E01/E05 decide one-bead scope and mandatory delegation rather than entrench current command-count routing. Base workflows retain inspection versus mutation, atomic operation scope, acceptance checks and meaningful handoffs. If selected, a bounded worker can protect primary context while returning attempted approaches, discoveries, validation, blockers and references; autonomous continuation can remain an explicit policy. E02 Luna is a separately evaluated optional route, not the parity baseline. E03/E04 guards, permissions and limits remain transparent extensions governed by existing authority.

Guard notices must outrank generic prime-first/manual-recovery instructions. A runtime probe guard is not a shell sandbox. Instruction deduplication must not drop distinct profile/local policy merely because a marker matches. These constraints apply whichever delivery route is selected; exact changes to `guidance`, `host`, `context`, `guard`, `agents` and `instructions` depend on accepted mappings.

### 7. Qualification has two evidence layers

Deterministic tests cover selected context/retry/invalidation, guard/fallback distinction, resource resolution, command registration/arguments/ownership, routing and result delivery. Existing mocked tests and prompt-string assertions are useful but do not demonstrate model behavior. Extend only touched contracts and use disposable CLI fixtures after authorization.

Behavioral qualification uses the representative scenarios in the decision packet: progress plus failed approach; reusable discovery versus transient state; memory retrieval; compaction/resume/fresh-session recovery; atomic operation versus read-only graph/delegation; command workflow; hold/failure/closure. Record exact host/model/provider/reasoning/installation path and durable records. Compare the same model under host changes where feasible, model changes separately. Review recoverable meaning and actual operations, not write counts or self-report. Target repeat runs at ambiguity, not an exhaustive matrix. Record limits rather than claim universal superiority.

## Risks / Trade-offs

- [Rich resources contain stale or conflicting instructions] → Adapt selected meaning, reference current help, test reachability and authority, preserve provenance.
- [Additional guidance is ignored or competes with prime] → Focus advertisement/triggers and evaluate actual outcomes; do not equate prompt presence with compliance.
- [Freshness fixes increase repeated work] → Prefer relevant retrieval, test duplicate loading and cached staleness; avoid quotas or speculative polling infrastructure.
- [Delegation loses rationale or bounded workers stop prematurely] → Preserve semantic handoff and partial status; choose routing/defaults at the gate.
- [Rolling docs exceed releases] → Use the released pin and published declarations. Qualify N1 at 2.0.32 or explicitly choose N0 at 2.0.26; no development-only session listing. Return consequential compatibility changes to the owner.
- [File installs overwrite customizations or leave stale resources] → Explicit owner/hash/collision/removal contract if selected; no silent shared-skill replacement.
- [Guard/manual fallback conflict opens a held store] → Distinguish withheld from failed context across every selected surface; test the hold without opening production data.
- [Common requirements interpreted as feature approval] → Keep gate pending in artifacts and inventory; no implementation until accepted mappings and strict revalidation.

## Migration Plan

This turn has no product migration, runtime setup or store change. After the owner gate, revise the package first; then implement only accepted mappings in a separate authorized workflow. Preserve public behavior until an accepted change explicitly alters it. If files are installed, define ownership-aware upgrade/removal and preview collisions; if registrations are used, verify removal with the package. Publish scope/compatibility changes with qualification evidence. Roll back selected integration code/assets independently of Beads data; never promise that downgrading a plugin reverses a store migration.

## Upstream review and execution-scope recommendations

Track selected source roots against a reviewed upstream release and resolved commit. Prefer path-scoped Git comparison with a candidate stable release through the existing scheduled contract workflow where practical. Detect added, deleted, renamed and modified paths; incomplete comparisons are errors, not no drift. Create/update one deduplicated GitHub review issue with immutable identities, changed paths and diff links. Isolate issue-write permission from read-only comparison. Never auto-copy files, advance the reviewed baseline, bump packages or publish releases. Human disposition may adopt an adaptation, accept no local change, or defer. The owner selected adding this capability; exact coverage follows corpus dispositions. Hashes remain optional integrity evidence, not the prescribed monitoring interface.

Atomic claiming is distinct from invocation scope. The pinned upstream task agent repeats ready/claim/execute/close. Recommend scope-bounded continuation: an exact one-bead assignment stops after that bead; an explicitly authorized batch/goal may continue across actionable beads in scope, preserving per-bead checkpoints and validation. Discovery alone does not authorize new work. Stop on scope exhaustion, a blocker requiring a decision, denied authority or cancellation and report partial progress/next action. One-bead mode remains useful for orchestrators, reviews and risky work, but is not assumed as the universal base. This recommendation remains pending at E01/E05/N2; no default change is approved. Qualify exact-assignment stopping, authorized continuation and no discovery-driven scope expansion.

## Gate record

Owner: Matt Jackson. Status: **pending**. Approval evidence/date/reviewed revision: **none**. All inventory dispositions: **pending**. Required next planning action: present the N1/N0 recommendation with complete corpus coverage, N2 and experimental/version dispositions; record owner acceptance, then revise and validate. No implementation action is authorized by this record.
