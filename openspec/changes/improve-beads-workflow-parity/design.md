# Design

## Context

See [proposal](proposal.md) for motivation and [the decision packet](../../../docs/claude-code-integration-analysis.md) for pinned sources, every command/resource, current implementation evidence and qualification scenarios. Main starts at `c5c29f2e0cca98826658cc09b7806eb95afca360`; canonical specs are empty. OpenSpec 1.14.2 is already initialized for all accepted tools. Its live spec-driven schema applies; no generated integration or config rewrite is needed.

Current code attaches cached full prime to eligible requests, guards automatic store opening, refreshes on compaction/idle, and registers bounded workers. It ships no skill/commands and depends on bd-owned shared-skill discovery. Rich Claude resources add cognitive depth but contain conflicts and stale examples. Native V2 offers both executable plugin commands and file/JSON prompt commands. Current source/docs pin is 2.0.32; the project's qualified minimum remains 2.0.26.

## Goals / Non-Goals

**Goals:** preserve durable meaning across sessions; provide native access to the owner-selected full experience; keep dynamic CLI syntax separate from cognitive guidance; make ownership and routing explicit; test observable outcomes separately from prompt delivery.

**Non-Goals:** implementing product changes in this planning turn; migrating or inspecting this repository's store; blindly copying upstream; universal claims about host/model superiority; new orchestration/telemetry services; token or write quotas; exhaustive model matrices; bulk conversion of historical docs into specs. Advanced resources/admin commands remain owner choices, not silently excluded goals.

## Decisions

### 1. Owner gate precedes feature-specific design

**Accepted planning boundary, not owner feature acceptance:** this package contains common outcome contracts and a complete provisional adoption packet. Product implementation is blocked. The live CLI's `isPlanningComplete` reports artifact existence, not owner authorization.

Matt reviews F01–F12, the command/resource/ADR rows, delivery choices D01–D06 and extensions E01–E06. Record accept/adapt/defer/exclude, rationale, final native mapping, defaults, ownership and compatibility prerequisites. Grouped dispositions must explicitly cover their members. Record approval evidence/date and the reviewed revision, then revise this design, both deltas, proposal, tasks and inventory consistently and validate again. A later implementation request is required. Do not fill pending cells by inference or start a “safe subset” while selection is unresolved.

The alternatives are silently locking in recommendations or delaying all analysis until a decision. The former makes review a rubber stamp; the latter gives Matt nothing concrete to assess. This staged package makes the full choice reviewable now. Architecture-changing choices below are therefore **gate decisions**, not deferred implementation questions.

### 2. Separate behavioral authority from evidence and execution

OpenSpec owns intended touched behavior, docs retain rationale/source analysis, and Beads owns later execution tracking when authorized. Preserve the historical narrow comparison with a scope correction. Do not baseline unrelated existing implementation. No global config addition is needed because this change's gate is local to this proposal.

### 3. Layered guidance is the recommended candidate

Candidate layering: dynamic prime for current workflow/CLI/memory; focused runtime guidance for authority and recovery triggers; a selected skill entry for discovery; on-demand resources for checkpoint, memory selection, dependencies, handoff and advanced workflows. Keep the shared `.agents/skills/beads` upstream-owned. A supplemental skill or explicit native registration can provide depth; a deliberate replacement requires owner acceptance and collision policy.

Alternative: runtime guidance only keeps packaging simpler but may not recover resource discoverability. Alternative: copy the full rich tree risks stale MCP/CLI advice and overriding the lean skill. The gate chooses D04/D05/D06 before package layout or installation code is specified. Validate resource paths from an installed package if D04 is chosen, or ownership-preserving install/update/remove if D05 is chosen.

### 4. Native command routes remain real alternatives

D01 uses `ctx.command.transform` executors with `ctx.session.prompt`; qualification must preserve arguments, attachments and delivery, naming, user overrides and deregistration. D02 uses native `.opencode/commands/*.md` templates with optional description and argument placeholders; explicit file ownership must handle collision, modified files, upgrade and removal. D03 is a user-managed JSON alternative unless automatic ownership is expressly selected.

Recommendation favors static native templates when owner-managed files are acceptable, registration when package lifecycle ownership matters more. No final route or catalog size is selected. Never translate untrusted arguments into shell interpolation blocks; the current V2 docs say those execute outside agent tool permissions. Prompt entries should request normal authorized CLI operations. Minimum-host behavior needs a focused fixture before selecting APIs documented at the newer pin. No dependency bump is assumed.

### 5. Preserve meaning, not write volume

Recommended triggers: meaningful progress, failed approach, validated reusable discovery, decision change, blocker, handoff and logical stopping point. Task notes preserve current position and next action; retain significant prior evidence through notes/comments rather than erasing it. Search/recall supports reuse before recording overlapping memory. Reusable knowledge needs scope and evidence; temporary state stays with its task. No new data store/schema is proposed.

Recovery reads relevant task details and memories. The current cache is per session/audience and refreshed by compaction or idle, so it is not a sufficient freshness guarantee during continuous work. Prefer explicit targeted reads/refresh when relevant over full-prime polling or a new service. The selected implementation must report failed writes and incomplete recovery. No hook guarantees a final checkpoint on a crash; earlier meaningful checkpoints bound loss.

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
- [Native docs exceed supported host behavior] → Qualify selected interfaces at 2.0.26 before committing design; return to owner if compatibility requires changed scope.
- [File installs overwrite customizations or leave stale resources] → Explicit owner/hash/collision/removal contract if selected; no silent shared-skill replacement.
- [Guard/manual fallback conflict opens a held store] → Distinguish withheld from failed context across every selected surface; test the hold without opening production data.
- [Common requirements interpreted as feature approval] → Keep gate pending in artifacts and inventory; no implementation until accepted mappings and strict revalidation.

## Migration Plan

This turn has no product migration, runtime setup or store change. After the owner gate, revise the package first; then implement only accepted mappings in a separate authorized workflow. Preserve public behavior until an accepted change explicitly alters it. If files are installed, define ownership-aware upgrade/removal and preview collisions; if registrations are used, verify removal with the package. Publish scope/compatibility changes with qualification evidence. Roll back selected integration code/assets independently of Beads data; never promise that downgrading a plugin reverses a store migration.

## Gate record

Owner: Matt Jackson. Status: **pending**. Approval evidence/date/reviewed revision: **none**. All inventory dispositions: **pending**. Required next planning action: present the whole decision packet and record dispositions, then revise and validate. No implementation action is authorized by this record.
