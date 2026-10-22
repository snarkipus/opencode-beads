# Source/evidence verdict: READY for opencode-beads-9ux (16-path candidate)

This review (opencode-beads-bbd) found no material Spec/Behavior or Standards/Proportionality findings. The candidate matches the corrected plan's scope. The retained evidence supports accepting it as a bounded walking skeleton. I did not re-run anything; this rests on reading the source plus the retained artifacts.

## Spec/Behavior

No material findings. The contract points check out against source:

- **One compact native prompt.**
  - Sync stores `/oc-beads:sync` plus `Literal user details:` when details are present, with a versioned snapshot in `metadata.ocBeadsSync` (candidate.diff:176-186).
  - `...input.prompt` still passes files, agents and skills through unchanged.
  - Overwriting `metadata` loses nothing from the invocation. `CommandInvocation.prompt` is `PromptInput.Prompt`, which has only text/files/agents/skills (schema `prompt.js:46-51`). Admission metadata is a separate field (`promise/session.d.ts:17`).
  - The snapshot is the beta.3 instruction text exactly, digest-pinned at host.test:313. The other 29 commands still go through the shared `instructions + details` path (candidate.diff:186), and all 29 are digest-checked against generated baseline values (workflows.test:445-454).
- **Expansion helper** (`expandBeadsSyncContext`, candidate.diff:152-166).
  - It replaces array entries rather than mutating the stored message, and acts only on user-role messages whose metadata is exactly version 1 with string instructions.
  - It drops only its own key and keeps foreign metadata and IDs. Running it twice is a no-op.
  - Tests cover each rejection case: assistant role, version 2, non-string instructions, empty metadata, and slash-looking text without a tag.
- **Hook placement.**
  - In `context` it runs after the unload check and before `session.get` and the location/eligibility returns (host diff :117-120). A test proves expansion still happens on the location-mismatch path, and that nothing is expanded after cleanup (host.test:265-281).
  - `compaction` was restructured equivalently, so the cue keeps its existing eligibility gate.
  - Only `context` and `compaction` are registered. Both the host test (:272) and the packed smoke test (:79) assert that title and generate are absent.
- **Compaction (SB-1 as implemented).**
  - The added `BEADS_COMPACTION_GUIDANCE` sentence is exactly the approved one, with no promise of verbatim retention or native-window override.
  - Replay of a JSON round-tripped retained message expands exactly once through the registered hooks.
- **Lifecycle.**
  - An ambiguous admission failure propagates after one call, with no retry (workflows.test:437-443). Pre-admission unload still throws.
  - There is no synthetic pairing, pending queue, or new model call. Queue and steer are passed through unchanged.
- **OpenSpec delta** (spec.md:898-933): its scenarios match the behavior above, including the explicit no-verbatim-retention limit.

## Standards/Proportionality

No material findings.

- The product change is about 30 lines across three source files, using only supported SDK types (`SessionContext["messages"]`). There is no framework, parser, floor change, or provider/CLI workaround.
- Tests extend the existing fakes. The serializer check reuses the real `@opencode/ai` Responses path over loopback rather than adding a fixture corpus.
- The packed smoke test drives the registered hooks at the actual installed skill path.

## Context effectiveness

**Shown by the deterministic serializer test** (actual OpenAI Responses serialization, no inference):
- Each tagged message carries exactly one snapshot, and `ocBeadsSync` never reaches the outbound request.
- Unexpanded stored messages also serialize without the key. For this serializer, the metadata is not emitted, which settles the SB-3 question for this provider.
- Expansion is byte-stable across replays, and storage is unchanged.
- Compared with beta.3, the only difference is the visible `/oc-beads:sync` part plus one extra text-part boundary: +46 chars per invocation (2738→2784 for one sync, 7858→7996 for three). That growth is bounded and linear, the same shape as beta.3.
- The 113-char compaction cue is disclosed separately.

**Shown by the one genuine 2.1.2 sample:**
- `R1-provider-wire-inputs.json:16-29` shows a single user message: the snapshot first, then `/oc-beads:sync`, with no marker.
- Later requests use `previous_response_id`, so the sample does not re-test replay; that rests on the fixture.
- The persisted record holds compact text plus metadata only (`R1-persisted-user-message.json`). There were 5 primary and 0 auxiliary requests.

**Not measured:** cost, savings, and cache attribution.
- `R1-provider-usage.json` shows cached input going 0 → 12544 → 9216 → 21760. A single sample cannot attribute that pattern to the plugin. Expansion is deterministic, so nothing in the source would make the prefix unstable.
- The docs correctly say the instructions are relocated, not made cheaper.

## Optional observations (nonblocking)

1. **Undeclared test dependency.** `tests/host.test.ts` imports `@opencode/ai` without declaring it. It resolves deterministically today as an exact `2.1.1` dependency of `@opencode/plugin` (`plugin/package.json:50`). Declaring it in devDependencies, pinned, would make that explicit.
2. **Wrapper hides missing `messages`.** The `fakeContext` hook wrapper defaults `event.messages ??= []` for every test. That matches the SDK type, where `messages` is required, but it would hide a host that omitted it.
3. **Cue scope.** The cue is added on every eligible Beads compaction, not only sessions with a tagged sync. This was accepted earlier and is disclosed.
4. **Archive naming.** The sample archive is local source under the beta.3 version string. That is for publication/versioning to handle, not this gate.

## Limitations

- This is a source and evidence review only. I did not run tests, the typecheck, the package smoke test, or the sample.
- I relied on the parent's custody of the 16 candidate paths, the 164 protected paths, and the logs.
- I did not view the UI renders.
- Serializer evidence covers OpenAI Responses only. Hooked paths delete the key before conversion, so other providers' handling matters only for unhooked lowerings.

READY does not authorize commit, release or publication; the parent owns acceptance.