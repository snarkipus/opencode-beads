# Source review: opencode-beads-5rj.1

**Candidate:** `ccc9851bce42ec3f5a5b348cfa4cc40e1d93a643`, compared with the accepted base `cd4630c7a4322a8a1439acb714274f6a89ff6c15`. I only read files; nothing was run.

## Verdicts
- **SOURCE: READY**
- **Standards: READY**
- **Spec (tasks 1.1, 1.2, 2.1 source portion): READY**

**No blockers found.**

## What I checked against the contract

**Metadata transport (1.1)**
- `src/host.ts:236` makes one `ctx.session.context({sessionID})` call per hook run.
- `src/workflows.ts:576-581` builds an ID map that exists only for that request. There is no cache and no per-message lookup.
- Matching uses `message.id` from the published `SessionContext["messages"]` type against the stored record's `id`, with no casts.
- The upstream conversion step keeps user-message IDs (`to-llm-message.ts:236,250,256,258`), which confirms the gap this change is built around.

**Order of checks**
- In both hooks, the location check (`host.ts:396-406`, `456-466`) runs before the history read.
- After every await, the code checks for unload/cancel (`abort`) and that the request is still current (`host.ts:237-241`, `245-249`, `397-401`, `457-461`).
- `forgetSession` clears the in-flight read marker (`host.ts:170`). So a move, fork or delete during the read throws away a late result. The "late native snapshot" test covers this.

**Precedence and repeat runs**
- `storedWorkflowInstructions` (`workflows.ts:551-561`) prefers a valid `ocBeadsWorkflow` and falls back to the legacy `ocBeadsSync`. Malformed or wrong-version records are ignored.
- The first-part equality check (`workflows.ts:600`) means running expansion twice adds nothing.
- Stored history is never changed. The request copy is replaced, not edited.

**Unavailable notice**
- The notice tells the model not to invent missing guidance or replay an operation. It is added at most once per request (`host.ts:220`), and the warning log fires once per session (`workflowDiagnostic`).
- If the read fails, the user's text is left alone and the rest of the guidance still runs (`host.ts:250-251`), as `design.md:17` requires.
- There is no re-submission or retry, and nothing is reconstructed from current command definitions. This matches the owner-settled o66 outcome.

**Hook scope**
- Only the context and compaction hooks expand snapshots. The title/generate tests confirm they don't.

**Direct tools (1.2)**
- `DIRECT_BEADS_TOOLS` (`host.ts:48-51`) matches 2.2.6 tool naming (`runtime.ts:290-293`: `${namespace}_${name}`) and the 11 operations in `continuity.ts:55`.
- In 2.2.6, when execute is wholly denied, Code Mode tools are exposed directly (`tool.ts:262-264`). So `registered-direct-visible` describes something the host really does.
- Tool definitions, permissions (`permission: "shell"`), actor handling and Stop behavior are unchanged.
- The guidance text says a rejected operation must not be retried elsewhere, that Stop/Cancel must be honored, and that shell is only available if it is listed separately (`guidance.ts:90-93`).

**Version range and docs**
- Version admission is `2.2.x` with patch ≥ 6, and the unsupported-version list includes `2.2.5`, `2.3.0` and `2.2.6-beta.1`. The package version is unchanged.
- The README separates the published beta.5 (`>=2.1.1 <2.2`) from the unreleased source and claims no host qualification.
- The README limitation covers the trigger, the impact, that Beads data is unaffected, upstream #57424 and the unresolved `opencode-beads-o66`.
- The outdated "operations disappear when execute is denied" wording is gone from `CODE_MODE.md`. I found no remaining copies of it.

**Tests**
- Tests build real SDK 2.2.6 messages with `Message.make` and assert that `metadata` is absent. They also assert location-then-history order and exactly one read, and cover rejected/missing reads, a late result after a move, and input/files/delivery preservation.
- These checks would fail if the code still relied on request metadata. They exercise the code against the SDK types, not a real installed 2.2.6 host.

## Optional advice (not required)
1. **Overlapping requests in one session** (`host.ts:238-240`, `398-401`): if a second request for the same session starts before the first one's read finishes, the first request shows the unavailable notice even though its snapshots were readable. It also skips the rest of its Beads guidance. I haven't shown this can happen, since the 2.2.6 runner seems to run a session's hooks one at a time. Worth watching in 2.2, not fixing now.
2. **Stale diagnostics label** (`host.ts:387`): `typedRegistration` still says `"code-mode-only"`, but 2.2.6 can expose the tools directly. The `leafAvailability` field is correct; the label could just say `"registered: beads namespace"`.
3. **Dead line** (`host.ts:419`): the marker was already deleted at `host.ts:415`. The two hooks also repeat the same location/read block, which could be shared. Cosmetic.
4. **Over-eager notice** (`workflows.ts:567`): `hasWorkflowInvocation` matches any user line starting with `/oc-beads:<stem>`, so an ordinary message quoting a command could trigger the notice. This errs toward disclosure, which is acceptable.
5. **Log key not cleared on session reset** (`host.ts:219`): the key format (`session=X`) doesn't match `forgetSession`'s `:X` suffix match, so the warning won't repeat after a move or fork. It's harmless and consistent with "once".

## Inspected
- The frozen `source.patch` and `tracking.json`
- Current `src/host.ts`, `src/workflows.ts` (through the patch) and `src/guidance.ts`
- The `continuity.ts` tool names and permission option
- The spec, design and tasks files under `openspec/changes/adapt-opencode-2-2/`
- `AGENTS.md`, sampled for rules
- Upstream 2.2.6 `to-llm-message.ts`, `tool.ts` and `tool/runtime.ts`
- The installed `@opencode/ai` 2.2.6 `./effect` export

## Not executed or not checked
- Typecheck, the 218 tests, the packed smoke test, OpenSpec validation and diff checks. These remain worker claims plus your own reruns.
- The frozen `.tgz`: I didn't check its contents or digest.
- The full plugin `session.context` declaration chain, beyond how the code uses it.
- Task 2.2/2.3: a real 2.2.6 host, model and compaction run, including whether `session.context` IDs match request IDs on an installed host, and the o66 model-switch disclosure.

READY here doesn't close the 2.2 gate and doesn't authorize push, release or operator changes.
