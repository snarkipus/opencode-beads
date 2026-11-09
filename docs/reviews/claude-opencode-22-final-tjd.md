# Final SOURCE+QUALIFICATION gate — `opencode-beads-tjd` (session `71dc3fce-9fb7-40a3-a7eb-c833ba95d080`)

**Candidate:** runtime `ccc9851`, HEAD `f221779`, plus the uncommitted qualification docs and the task 2.2 marker. Archive SHA-256 is `072d9c29…ac836`. I only used Read, Grep and Glob. I did not run, edit or change anything.

## Verdicts

- **Standards: READY.** No findings.
- **Spec (final source+qualification gate): REVISE.** There is one finding, and it is documentation only. The runtime, archive and evidence need no change.

## Material finding

**F1 — Current docs still say the candidate is unqualified. Task 2.3 requires reconciling them.**

- **What the contract says:** task 2.3 (`openspec/changes/adapt-opencode-2-2/tasks.md:14`) requires "Reconcile current docs and task markers from accepted evidence, leaving limitations/unexecuted checks explicit."
- **What the summary says:** `docs/opencode-22-qualification-5rj2.md:5` says the selected installed-host qualification on 2.2.6 is parent-accepted.
- **What the other current docs still say:**
  - `docs/opencode-sdk-contract.md:5` — "The 2.2.6 runtime candidate has not been qualified."
  - `docs/opencode-sdk-contract.md:169` — the same sentence again.
  - `README.md:24` — "The candidate has not passed live host qualification."
  - `README.md:202` — the compatibility table row reads "2.2.6 (source target; host gate pending)".
  - `tests/docs.test.ts:212,215` pin both the SDK-contract sentence and the README table row as they are.
- **Consequence:** the repository's own SDK contract and README contradict the accepted qualification summary. If parent marks 2.3 complete now, the record would claim docs are reconciled when two current docs still say the opposite. Readers or the 2.0.0 release work could pick up a wrong "unqualified/pending" status. This understates the evidence rather than overclaiming it, so it is not a safety problem. It is still a gap against the task contract.
- **Packaging constraint:** `README.md` is one of the packed files (`package.json:44-49`). Editing it changes the archive, so it can't be fixed in this frozen candidate. `docs/` is not packed.
- **Smallest correction (no runtime or archive change):**
  1. Update `docs/opencode-sdk-contract.md:5,169` to say exact 2.2.6 qualification is parent-accepted for this archive digest, link the summary, and restate that `o66` is unresolved. Update `tests/docs.test.ts:212` to match.
  2. Add one line to the summary's limitations or next-steps section. It should say that the README text at lines 24 and 202 is frozen packed text, superseded by the summary for this digest, and will be updated in the separately authorized 2.0.0 metadata change, together with `tests/docs.test.ts:215`.

A recheck only needs to confirm those two edits and that the 31-file archive identity is unchanged.

## What I checked and found sound

- **Pending-unload abort (completion pass).** `completion-pass/timeline.jsonl:4-8` shows this order:
  1. The callback was confirmed pending while the real child had already exited (`realChildExists:false`, `commandReturned:false`).
  2. Config removal, then "Beads workflow unloaded" about 271 ms later.
  3. The shim was gone before `hold-release`.

  `analyze.py:31-36` independently checks the order of cleanup completion and hold release, that no output was released or forwarded for the held PID, that it happened before the ordinary timeout, and that there was no late admission or provider frame. These checks are meaningful and are not a relabel of the earlier too-early sample. The initial analyzer at `analyze.py:52` still records that sample as unqualified.
- **Denied, child-session and Stop outcomes (initial pass).** The denied leaf was rejected and the independent read was acknowledged (`analyze.py:33-34`). The child session had a distinct actor (`:37`). The final fixture readback contains exactly `CONTROLLED_NOTE_5RJ2\nCHILD_NOTE_5RJ2` (`:49`), so neither the denied write nor the Stop-interrupted write landed. The failed permission-entry retirement is still recorded as a failure (`:48`) and was not turned into a repair requirement. That matches the owner-settled scope.
- **o66 limitation behavior.** After the A→B switch, old message IDs are absent, the notice appears exactly once, current snapshots expand twice, and nothing is reconstructed (`analyze.py:42-44`). This matches `specs/workflow-access/spec.md:205-209` and `specs/work-continuity/spec.md:30`. The malformed first compaction is kept as failed (`:38`).
- **Genuine sample.** `genuine-pass/readback-receipts.json:11` shows the target notes as `ORIGINAL_TARGET_NOTE\nGENUINE_NOTE_5RJ2_ONCE` with no assignee, and the creator kept. The sentinel at `:23` still has its original `updated_at`. The report keeps its evidence boundaries clear: pre-serializer contexts are not wire captures, there was one sample, and there was no retry. This fits the task 2.2 limit of one representative genuine workflow.
- **Frozen patch scope.** `tracked.patch` touches only the SDK/admission, workflow-transport, guidance, test, doc and AGENTS files, consistent with the accepted source review. Version stays `1.1.0-beta.5`. The Beads minimum stays 1.3.1.
- **Release recommendation.** It is proportionate and scoped correctly: stable 2.0.0, a new host floor, existing exact pins kept, OpenCode upgraded before the plugin, and npm tags unchanged (`qualification-5rj2.md:46-51`). It doesn't claim any future metadata, CI or archive work is done.

## Optional observations (nonblocking)

1. **Initial report's final verdict.** `analyze.py:55` still prints `BLOCKED/PARTIAL`, and `:54` asserts the genuine gate was blocked. That is correct historical output. Anyone rerunning it should read it together with the summary's integration paragraph (`qualification-5rj2.md:23`), which already explains it.
2. **Abort timing check.** `completion-pass/analyze.py:35` compares the abort timing against a hard-coded 1000 ms rather than the product's actual timeout value. That's fine for this evidence, since the observed ~271 ms is well inside it, but citing the real timeout would make the assertion clearer.
3. **File counts.** The summary's "197 tracked-file baseline" plus the 4 new docs adds up to the manifest's 201. They are consistent, but the summary doesn't state the 201 total, so a reader has to work it out.

READY was not granted here. Even once granted, it would not authorize publication, release, a canonical sync or archive, or operator activation.
