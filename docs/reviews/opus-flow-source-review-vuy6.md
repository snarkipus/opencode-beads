# Opus scope-bounded flow source review

Baseline: `db3b65ee86ad02d363baf9cbf24511a15d7bb644` plus the unchanged 10-path uncommitted candidate.
Reviewer: `claude:oc-flow-review`, Claude Opus 5.5, requested effort medium.
Session: `c76548d8-0fad-4278-b9b7-1f434284391e`; review record `opencode-beads-8ri`.
Result: completed, is_error=false, no permission denials; actual modelUsage confirms claude-opus-5-5.
Parent verified all reviewed candidate hashes unchanged before retaining this result.
Scope: task 4.1 source and 4.2 deterministic contribution only; no live qualification.

**Verdict: READY** for the 4.1 source and the 4.2 deterministic contribution. This does not cover live qualification. Task 4.2 should stay unchecked and `.6` should stay open.

I only read files; I ran no tests. I checked the candidate diff against the 4.1/4.2 text in `tasks.md:25-26`, `AGENTS.md:31-44`, the current `src/guidance.ts`, `src/host.ts:338-379`, and the pinned `baseline211/.../subagent.ts:234-268`. I did not recompute the manifest hashes, so the parent still needs to confirm the candidate is unchanged before accepting.

### Standards findings
None of these block acceptance.

- **`src/guidance.ts:84` and `src/guidance.ts:64`:** the task agent gets the executor/ownership section twice, once in its system prompt and again in the injected `beadsGuidance("task-agent")`. The copies are identical, so nothing contradicts. The prompt copy is still needed when prime fails, so I don't think it's worth changing. If you want to trim it, you could drop the section from the injected task-agent guidance only, but that's optional.
- **`tests/host.test.ts:410-411`:** the value import and the type import from `../src/continuity` are on separate lines. That's style only.
- **The parent's assertion fixes are not weakened:**
  - `scripts/test-package.ts:331-339` replaces the 1,000-character limit and the old claim string with five specific positive checks. It also adds a negative check against the old "otherwise choose one highest-priority ready bead" fallback.
  - `tests/docs.test.ts:189, 232-237` now checks the new README wording.
  - Neither file has a placeholder or a check that always passes. I don't see a reason for a new character limit.

### Spec findings
**4.1 (`src/guidance.ts:13-31, 51-66`): no material gaps.**
- **Exact assignment:** stops without substitution.
- **Single operation:** does not authorize a claim. The prompt also says "Readiness is not dispatch permission".
- **Batch/goal:** continues only within the scope and acceptance gates already granted.
- **Claims:** atomic, using an actor placeholder, with readback and a stop on failure.
- **Discovery:** does not add authority.
- **Read-only analysis:** makes no mutations.
- **Stops:** cover denial, cancellation, and a pending permission wait. Unresolved acceptance stays incomplete.
- **Closure:** when the parent owns closure, the bead is left open.
- **Delegation:** the old command-count rule is gone. Delegation is normal blocking delegation, with no background or nested automation.
- **Identity:** `created_by`, `owner` and `assignee` are read back separately. Handoffs are deliberate, and planning/review items are bounded with no ticket per retry.
- **Other features unchanged:** Luna, the step caps, cap `0` and the agent IDs are untouched (`src/agents.ts:11,48`; `tests/agents.test.ts:33-44`).
- **Instructions don't conflict:** the old one-bead/ready-selection text appears nowhere in `src/`. The README (lines 26-28) correctly says this is guidance, not enforcement.

**Non-blocking observation:** `guidance.ts:47` says typed writes derive the actor from the session and agent. `guidance.ts:29` tells the agent to use the actor supplied by the invocation or handoff. Once typed continuity is turned on, a worker could claim under one actor and checkpoint under another. Activation is withheld today, so this belongs in the live 1.1/4.2 checks, not as a source fix now.

**4.2 deterministic: the payloads match the pinned 2.1.1 source.**
- Failed and cancelled children are `status:"error"`, and their messages match `subagent.ts:247-251`.
- NO_TEXT is a completed result. Its `output`/`content`/`metadata` shape matches lines 252-264.
- No fixture invents a `cancelled` status for the after-hook.

**The tests check what the docs say they check:**
- **No restart:** the plugin never calls `prompt` or `synthetic` and never writes to the store.
- **Child outcomes:** the after-hook only invalidates context and sets a recovery cue for the next request (`host.ts:350-355`). The child's cache stays isolated.
- **Late child result:** after interruption it keeps the "no final checkpoint" note (`host.ts:372`). Callbacks after unload do nothing.
- **Fork:** the fork starts without the parent's references (`host.ts:365`).
- **Permission wait:** a pending permission does no write during compaction. Aborting it rejects, and a later approval does not run the write.
- **Actors:** each checkpoint records the actor of the invocation that made it, and the permission check uses that invocation's agent.

`src/host.ts` is unchanged, and I'm not asking for any repair of the plugin, transport or upstream Beads.

**Is the evidence mapping honest? Yes.** The table in `docs/opencode-native-parity-assessment.md:99-109` names what is not proved for every row. That includes: no child is actually launched, mock notifications prove nothing about host suppression, the store is an in-memory fixture, and fork remapping and provider replay are not exercised. The doc keeps the earlier 159-pass/1-fail run and the package failure, then records the parent's 160/0 run as superseding them. It also discloses that there is no final-checkpoint guarantee and labels the earlier unpinned `.5` evidence as such.

### Live work still not done
Live 4.2 has not been run, and it needs the separately authorized live 1.1 first. That means:
- no installed 2.1.1 host
- no real child or claim
- no permission UI or saved-grant checks
- no retained-history, fork or provider-mismatch checks
- no long-running transport observation
- no verification that the model actually follows the guidance

Nothing in this candidate supports checking 4.2, closing `.6`, dispatching `.8`, activating anything, or releasing. Before accepting, the parent should record the actual model, session and verdict, and confirm the candidate is unchanged.
