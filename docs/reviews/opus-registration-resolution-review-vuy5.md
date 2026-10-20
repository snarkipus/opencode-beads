# Opus review — vuy.5 registration resolution

Reviewer: claude:oc-registration; Claude Opus5.5, requested effort medium.
Session: 95b72364-ff32-423f-a63d-3e007f05768a. Review record: opencode-beads-cny.
Baseline:38206ff428838e0290b6d2bb3db5ddc7b7beb9d4 plus unchanged13path uncommitted candidate.
Proposed resolution: /opt/data/cache/scratch/opencode-beads-vuy5-resolution-review.md; tracked diff SHA2569c95159946e8431e26651e3fa3be53c29a449cb58a305e716c21c07792df06fe (untracked workflows.ts separately hashed/read).
Outcome: completed, is_error=false, no permission denials. Initial pre-inference OAuth refresh failure is not a review verdict. No code or tests run by reviewer. Current implementation remains partial; this review does not accept source or live qualification.

## Verdict: **REVISE** (small plan corrections; the boundary itself is sound)

The approved intent holds up against host source: use the dedicated namespace, follow native precedence, and disclose that earlier plugins can collide. Two parts of step 2 are not mechanically sound as written, though, and the status contract needs its own step. None of this needs an architectural restart. READY on the corrected plan would not mean the source is complete or live-qualified. The candidate still registers 0 of 30 commands, and that is partial delivery.

## Mechanically verified host ordering (pinned 2.1.1 unless noted)

- **How commands are stored.** `core/src/command.ts:28-30,61`: the editor exposes only `add`, which is a map set, so the last write wins.
- **How rebuilds run.** `core/src/state.ts:162,178-181`: a rebuild replays every transform in insertion order (a Set), and `reload()` (`:250`) re-runs the same order.
- **Plugin order.** `plugin/supervisor.ts:99-103` orders plugins as `pre → packages → post`. `plugin/internal.ts:254-259` places `ConfigCommandPlugin` in `post`. `config/plugin/command.ts:44-47,71-72` registers one transform once; config edits only refresh `loaded.documents` and call `ctx.command.reload()`.
  - So ordinary user config and file commands always replay after our transform, on the initial load and on every config rebuild.
  - When the user removes their entry, our definition comes back naturally.
- **Skills behave the same way.** `skill.ts:106-107` (`add` is a map set) plus `ConfigSkillPlugin` in `post` means config skills also win natively.
- **Not pinned:** the registry's re-activation semantics. `core/src/plugin.ts` is missing from `baseline211`. The non-pinned `released/.../core/src/plugin.ts:108-139` shows a prefix diff that tears down and reloads the changed suffix in order. That keeps post after packages when a package is re-activated. Treat this as strong but unpinned evidence. Plan step 2's "verify actual host ordering" must cite it as such, or find pinned evidence.

Calling earlier-plugin overwrites "native last-writer semantics" is correct. It is not an upstream defect.

## Spec/plan findings

1. **"Initial collision detection may withhold an affected name" doesn't work for user config and causes stale withholding.**
   - Our setup runs during the package phase, before `ConfigCommandPlugin`'s post transform is loaded. On a suffix re-activation, that transform is torn down before we load. So the `ctx.command.list()` at `src/host.ts:256` can only see built-in (pre) and earlier-package names, which are exactly the cases the boundary hands to native precedence.
   - A name withheld at setup never comes back if the earlier plugin later drops it. That contradicts the plan's own "removal restoring normal host registry".
   - **Correction:** register all 30 unconditionally. Keep the setup-time list check only as a diagnostic, e.g. "earlier entry X will be replaced by package precedence". Do not withhold.
2. **The status contract is not in the plan.** `src/host.ts:249` hardcodes `commands: { state: "withheld", reason: COMMAND_REGISTRATION_HOLD }`. Once the hold is removed, that is false status, which task 3.3 makes a stop condition. The spec scenario "status identifies the collision and effective entry" (spec.md:172-175) can be met through public APIs:
   - `command.list()` returns `{name, description}`.
   - Any owned name whose effective description differs from our definition has been overridden by a higher-precedence entry.
   - Disclose the limits: the owner isn't exposed, and an override with an identical description can't be detected.
   - Add this to step 2/4 and delete `COMMAND_REGISTRATION_HOLD` (`src/workflows.ts:90-91`).
3. **The spec text needs exact wording replacements.**
   - spec.md:66 ("withholds… if preservation cannot be established across rebuilds; documented override behavior does not authorize overwriting user commands").
   - design.md:31 ("stop that affected registration path…").
   - tasks.md:15 ("stop that affected registration path rather than overwrite it").
   - Replacement for each: user config and file commands are preserved by post-ordered native precedence; same-name conflicts with other plugins follow native order and are disclosed and diagnosed. Step 1 covers this; make the target sentences explicit so the reconciliation stays bounded.
4. **Keep the abort guard.** The new command transform should mirror the skill and agent transforms: `if (!abort.signal.aborted)` before any `add`, and push its registration into `registrations` so cleanup disposes it.

## Candidate source defects affecting the plan

- **Initial skill gate is redundant and blocks restoration.** `src/host.ts:200-213` checks `skill.list()` once at setup and, on a collision, never installs the transform. The per-rebuild `editor.list()` check (`src/workflows.ts:82-88`) already covers earlier entries. The setup-time gate only stops our skill from returning after the user removes their customization. This is minor, and it is the same pattern as finding 1. Either drop the initial gate or document it.
- **Tests and package smoke still treat zero registrations as success.**
  - The package smoke script fails if any command is registered: `scripts/test-package.ts` (diff lines 224-226) checks `commandTransforms !== 0`, and its `disposed !== 4` count must become 5.
  - `tests/host.test.ts` asserts `commandTransform).not.toHaveBeenCalled()`.
  - The fake transform in the package smoke never invokes its callback, so it can't verify registration. Step 3 covers replacing these; flagging the exact sites.
- **The status command is unreachable while withheld.** `oc-beads:status` is defined but not registered, so the "native status" requirement is currently unmet.
- **Docs to replace in step 4:**
  - README "withholds their registration" (diff lines 11 and 43).
  - Artifact policy (diff line 64).
  - SDK contract section "Unresolved source blocker" (diff line 86); the cross-link anchor `#tasks-2233-source-candidate-delivery-and-concrete-command-hold` will change.
- **No regressions found** in the touched code:
  - Command bodies pass literal text, `files`, `agents`, `skills` and `delivery` straight through, with no template or shell evaluation (`src/workflows.ts:107-118`).
  - Cleanup is awaitable and idempotent, and setup failures release earlier registrations.
  - Status guard uses only the config-only probe.
  - Package plumbing is fine: `files`, archive inventory and the 16-link smoke check.
  - No permission waiver.

## Smallest corrective plan

1. Step 1: add the three exact spec/design/task replacements from finding 3, plus the status-scenario wording from finding 2.
2. Step 2: register all 30 commands without withholding; turn the setup-time list check into a diagnostic only; add the status override detection; add the abort guard; drop `COMMAND_REGISTRATION_HOLD`.
3. Step 3: add a fixture that replays transforms as `[package, config]` in order, covering: user config added later wins, removing it restores ours, and disposal removes only our transform. A small ordered-callback list is enough; this is not a host replica. Also test a status override report.
4. Step 2 evidence: record that registry suffix ordering comes from the unpinned `released` cache.

## Limitations

This review used only Read and Grep. Nothing was run, and there were no live host checks. The registry `activate` file is not in the pinned cache. Whether user config precedence holds in a live 2.1.1 install, how commands are discovered and invoked, and how external-directory permissions behave are all still unexecuted (tasks 1.1/6.2).
