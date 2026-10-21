# Opus source review — eleven-operation code-mode candidate

Review: `opencode-beads-co7`. Actual reviewer: `claude:aa15a6fe`, Claude Opus 5.5, requested medium effort. Session `aa15a6fe-0427-4c80-a763-9d64cb6d12cc`. Completed with `is_error=false`, `terminal_reason=completed`, no permission denials or spawned subagents.

Candidate: local delta over `f2d6617619e2c3a35e4aeadd5be0092259b9979c`; frozen 44-path manifest `/opt/data/cache/scratch/opencode-codemode-opus-source-review/manifest.json`. Parent verified all candidate hashes unchanged after review and independently inspected the cited host recovery overwrites. This report is evidence-only, outside the reviewed manifest. No correction, source acceptance, task markers, publication or activation follows from this verdict.

## Reviewer report (verbatim)

**Verdict: REVISE** for this source candidate. There is one medium defect, and the fix is small. Everything else I checked meets the standards and the spec.

## Standards

The code follows AGENTS.md: strict ESM, `import type`, `node:` imports, and indexed access handled. Plugin and Beads responsibilities stay separate: no compatibility code for upstream, and no claim of absolute store confinement.

Nonblocking smells (none needs a change for acceptance):
- **Duplicated write list.** The list of write operations appears twice, at `src/continuity.ts:240` and `src/host.ts:287`. Adding a twelfth operation would mean editing both. Exporting one set would fix it.
- **Thin wrapper.** `OperationDefinition` (`continuity.ts:184-191,239-242`) only wraps four separate per-operation switches (`validate`, `argv`, `outputFor`, `normalize`). It adds a layer without bringing the per-operation logic together.
- **Hard-to-read one-liners.** `continuity.ts:153,157,159,209` are dense. Line 209 is hardest to review.
- **Hand-repeated rules.** The input JSON Schema and `validate()` restate the same rules by hand, e.g. the status enum at `:61`, `:128` and `:134`. That is acceptable given the rule against adding a validator framework, but the two copies can drift apart.
- **Dead check.** The `assignee !== null` check at `:206` can never matter, because `isIssue` (`:78`) already rejects a null assignee.

## Spec

**Medium: later events overwrite the recovery state of an uncertain write.**
- **Where:** `src/host.ts:299-302`, consumed at `:365-366`. The same pattern exists before this change at `:392-394`.
- **Trigger:** `gaps` and `recoveryCues` hold one value per session. `rememberResult` now also writes them for read `failed` results and for `complete === false`. The routine case is a ready/list `find` with more than 20 matches, since the default limit is 20.
- **Consequence:** suppose a claim or note comes back `uncertain`, or a started write is aborted. Its gap records the operation, target and actor. A capped `find`, a failed `get`/`recall`, or a later `session.execution.interrupted` event then replaces that gap. Compaction (`:366`) and the next recovery cue no longer carry the write's target and actor.
- **Why it matters:** for an aborted write, the recovery state is the only place this information lives, because the tool throws instead of returning a result. That breaks three spec scenarios:
  - "Compaction carries known … uncertain status" (`specs/work-continuity/spec.md:81-84`).
  - "Interrupted append … exposes the uncertainty" (`:108-111`).
  - "result or recovery state preserves operation, target/query, actual actor" (`:123-126`).
  - It also contradicts `CODE_MODE.md:64-66`.
- **Why it's new now:** code mode composes many reads per step, which makes this overwrite routine. The candidate is what widened the overwrite to reads.
- **Smallest fix:**
  - Let only write outcomes (`uncertain` / `landed-uncommitted` / interrupted write) set or append to `gaps`. Read partials and failures are already returned to the caller in the result.
  - Make the interrupted-event path append to an existing gap instead of replacing it.
  - Add one host test: uncertain or aborted write, then a capped `find` and an interrupt event, then compaction still contains the write's target and actor.

The rest of the spec checks out:
- **Fixed namespace:** exactly eleven operations in namespace `beads`, code-mode-only (`continuity.ts:55,279`).
- **Input contracts:** declared with `additionalProperties:false`, and `validate` rejects unknown keys.
- **Output contracts:** a separate output shape for each outcome, and only evidenced CLI results count as acknowledged (`:192-234`).
- **Fixed argv:** the subcommand comes first in the permission resource; `--sandbox`, plus `--actor` on writes, goes before `--` (`:287-290`).
- **Option-like text:** titles go through `--title`, and free text goes after `--` or as a flag value.
- **Identity:** the actor comes from session and agent (`:46-53`). The same actor is shown to the model (`context.ts:56`) and checked again before each spawn (`:345`). The permission identity separately uses `context.agent` (`:299`).
- **Permissions:**
  - Uses the native `permission.assert` with `save: []`.
  - Abort rejects the pending permission wait, so a late approval can never start the process (`:302-312`).
  - Guard, location and actor are rechecked before every spawn, including each `get` (`:340-346`).
- **Outcomes:**
  - `not-claimed` requires the observed structured conflict (`:253-260`).
  - Malformed or failed writes report `uncertain`; there are no retries.
  - `get` keeps per-ID failures; `complete` is `true`, `false` or `null` per view (`:209`).
  - A started write that is aborted still notifies before rethrowing (`:361-365`).
- **Context and guidance:**
  - Writes invalidate all cached context.
  - Guidance depends on the request's actual capabilities (`guidance.ts:87-91`).
  - Shell is direct-only.
  - Commands total 29 workflows plus `status`, i.e. 30; the skill requires exactly 17 links.
- **No activation leakage:** tools register only with the test-only `continuityQualified === true` (`host.ts:308`). Status reports them as "withheld pending 1.1".

**Nonblocking observation:** an update that removes an issue's *last* label may come back `uncertain` even though it landed. `normalize` requires the `labels` array (`continuity.ts:224`), and Beads might leave that field out when it's empty. I haven't confirmed this. The contract run only covered removing a label while another remained (`docs/opencode-sdk-contract.md:49`). One more disposable 1.3.1 contract case would settle it.

## Evidence / remaining gates

- **What I read:**
  - `candidate.patch`, for the old versions of the host gap and cue lines.
  - Frozen `src/{continuity,host,context,workflows,guidance}.ts` and `assets/oc-beads/resources/CODE_MODE.md`.
  - Parts of `tests/host.test.ts` and `scripts/bd-contract.ts`.
  - The `work-continuity` spec.
  - The `opencode-sdk-contract.md` ledger, lines 20-99.
- **What I did not do:** I ran nothing. The rest of the spec and planning docs were only checked through targeted searches.
- **Evidence from the parent and worker, not re-verified by me:**
  - `bun test`: 190 pass / 0 fail.
  - Typecheck: exit 0.
  - Packed package: exit 0, SHA `86f781ba…`.
  - Docs tests: 14/14.
  - Worker's 1.3.1 contract run: 63 checks passed (`minimum131-contract.log`).
- **Still pending, outside source review:** the live host test, explicit Stop/handoff, installed discovery and model workflows, and unload/reactivation (gates .2/.6/.9). Their pending state is not why I'm asking for revision.
- **Scope of this verdict:** it covers this source only. It does not accept or activate anything.
