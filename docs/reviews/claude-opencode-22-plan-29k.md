**Verdict: REVISE.** The plan needs one narrow correction plus an owner decision. Everything else is ready.

## Standards findings
- No blocking issues. The plan stays planning-only. It maps to one implementation Bead (`tasks.md:3`), keeps actor, permission and Stop contracts unchanged, keeps Beads-owned behavior out of scope, and keeps publication and operator activation as separate gates (`design.md:47`, `tasks.md:19`). This matches `AGENTS.md`.
- Nit, not blocking: `design.md:5` points to `/opt/data/research/...`, which is outside the repo. AGENTS.md says committed docs own evidence, so cite the committed evidence location at acceptance.

## Spec/Design findings

**B1 (blocker): a model change after native compaction will reliably lose snapshots, but the plan describes this as an "opaque older window" case.**
- **Upstream evidence:**
  - `ctx.session.context` → `store.context` → `SessionHistory.load(db, id, "latest")` (`store.ts:194`).
  - With `"latest"`, `latestCompaction` stops at the newest completed compaction of any kind, including native (`history.ts:70`, `replayable` at `:49`).
  - The runner reads history with `model.ref` instead (`llm.ts:137`). If a native window can't replay on the new model, it reads back from the previous compaction (`history.ts:220-223`).
- **Result:** after a native compaction on model A, a switch to model B sends the ordinary, durable, ID-bearing tagged user messages from before that compaction (`to-llm-message.ts:241-254`). `context()` does not return those records, so the planned lookup marks them "unavailable". These messages are plain retained transcript, not opaque windows. The plugin `SessionDomain` has no other history reader: it has `context` but not `messages` or `message.get` (`plugin/dist/promise/session.d.ts:186`).
- **Where the plan gets it wrong:**
  - `work-continuity/spec.md:30` and `design.md:19` frame disclosure as limited to "opaque older windows".
  - `workflow-access/spec.md:162` ("accessible durable snapshot") leaves "accessible" undefined.
  - `tasks.md:13` asks qualification to cover "a model-change boundary" but gives no expected result. A predictable degradation could therefore be recorded as an adapter failure, or quietly passed.
- **Smallest correction:**
  - State in `design.md:19` and `work-continuity/spec.md:30` that "accessible" means present in the native latest-boundary context.
  - Name the case explicitly: snapshots from before a native compaction, replayed after a model change.
  - Set the expected qualification outcome for that case to "disclosed unavailable".
  - Have the owner accept that degradation (see decisions). No new store or reader is needed.

## Material nonblocking notes
1. **What happens if the read fails is unspecified.** `load` decodes every row and fails the whole call on any `MessageDecodeError` (`history.ts:215-218`). Spec `:199-203` covers this in general. Add one line to `design.md:17`: if the context read rejects, treat all tagged messages in that request as unavailable (with the notice), and still deliver the request and the rest of the guidance.
2. **Order of steps.** `design.md:17` puts the location check before the lookup, but beta.5 currently expands before the location check (`src/host.ts:339-343`). Task 1.1 should mention this reordering so the regression test fixes it in place.
3. **The direct-tool reasoning is consistent with upstream.** When `execute` is wholly denied, eligible leaves become direct tools (`tool.ts:260-264`), and per-leaf wholly-disabled filtering still applies (`:257`). Spec `:33-36` and `:103-107` match this. The capability check in beta.5 (`host.ts:356`) is the right seam to change.
4. **ID matching depends on a published type.** `SessionRequest.messages: Array<Message>` (`session.d.ts:30`) has to expose `id` to the plugin. Task 1.1's SDK typecheck should assert this, not cast it.

## Consequential owner decisions
- Accept the B1 degradation: after a native compaction followed by a model switch, pre-compaction workflow snapshots show an unavailable-guidance notice rather than being expanded. The alternative is to reopen the rejected side-store choice: `ctx.storage` exists, but `design.md:21` rejects durable side stores. I recommend accepting the degradation and documenting it.

## Evidence
- **Inspected:**
  - The six candidate files and `AGENTS.md`.
  - Beta.5 `src/host.ts:226-410`.
  - Upstream `history.ts` (load/boundary), `store.ts:194`, the native-session context path (`:446-448`), `host.ts:609`, `to-llm-message.ts:226-280`, `llm.ts` boundary usage and `tool.ts:251-320`.
  - Plugin SDK `session.d.ts` (SessionDomain, SessionRequest), the schema user `metadata` field, and report greps.
- **Not inspected:** the canonical `openspec/specs/*`, the candidate-manifest hashes and the compaction-hook request construction.
- **Not executed:** any typecheck, test, OpenSpec validation, SDK fixture or installed-host run. That compaction hooks keep message IDs, and that the `id` field is visible in the published types, is inferred from source, not verified.
