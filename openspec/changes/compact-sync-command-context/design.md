# Design

## Context

See proposal.md for motivation. This faithfully implements the parent-accepted corrected plan (SHA256 b2d294985125c08edfc08f7f47d73de83f2cf9790997ed61ec1a9cc90c4e5b37), with independent READY review. The completed sync tasks/evidence below belong to opencode-beads-9ux. Current migration authority is owner-approved opencode-beads-8fl, following reviewed plan SHA256 4aacd1559214d2b16f92449faee4712f1228a9e533e7c23b21afcdf51f69680f and READY planning review SHA256 08cfcc7d81dfd4d6d65c4607f36efd82bfcb219c5d99f86a66f5945b5d03f555. The actual migration base is the accepted LOCAL UNCOMMITTED sync UX reference atop 76549cff2558404f8b855b8708d13ac81c52f138, recorded by the 182-file baseline.json and 167-file protected.json in implementation scratch; HEAD alone is not the implemented base. supported SDK floor stays 2.1.1 and the one disposable runtime sample uses 2.1.2.

## Goals / Non-Goals

**Goals:** Separate all 29 WORKFLOWS displays from effective context through existing public native seams and preserve literal/native inputs, actual execution identity and bounded action semantics.

**Non-Goals:** Diagnostics presentation redesign, eleven-operation architecture changes, upstream repair, actor snapshots, command parsing, title/generate expansion, new registrations, extra model calls, synthetic pairs, process-local queues, retries, support-floor changes or publication.

## Decisions

Use one normal session.prompt with the existing input spread/session/delivery. Visible text is `/oc-beads:<stem>` alone for empty input, followed by one separator space and exact single-line free text, or one separator newline and exact multiline free text. Preserve all whitespace and line endings without headings, trimming or keyword dispatch. Persist only `ocBeadsWorkflow:{version:1,instructions}` for new invocations, including sync, containing unchanged invoked name, purpose, common guidance and installed resource path, excluding literal details and runtime actor/capabilities. Normal prompt hooks, files, agents and skills remain host-owned. Synthetic admission would bypass preparation; paired admission would add scheduling races.

The small pure expandBeadsWorkflowContext helper reads valid version-1 ocBeadsWorkflow and legacy ocBeadsSync user-message snapshots. Generalized wins when both are valid; remove both recognized valid routing keys from the transient copy for idempotence. Malformed/unknown keys and non-user messages remain untouched. Clone the request message/content/metadata and prepend the retained snapshot as user text. Never reconstruct historical instructions from current definitions. Preserve existing content, foreign metadata and IDs/roles; unknown metadata is untouched. Stored text is never executed or promoted to system authority. Existing context and compaction hooks expand after unload checks and before location/eligibility returns. Actual actor, capabilities and holds still come from the existing controller. No history fetch or process state is needed.

Native-window replay retains metadata and expands once on the next primary request. Summary recent-context is rebuilt from stored visible text and remains compact; add exactly one sentence in existing compaction guidance preserving active workflow requested outcome, unresolved inputs or explicit modes, and applicable authority limits. No replay recovery or verbatim summary guarantee. Titles/generate remain compact without new hooks.

## Risks / Trade-offs

- Plugin must be active for expansion → durable metadata is inspectable/exportable; old unmarked history is untouched.
- Summary compaction retains semantic rather than verbatim instructions → one selected continuity cue, tested/documented separately from native-window replay.
- Native compaction can store another snapshot copy; native estimates can miss hidden instructions → disclose storage/estimator limits, do not add host repairs.
- Main input relocates repeated instructions → compare actual outbound serialization for a bounded mixed-workflow/legacy/interleaved/replay fixture, stability, exact snapshot count and current instructions; no token-savings/billing claim. Reject unexplained growth or serialization duplication.
- Genuine acceptance needs current access → use one prescribed disposable installed sample; stop on refresh/reauth needs without modifying operator credentials.

## Migration Plan

Local uncommitted candidate only. Validate scoped specs before product edits, follow vertical RED/GREEN/REFACTOR, run source/package/spec gates, protected hashes and all 30 command description/instruction comparisons (reconstruct historical rich payloads with original fixed details/native fields against unchanged existing digests), then document deterministic evidence separately from inherited beta.3 action acceptance and the one new genuine sample. Parent owns task reconciliation, acceptance, commits, closure and any publication. Rollback is removal of this local candidate; canonical specs/archive remain unchanged.

## Migration execution and compatibility boundaries (8fl)

All WORKFLOWS purposes/common text/JSON-quoted installed resource paths remain unchanged; diagnostics remains the current dynamic observed-report prompt without static metadata. Preserve all 17 skill links, eleven native operations, direct-only shell, permission/cancellation/identity/cache/continuity/overrides/disposal. Only replace the helper import/two calls in existing primary and compaction hooks and the single summary cue. No title/generate expansion, registrations, extra calls or stored-history rewrite.

Existing help/guide/action contracts remain controlling: missing targets and consequential choices require focused clarification; sufficient bounded requests execute with current permissions. Restore is display-only absent --apply; compact --auto and --dolt each require separate explicit mode authority. Preserve QuickStart/current CLI guidance, stats meaning, no-adopt sync, acceptance ownership, no implicit administration/init/repair/cascades.

Migration tasks 4.1–4.5 map only to opencode-beads-8fl and are checked after parent source and corrected-runtime acceptance; independent Opus implementation review also returned READY. Existing completed task IDs/text/checkmarks and original sync evidence remain historical accepted work. Validate this amended active packet strictly before product edits. Follow vertical RED/GREEN/REFACTOR; table-test all 29 workflows/native fields/literal inputs, legacy/dual/malformed snapshots and mixed hook/Responses replay. Run typecheck/full tests/exact archive installed smoke/scoped and global strict specs/hash checks. Perform at most one genuine disposable append-only update through ordinary admission/native code mode with current required access and scoped permission, or report PENDING with blocker; no retry, credential repair or substitute semantic run. Retain new evidence separately in docs/workflow-native-context-evaluation.md and scratch. Parent owns acceptance, closure, archive, commits and publication; no Git writes or other issue mutations.
