# Proposal

## Why

Users can see that the plugin loaded while still missing useful evidence about Beads hooks, shared instructions and cached context. The supplied Docker Lab and Snark Surface cases show why one concise report should separate observed integration conditions from native maintenance advice and unmeasured store health.

## What Changes

- Extend the existing `/oc-beads:diagnostics` command with separate internal plugin-integration and native-Beads collectors, feeding fixed compact Markdown Plugin / Beads tables with labeled header metadata through the existing captured-report delivery path.
- Add explicitly invoked, bounded local observations of native hook status, managed instruction blocks, shared-skill presence, effective skill overrides and context provenance/freshness. Retained guidance may be benign customization; presence does not prove use or currency.
- Preserve the no-store-opening diagnostics contract. Add `bd hooks list --json` to the existing version/context probe allowlist only after narrow native qualification, with command-scoped suppression of native metrics/export side effects. No configuration changes, network freshness checks or repairs.
- Show CLI witnesses only as recorded/running values that match or differ. Distinguish actionable evidence, conditional maintenance advice and unknown completion; never infer schema state or reinstate admission holds.
- Render healthy ✅, mismatch ⚠️ and unhealthy ❌ roll-ups from assessed checks, with visible neutral not-observed/incomplete fields excluded from headings and severity. Normal output omits routine provisos, limitations footers, unmeasured rows and full evidence JSON; exact trimmed case-insensitive `details` free text selects bounded evidence at capture time; exact `help` selects a self-contained static reference without invoking collection. Expose existing command-membership truncation separately from description clipping and label the witness Recorded bd version. Use short descriptive rows including AGENTS Configured, keep raw marker/request counts and description-cap evidence in details, and place exact code-populated DATE, VERSION and native root PATH in separate paragraphs below the title, before the summary; a missing root stays explicitly not observed.
- Preserve compact history, snapshot replay, overrides and cancellation. The captured payload is a finished code-rendered report, bounded by literal report markers and newline separators before the preserved invocation; narrow instructions request only faithful report relay, without guaranteeing the subsequent model response.

## Capabilities

### New Capabilities

None. This extends the existing workflow-access boundary.

### Modified Capabilities

- `workflow-access`: widen the read-only diagnostics observations, define actionable bounded reporting and instruction/context evidence, while preserving native store ownership and current workflow delivery.

## Impact

Expected implementation seams are `src/host.ts`, a small `src/diagnostics.ts`, `src/guard.ts`, `src/context.ts`, `src/instructions.ts`, `src/prime.ts` and the diagnostics snapshot in `src/workflows.ts`; focused tests, `scripts/bd-contract.ts`, user guidance and pinned interface/reference facts accompany them. No new dependency or command is required. Keep existing command descriptions and the 30-command inventory.

CLI minimum 1.3.1, validated baseline 1.3.4, exact host qualification 2.3.0 and admission `>=2.3.0 <2.4` remain unchanged. Native full prime/memories and permissioned operations remain unchanged. SQL analysis, a maintenance ledger, telemetry features, background scans, remote freshness, setup/repair execution and host rollout are excluded. Low effort and an ecosystem adoption gap are hypotheses, not measured claims.

The integrated observations and original five tasks are accepted completed work. The accepted first presentation refinement is mapped exclusively to opencode-beads-30e and follows the existing collector contract; existing native qualification is reused. Canonical synchronization, archive, closure and publication remain separately controlled by the parent.

The owner-authorized TUI polish follow-on is mapped exclusively to opencode-beads-5gb (tasks 5.1–5.3). It refines presentation and adds static help plus a focused diagnostics reference; collectors, native receipts, command/resource inventories and ordinary prime/memory lifecycle are retained.

Owner-authorized report-template follow-on opencode-beads-c4a owns only tasks 6.1–6.3. New diagnostics captures use explicit report/request boundaries and header metadata; older snapshots and all 29 generic workflow payloads remain unchanged. The request-boundary ambiguity is reproduced locally; the affected canary cause remains unresolved, and no new TUI architecture or direct assistant-display guarantee is implied.
