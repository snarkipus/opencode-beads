# Opus corrected-source recheck — vuy.10

Review `opencode-beads-co7`; actual Claude Opus 5.5, requested medium, same reviewer session `aa15a6fe-0427-4c80-a763-9d64cb6d12cc`. Verified completed, `is_error=false`, no permission denials. Corrected 44-path manifest `/opt/data/cache/scratch/opencode-codemode-opus-source-recheck/manifest.json` matched working source after review. Only `src/host.ts` and `tests/host.test.ts` changed from the original reviewed source. Original REVISE remains in `opus-code-mode-source-vuy10.md`. Parent independently passed 191 tests, typecheck, packed-package validation and whitespace checks.

This evidence-only report is outside the frozen manifest. READY is source review, not live qualification, release or activation. Optional observations remain nonblocking; no remediation is authorized by their inclusion.

## Reviewer report (verbatim)

**Verdict: READY.** The original medium finding is resolved, and the correction introduces no material regression.

## Finding disposition

The medium finding (later events overwriting an uncertain write's recovery state, `src/host.ts:299-302/365-366/392-394`) is **resolved**. Each part checked against the frozen files:

- **Bounded retention.** `gaps` now holds a set of distinct unresolved details per session (`snapshot/src/host.ts:139,144-149`). It keeps at most 32 details plus one overflow line that says earlier details are retained. That is a set of strings, not an event log.
- **Reads stay out of the gap set.** Only write outcomes call `recordGap` (`:314`). Read failures and `complete === false` now set only the one-shot recovery cue (`:315`), and those results are also returned to the caller. A capped `find` or failed `get` can no longer displace a write gap.
- **Success doesn't erase uncertainty.** No success path removes an entry. An acknowledged write later to the same target leaves the earlier uncertain entry in place.
- **Interruption appends.** Execution or compaction stopping now adds a generic entry (`:408`) and no longer overwrites the specific ones.
- **Rendering.** Every request now shows the retained gaps together with the one-shot cue (`:368-371`). Only the cue is deleted after use. Compaction (`:380-381`) and status (`:276`) show the same set. An aborted write still reaches `rememberResult`, because the existing notify-before-throw path in `continuity.ts:361-365` is unchanged.
- **Cleanup.** Session deletion and move clear gaps (`:162`), and unload clears them all (`:179`).

## Standards

The change is small and matches the surrounding code: JSDoc comments on both helpers, the same Map/Set idiom used for `references`, and no new abstractions. Nothing in argv, normalizers, CLI handling or versions changed.

## Spec

The work-continuity scenarios at `spec.md:81-84`, `:108-111` and `:123-126` are now met in source. Compaction and recovery keep the operation, target, actor and uncertainty across later reads, later successes and interruptions. Nothing triggers persistence and nothing retries. Other sessions stay isolated.

## Correction-caused regressions

None are material. Two low, nonblocking observations:

1. **Gap text is now in every request.**
   - **Where:** `host.ts:313-314` builds each gap from `JSON.stringify(result.target)` plus `result.detail`.
   - **Trigger:** an uncertain `create`. Its target object carries description, acceptance and design (each up to 64k characters), and its detail can include CLI stderr and stdout.
   - **Consequence:** these gaps are now rendered on every request for the rest of the session, not just at compaction or status. Before, the cue was shown once. A large uncertain create therefore enlarges every later request.
   - **Fix if wanted:** cap the length of each rendered detail, or render create targets as title/type only.
2. **Gaps never clear within a session.** This is the intended conservative trade-off: entries are bounded and removed when the session is moved or deleted.

## Evidence

- **What I inspected:** `correction.patch` (both `src/host.ts` and `tests/host.test.ts` hunks), plus the frozen `snapshot/src/host.ts` lines covering the gap helpers, `forgetSession`, unload, `rememberResult`, the context and compaction hooks and the event subscriber. The new test walks the required sequence: started-then-aborted note, landed-uncommitted remember from a second actor, capped find, failed get, later acknowledged note, interrupt, compaction, two recovery requests, no-retry counts, another session, and the moved-session cleanup.
- **What I relied on without re-verifying:** the parent's report that only these two files changed, and their runs. Those were `bun test` (191 pass / 0 fail), typecheck (exit 0), packed-package smoke (exit 0, archive `e9525321…`) and `git diff --check` (exit 0). I ran nothing.
- **Still pending, not source blockers:** the live host, explicit Stop/handoff, installed and model workflows, and lifecycle gates. This verdict covers source only and does not accept or activate anything.
