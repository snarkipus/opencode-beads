## Verdict: **READY**

This verdict covers the plan and task structure only: plan.md (SHA256 `4aacd155…`) and task `opencode-beads-8fl` as captured in the packet. It does not approve any implementation, release or publication.

I found no material spec, behavior, authority or completeness issue that would change the decision. The plan fits the current source: it is a small extension of the existing sync mechanism, not a new architecture.

## Spec and behavior findings (none blocking)

**1. Mechanism and schema: coherent and proportionate.**
- Current sync writes `metadata: { ocBeadsSync: { version: 1, instructions } }` (`src/workflows.ts:136-139`). The reader expands it once and strips the key (`src/workflows.ts:92-106`). The plan adds one key, one writer and one renamed helper on top of this.
- **No metadata clobbering.** `CommandInvocation.prompt` is a `PromptInput.Prompt`, and that type has no `metadata` field. So spreading `...input.prompt` and then setting `metadata` overwrites nothing. Prompt-hook edits to `SessionPrompt.metadata` happen after admission and are untouched.
- **Dual-key handling is idempotent in every combination:**
  - Both keys valid: generalized wins and both keys are stripped.
  - Generalized malformed, legacy valid: legacy expands, and the malformed key stays and is inert on a second pass.
  - The reverse case works the same way.
- **Provider serialization (actual behavior, not speculation):** the existing local Responses harness test sends unexpanded stored history with `ocBeadsSync` metadata. It asserts that neither `ocBeadsSync` nor `Invoked command:` appears in the outbound request (`tests/host.test.ts:1037-1039`). The serializer drops message metadata, so leftover unknown or malformed metadata is not a provider leak.
- **Hook placement:** expansion stays before the location and eligibility early returns (`src/host.ts:337, 378`), as the plan states. Nothing else in `host.ts` needs to change.

**2. Command semantics: preserved.**
- All per-command authority lives in the static `WORKFLOWS` purpose strings plus the shared `common` block (`src/workflows.ts:15-45, 115-124`). This includes:
  - restore display-only unless `--apply`
  - compact `--auto`/`--dolt` mode authority
  - stats using `bd status`
  - QuickStart, init, template and delete/import/rename-prefix limits
- The plan moves these bytes into the snapshot unchanged and adds no parsing.
- **Inventory:** 30 unique names, matching the canonical spec's "exactly 30" (`openspec/specs/workflow-access/spec.md:35`).
- **Exceptions:** only diagnostics has dynamic content, built from a runtime report (`src/workflows.ts:143-155`). It is correctly the one retained exception. No other command, including prime, needs one.
- **Canonical spec:** the "invoked name, requested outcome and any literal details" scenario (`spec.md:17`) is still met in the effective context.

**3. Compaction cue: sufficient.**
- The proposed sentence replaces `src/guidance.ts:76`. Its "unresolved inputs or explicit modes" wording covers `--apply`, `--auto` and `--dolt`.
- Eligibility gating stays as is (`src/host.ts:379`).
- The compaction request itself sees the expanded snapshots, so the summarizer gets full instructions. Retention stays semantic and makes no verbatim claim.

**4. Task 8fl: correct.**
- One cohesive record: status `blocked`, no assignee, `implementation_authorized: false`, a `blocks` dependency on 5jm, and an approval-plus-dispatch gate.
- It names the local uncommitted reference (not HEAD), says no release is required, and states that the parent owns sync closeout.
- **Spec sequencing:** the plan requires a scoped change before any product edits. That change must replace the active delta's "All other command outputs and descriptions SHALL remain unchanged" (`openspec/changes/compact-sync-command-context/specs/workflow-access/spec.md:7`). This is the right planning and dispatch boundary.

**5. Tests and evidence: adequate.**
- They reuse the existing five-case results, replay tests and serializer harness, and add one justified smoke test: `update` through native code mode, a path sync never exercised.
- No benchmark or command-by-model test matrix.

## Standards and proportionality findings

None material. The changes are limited to `workflows.ts`, two helper calls in `host.ts` and one sentence in `guidance.ts`. No new hooks, model calls, pending state or registry redesign. Having sync write the generalized key keeps a single writer, and the legacy reader is a small cost for old histories.

## Optional observations (non-blocking)

1. **Fixture reconciliation mechanism.** `tests/fixtures/non-sync-command-baseline.json` stores hashes of `{description, sent}` from a call made with details (`tests/workflows.test.ts:305-308`). It does not store the bare instruction bodies the plan says to compare against. Two ways to get that baseline without "blind regeneration":
   - Rebuild the old payload from each new snapshot (`snapshot + "\n\nLiteral user details:\n" + fixedText` plus the same native fields) and assert it matches the **existing** hash unchanged.
   - Or capture bare-body digests from the reference source before editing.

   Spelling out one of these in the design would remove ambiguity for the implementer.
2. **Spec ordering.** If the sync change is still active, a new delta can't use MODIFIED against a requirement that isn't canonical yet. That would leave the implementer to redo the "unchanged" constraint by hand. Archiving the sync change first is the cleaner path. The plan already delegates this choice to the parent.
3. **Base check durability.** The base check relies on a manifest under `/opt/data/cache/scratch/…`. Recording that manifest's digest in 8fl or the evaluation doc would keep the check usable if scratch is cleaned up. Also, 8fl's acceptance text omits the design's "or parent-accepted equivalent integration" clause, which matters if closeout changes any bytes.
4. **Legacy reader necessity.** If sync and the migration ship together, no released build ever wrote `ocBeadsSync`. The legacy reader then only serves local canary and disposable histories. It is cheap, so keeping it is reasonable while the base order is undecided.
5. **Test updates.** Existing assertions on `ocBeadsSync` and the old cue (`tests/host.test.ts:954, 972, 1008, 1024`; `scripts/test-package.ts:340`) need updating. They fall within the listed test files, but `host.test.ts:972` is a cue assertion that the plan only mentions for `guidance.test.ts`.

## Evidence and limitations

- **Read:** the packet's `plan.md`, `implementation-bead.json` (including the embedded 5jm record), `parent-inventory-check.json` and `command-inventory.json` dispositions.
- **Read in source:** `src/workflows.ts` (all), `src/host.ts:320-389`, `src/guidance.ts:70-77`, the plugin session/command type definitions, the canonical `workflow-access` spec slices, the active sync delta spec, and the relevant test slices (`tests/host.test.ts:940-1048`, `tests/workflows.test.ts` baseline usage).
- **Not run:** nothing. No tests, inventory factory, smoke or live probes. I didn't verify the 182-path hashes myself or reread the evaluation and plan docs.
- **Status:** implementation stays blocked pending owner approval, explicit dispatch, and the parent's choice of base and spec order. The future tests and the `update` smoke haven't been run, and no results are claimed.