**Verdict: READY** for owner review of the corrected plan. The original REVISE stands as history. READY only means the plan is coherent. It does not show runtime behavior, does not replace the still-unrun 2.2.6 native/model qualification, and is not owner acceptance or permission to implement, release or close `opencode-beads-o66`.

## B1: resolved
- **"Accessible" is now defined.** `design.md` defines it as "present in native latest-compaction context". It names the exact trigger: native compaction on model A, then a switch to model B that can't replay A's window, which restores plain older user messages to the request. It links the pinned boundary code (`history.ts#L45-L84`). This matches what I checked earlier (`history.ts:49,70,220-223`; `llm.ts:137`).
- **The expected result is now set.** The new scenario at `workflow-access/spec.md:205-209` and `work-continuity/spec.md:30` both expect a visible "unavailable" disclosure for affected historical instructions and reports. Accessible snapshots still expand. Host replay content and Beads data are not rewritten.
- **Qualification can now judge it.** Task 2.2 records this case as a "verified limitation", not a pass or a failure. The stop condition in `design.md` excludes this documented outcome, so it no longer triggers a design revision.
- **The owner's decision is recorded.** The design states that the owner chose disclosure plus a follow-up over a separate snapshot store.

## Standards findings
- No blockers.
- The machine-local evidence path is gone, and the design now links pinned upstream sources instead.
- The follow-up is one Bead, separate from this change and not blocking it: `deficiency-record.json` shows it blocked, unassigned, `blocks_release:false`, `implementation_authorized:false`, and linked by `discovered-from` to `9za`. Its closure requires a released supported API plus a demonstrated recovery, not just an issue closure or PR merge. That fits the AGENTS.md split between OpenSpec, docs and Beads.
- Nothing creates a duplicate GitHub issue, a side store or a polling service.

## Spec/Design findings
No correction introduced a blocker.
- **Nonblocking wording nit:** `workflow-access/spec.md:222` ("Scenario: User evaluates the documented limitation", last line) says "the published beta's narrower host support". Beta.5 supports a *different* host line (2.1), not a narrower one. Suggested wording: "the published beta's 2.1 host support".
- **Earlier nonblocking notes, now folded in:**
  - What happens when the history read fails: disclose unavailable, leave the content alone, keep the other guidance, don't retry.
  - Moving the location check before the lookup.
  - Checking message IDs through published types, without casts.
  - Task 1.1 now owns these and tests them.
  - The proposal now names the native current-context API correctly.
- **The ADDED requirement is reasonable.** "Documented snapshot-recovery deficiency" makes README disclosure a requirement in the spec. The design already says docs and specs get updated when the deficiency is resolved, so it won't harden into a permanent rule.
- **The controlled-provider fixture should work** for the model-switch case. The compaction hook result can supply `native.messages` (`session.d.ts:42-43`), so a native window for model A can be produced without a second run against a real provider. This is inferred from the types, not executed.

## Remaining owner decisions
- Accepting the complete corrected package, including the documented deficiency as a known limitation of the 2.0 adaptation. Your direction already says you'll take this disclosure-and-follow-up approach; formal acceptance is still pending.
- No other new decisions.

## Evidence
- **Inspected:** `correction.patch`, `deficiency-record.json`, and a heading/grep check of the current `workflow-access` spec. The working tree matches the patched heading structure, including the scenario at :205 and the ADDED requirement at :211-222.
- **Not re-inspected, by your scoping:** upstream sources beyond my earlier review, canonical specs, the hashes in `corrected-manifest.json`, and `review.md`.
- **Not executed by me:** OpenSpec validation, typecheck, tests, the SDK fixtures, and the installed-host/model/compaction qualification. The validation and hash checks you cite are your own runs.
