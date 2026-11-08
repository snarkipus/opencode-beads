# Source acceptance — OpenCode 2.2 adaptation

## Current status

Parent accepts **source tasks 1.1, 1.2 and 2.1 only** for `opencode-beads-5rj.1`. Runtime source is frozen at `ccc9851bce42ec3f5a5b348cfa4cc40e1d93a643`, against accepted planning/mapping base `cd4630c7a4322a8a1439acb714274f6a89ff6c15`. Tasks 2.2 and 2.3, installed-host qualification and final owner acceptance remain unexecuted and separately gated under `opencode-beads-5rj.2`. The epic and active specification change are not complete.

Codex execution: `codex:01a1bce9`, session `01a1bce9-a85c-7492-bf4a-8f462c056a12`, observed `gpt-6-luna/max`. The worker completed normally and handed off SOURCE_READY; this document supersedes its parent-review-pending status without rewriting the original handoff.

## Independent review

Claude source review record `opencode-beads-81x`, session `8173b43a-85d9-4d0c-b5a3-08e91dbf69df`, observed `claude-opus-5-5`, requested medium effort. Read/Grep/Glob only; final result completed without error or permission denials. The complete tracked candidate hash manifest was unchanged across review.

- **Standards: READY, no blocking findings.**
- **Spec, source tasks 1.1/1.2/2.1: READY, no blocking findings.**
- Original report preserved verbatim in [claude-opencode-22-source-81x.md](claude-opencode-22-source-81x.md).
- Some workflow line references in that report use source-patch positions rather than actual source lines. Parent inspected the implementation directly: snapshot validation and current/legacy precedence are at `src/workflows.ts:93–103`, and request-local ID matching/expansion at `114–139`. This citation correction does not change the report's substantive findings.

The review's optional overlapping-request observation is not an established host defect. Its registration-label, redundant-line/extraction, conservative notice recognition and log-key suggestions remain nonblocking; no additional mitigation or refactor was commissioned. `code-mode-only` still describes the native registration option, not a claim that 2.2 cannot expose direct leaves. Per-request leaf availability describes the actual request surface.

## Execution and preservation evidence

Parent independently reran:

- Full suite: **218 pass, 0 fail, 11,883 assertions** across 12 files.
- Exact frozen-archive package smoke: passed; packed public V2 plugin loaded.
- Strict global OpenSpec validation: **4/4 passed**, including the active change.
- Candidate diff whitespace check: passed.

Typecheck passed in the Codex execution log (`$ tsc --noEmit`, successful command result). This is inspected worker execution evidence, not a separately executed parent typecheck; the parent's gateway compiler scan-size limit was not bypassed. Installed SDK was independently verified as **2.2.6**.

The worker's retained RED→GREEN receipt isolates the transport failure after the required SDK harness migration and old admission refusal: location alone was observed before the repair; location then one native context read restores snapshots by retained user ID after it. Tests now use SDK metadata-free projected messages and paired durable native records, rather than injecting metadata directly into model messages. These are deterministic source seams, not an installed-host qualification claim.

Parent compared command callback/payload construction and the workflow purpose/resource inventory byte-for-byte with the accepted base. Continuity operations/CLI invocation, agent definitions, context/cache module, repository guidance and shared Beads skill are unchanged. The accepted deltas are confined to SDK/admission, workflow transport, request capabilities, fixtures and targeted guidance/documentation. No operator configuration/authentication/database changes or upstream patches were made.

## Frozen artifact handoff

- File: `snarkipus-opencode-beads-1.1.0-beta.5.tgz`
- SHA-256: `072d9c29ef89fa2697109be072798e79cf4af622111266de40ef65e7950ac836`
- Runtime source: `ccc9851bce42ec3f5a5b348cfa4cc40e1d93a643`
- Parent verified all **31 packed files** are byte-identical to the corresponding committed source files, with exact expected membership.
- Evidence root: `/opt/data/research/opencode-beads-2.2.6-impact/implementation-5rj1/`; worker `implementation-report.md`, `run.log`, parent `parent-tests.log`, `parent-package.log`, and `claude-source-review/` frozen packet/result.

The internal version remains `1.1.0-beta.5`; this unreleased archive is **not** the published beta.5 artifact. Identify the candidate by source commit and digest. Published beta.5 retains its old `<2.2` admission. The same frozen archive, not a repackaged successor, is the input to task 2.2.

## Remaining boundaries

- Native context/real provider, compaction/model-switch, direct/composed/denied native operations, worker identity and Stop/unload qualification remain unrun under 2.2; final owner acceptance is 2.3.
- The native-compaction/model-switch snapshot-access deficiency `opencode-beads-o66` remains unresolved, upstream-blocked and owner-accepted as nonblocking. README and the active spec disclose unavailable guidance, not restored snapshots or a fixed deficiency.
- Source monitoring remains separate under `opencode-beads-rou`.
- The local evidence/task-marker successor changes no packed file and does not replace the artifact. No source push/merge, registry publication, version promotion, Zeus change, operator activation, canonical-spec synchronization or archival is authorized or implied by this source acceptance.
