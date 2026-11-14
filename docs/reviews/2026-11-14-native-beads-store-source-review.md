**Verdict: READY.** I found no blocking defects in the uncommitted candidate (baseline `8127826`), including the new `openspec/changes/correct-beads-guard-observation/` files. This does not authorize acceptance, a commit, archival, publication or any action on operator stores; those stay with the parent.

**What I inspected:** the full `candidate.diff` and `status.txt`, current `src/guard.ts`, the relevant parts of `src/continuity.ts`, `src/context.ts` and `src/host.ts`, the test fixture in `tests/guard.test.ts`, the requirement headings of the new spec delta, and a search of `src/` for leftover marker-gate or `autoMigrate` references.

**What I executed:** nothing. The 231 tests, typecheck, package smoke test and real 1.3.4 contract run are the parent's evidence, not mine, and none of it is installed or live qualification.

## Standards
- **The marker gate and `autoMigrate` bypass are fully removed.** `guard.ts` no longer touches the filesystem; its runtime is `bd` only (lines 16-19 and 102-104). The only remaining checks are the 1.3.1 minimum and the config-only workspace probe (lines 71-99). In `src/`, `autoMigrate` now appears only in the comment at `host.ts:76`. `readText` remains only in `workflows.ts`, where it reads the skill file and has nothing to do with the gate. Nothing still calls `migration-pending`.
- **Typed operations keep their checks.** `continuity.ts:316-322` still checks the session location, then reruns the compatibility check after permission is granted and before the command runs. Actor and cancellation handling are unchanged.
- **Native full prime is unchanged.** `host.ts:105` still runs the normal prime with `--full`, plus `--stealth` when enabled, and the context path returns its output verbatim. Native memories and partial-availability text pass through as-is. Prime failures still produce the existing failure notice.
- **The tests give real regression evidence.**
  - The host test (`host.test.ts` "native full prime ignores CLI witnesses…") writes an actual `.local_version` file and runs the production runtime. It checks every marker state combined with `autoMigrate` set to undefined, false or true. It asserts that prime receives `["--full"]`, that only `version` and `context --json` run first, and that the native memory and partial-availability text is rendered unchanged. The old code would have failed this test, so it is a genuine RED→GREEN check.
  - The continuity test checks that the minimum version is enforced both before and after permission, and that `show` never runs when the check fails.
- **Contract script:** removing the marker and `migrate schema` assertions is correctly scoped; the prime, stealth and MCP checks are kept.
- **The guard runtime has no other callers.** The 11 typed operations and 30 commands don't depend on it, and the diff doesn't touch either.

## Spec findings
- The code matches the active delta. The new requirement "Native Beads store ownership" covers witness-independence, ignoring legacy `autoMigrate`, preserving full native context and partial results, and separating missing prerequisites from failed ones.
- Diagnostics now promises "without opening a store" (delta lines 71 and 83). The host diagnostics test still runs only the config probes and now also asserts that no marker or migrate wording appears.
- None of the plugin's own protections were removed. Host admission, the CLI minimum, the workspace probe, the session-location hold, permissions, actor handling, cancellation, and the rule against substituting `where` or a manual prime are all intact. Only the witness-based schema decision was removed, and that now belongs to native Beads.
- One pre-existing gap is unchanged and not made worse: a successful context envelope is not checked for `schema_version` (the parent already disclosed this).

## Optional observations (non-blocking)
1. **Leftover "held" wording.** `continuity.ts:322` still throws `Beads store held: ${guard.kind}`, so an old CLI or a failed probe is reported as a "store hold", which echoes the removed feature. Something like `Beads CLI/workspace check failed: …` would be clearer; the existing test only matches "unsupported". `context.ts:119` likewise labels the `unsupported` kind as status "withheld". That predates this change and is acceptable, but "withheld" now really means explicit holds.
2. **Two tautological test assertions.** `continuity.test.ts` slips an unused `readText` into the dependencies with `Object.assign` and then asserts it was never called. The `runtime()` fixture in `tests/guard.test.ts` (lines 16-26) does the same. Since nothing can call `readText` any more, those assertions prove nothing. The other assertions in the same tests do carry the regression, so these could simply be dropped.
3. **Leftover block in `bd-contract.ts`.** The bare `{ … }` block left after removing `if (markerPath)` (diff line 300) could be un-nested.
4. **Spec title.** The "Migration hold conflicts with prime-first advice" scenario title (delta line 8) still suggests a plugin-issued migration hold. That's cosmetic; the scenario body is correct.