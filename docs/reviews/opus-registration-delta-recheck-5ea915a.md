# Opus registration delta recheck

Candidate: `5ea915ac5b65852da70a1b4bd25457f3259f6b76`.
Reviewer: `claude:oc-registration`, Claude Opus 5.5, requested effort medium.
Session: `95b72364-ff32-423f-a63d-3e007f05768a`; review record `opencode-beads-cny`.
Original REVISE report: [registration resolution review](opus-registration-resolution-review-vuy5.md), retained unchanged.
Scope: original findings and correction-caused regressions only. Read-only source review; no tests, git commands or live qualification by reviewer.
Parent verified exact candidate HEAD and clean worktree before retaining this report.
Result: completed, is_error=false, no permission denials; modelUsage confirms claude-opus-5-5.

## Verdict: **READY** for the corrected .5 **source** at `5ea915a`

The branch ref `refs/heads/openspec/improve-beads-workflow-parity` reads `5ea915ac5b65852da70a1b4bd25457f3259f6b76`. The working-tree `src/host.ts` matches the committed diff. I can't run `git status`, so "clean" is the parent's claim, not mine. Every material finding from the original review is fixed in code and tests that I read myself. This verdict covers source only, not live qualification. The original REVISE report stays as it was.

## How each original finding was handled

**1. Initial collision withholding → fixed.**
- `src/host.ts:258-263`: the setup-time `command.list()` only produces a diagnostic, including when the lookup fails ("earlier entries follow native precedence and may be replaced").
- `:264-269`: a single transform adds all definitions with no withholding.
- `COMMAND_REGISTRATION_HOLD` is gone. A search finds it only in the historical review.
- Tests (`tests/host.test.ts`, diff 1150-1186): a 30-command registry despite the initial collision. With callbacks in `[package, config]` order, the user config wins and its body is the one that runs. Removing it restores ours. Cleanup leaves `callbacks == [config]`, removes status, and stops the stale callback from adding anything. Dispatch passes literal text, files, agents, skills and delivery through unchanged.
- Separate test (diff 1188-1193): registration still happens after an initial lookup failure.

**2. Hardcoded withheld status → fixed.**
- `src/host.ts:232-252`: status now reports:
  - the actual `registration` state (`pending`/`registered`/`failed`)
  - `lookup` (`available`/`failed`)
  - effective names and descriptions, `mismatches` and `missing`
  - an `ownership` disclosure covering owner identity, identical-description overrides, and that matching does not prove ownership
- A failed lookup reports "unknown" and never an invented empty list (`:235,243`); the test checks that `mismatches` is undefined in that case.
- The guard is still the config-only probe (`:227-231`). The status test (diff 1347-1401) asserts only `version` and `context --json` are called, and that prime is not called for missing, withheld or failed context.
- Status is reachable as a registered native command, and an in-flight status is cancelled on unload (diff 1403-1422).

**3. Spec, design and task wording → fixed.**
- spec.md customization and discovery-collision scenarios (diff 247-267), design.md:31 (diff 201-203) and task 2.2 (diff 285) now state the native-precedence boundary. The old "withhold/stop path" sentences are gone.
- Pinned ordering (`supervisor.ts:99-103`, `internal.ts:254-259`) is kept separate from the unpinned released-cache suffix-reactivation evidence. That separation appears in the design, artifact policy and SDK contract.
- 2.2 and 3.3 are marked for source only; the text says live 1.1/6.2 remain unexecuted.

**4. Abort guard and disposer → fixed.**
- `src/host.ts:265-268` checks abort before any add and pushes the registration into `registrations`.
- Command transform failure is diagnosed, then setup fails and releases earlier registrations (`:270-273`; test diff 1424-1436).

**Skill gate defect → fixed.**
- `src/host.ts:198-203` no longer has an initial `skill.list()` gate; the per-rebuild `editor.list()` check (`src/workflows.ts:82-88`) is kept.
- Test (diff 1224-1261): `list` is never called. An earlier customization is preserved, then the packaged skill returns after removal, a later config skill wins, and the callback adds nothing after cleanup.

**Zero-registration tests and package smoke → fixed.**
- `scripts/test-package.ts` (diff 414-481) calls the real callbacks and requires exactly 30 names.
- It runs every body and checks the forwarded fields, the installed guidance path, the status fields and one prompt per command.
- It derives the five owned disposers (agent, skill, command, two hooks) and checks all of them are disposed.
- The 16-link, resource-byte, export and missing-file checks are intact.

**Stale docs and anchor → fixed.** README, artifact policy and SDK contract are rewritten, and the anchor is now `#tasks-2233-source-candidate-native-registration-and-diagnostics` on both sides.

## Remaining blockers
None.

**Non-blocking observation (outside the original findings):** status `skill` reports only loader failures plus effective IDs. A per-rebuild `oc-beads` skill collision only shows up as a warning, and the ownership disclosure is worded for commands only. A one-line skill ownership note would make the status honesty symmetric. This is optional and doesn't affect the verdict.

## Standards vs spec
- **Standards:** no regressions caused by the correction. Permissions, attribution text, config-only probing, cleanup idempotence and user-file preservation are unchanged. There is no host replica or collision manager.
- **Spec:** reconciled as described under finding 3.

## Still unexecuted live checks
- Installed 2.1.1 discovery and dispatch of the `oc-beads:*` commands.
- Whether user-config precedence and suffix reactivation behave this way in a real host. Pinned ordering is from source reading; the reactivation evidence comes from the unpinned cache.
- External-directory ask/deny for resource reads, and model use.
- Typed continuity activation (1.1) and the 6.2 acceptance checks.

All of the above rests on mocks and source reading. I ran no tests and no git commands.
