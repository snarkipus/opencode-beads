# Design

## Context

Baseline: `11f3a22822b3248a339c1c9014ff667f5d28dfe6`. This revision incorporates the owner's selection of Claude's proportionate recommendation. The earlier candidate and REVISE verdict remain frozen under `/opt/data/research/beads-remote-status-planning/claude-review/`; they are historical evidence, not current delivery instructions.

The existing host callback collects diagnostics and `src/workflows.ts` captures its finished report once. The bounded runner in `src/prime.ts` already supports timeout and plugin-disposal cancellation. The revised path extends those seams, not typed tools. The current command description promises collection without opening a store; task 1.3 must replace that promise.

Source pins remain Beads 1.3.1 `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c` and 1.3.4 `7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde`. Existing `native/manifest.json` and correction `revision-native/manifest.json` in the evidence directory pin source blobs at both versions. All findings here are source-backed, not native execution qualification. Claude's review was also source-only (session `a8d41621-2798-48d6-ba00-1b9b0576de11`, observed Opus 5.5).

## Goals / Non-Goals

**Goals:** distinguish native local-only/target states in ordinary local diagnostics; measure history only when explicitly requested; retain three independent rows and useful severity.

**Non-goals:** custom resolution, reading Dolt internals, suppressing/emulating native maintenance, plugin schema guards, new permission machinery, human authentication, background work, additional commands/dependencies or live-store qualification. The owner has selected strict-readonly ordinary opening and the disclosed effects of explicit observation. Planning acceptance and implementation dispatch remain distinct.

## Decisions

### 1. Local producer and deferred history producer

Retain existing local collection and its diagnostic environment overlay. In a confirmed, supported session workspace add:

- Ordinary target observation: `bd --readonly dolt remote list --json --sandbox`.
- Exact `remote` and `details remote` remain local on the current pins. Do not spawn a history probe without a qualified native exact-branch operation.

Use the existing bounded runner and invocation location, no retry. Ordinary/details never fetch or contact the sync destination. In server mode a listing still uses the configured native database connection; “no network” must not be advertised as a universal topology guarantee. This is native store access, not an additional connectivity test.

| Mechanism | Pinned source at validated version (matching minimum-version evidence retained) | Effects / adapter decision |
| --- | --- | --- |
| Strict readonly | [main.go policy](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/main.go#L223), [maintenance gates](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/main.go#L1611) | `runMaintenance=false`, auto-start disabled, post-command maintenance skipped. Ordinary listing's mutation-free intent is source-backed; task 2.1 verifies actual opening, locking, latency and no version/schema writes. |
| Native listing | [dolt.go](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/dolt.go#L1735), [store query](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/internal/storage/versioncontrolops/remotes.go#L10) | Lists native names/URLs; normalize to bounded name/status evidence and discard URLs before capture. No fetch. A generic listing failure does not prove an absent target. |
| Native default and empty evidence | [embedded default](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/internal/storage/embeddeddolt/version_control.go#L480), [configured-remote decision](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/dolt.go#L247) | `origin` is the native embedded push/pull default and the peer any future qualified history operation would use for a Resolved target. Server empty-list evidence is insufficient because native persisted remotes can exist. No generic replication of native routing. |
| Context mode | [context producer](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/context_cmd.go#L14), [view](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/context_proxied_server.go#L63), [mode methods](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/internal/configfile/configfile.go#L339) | Context exposes `backend`, `dolt_mode`, and server/proxy evidence. Current plugin drops these. Retain the smallest diagnostic projection; absent/conflicting mode evidence stays Unknown. |
| Rejected history producer | [federation status](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/federation.go#L314), [default versus explicit refspec](https://github.com/dolthub/dolt/blob/796d07497741/go/libraries/doltcore/env/actions/remotes.go#L507-L536) | On 1.3.1 and 1.3.4, an empty disposable `file://` destination returned byte-identical stdout to genuine divergence after a tracking ref was cached. Default fetch can return before pruning. Exact refspec is a source-backed candidate, not a qualified Beads API. |
| Observation versus sync | [fetch versus pull](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/internal/storage/versioncontrolops/remotes.go#L36) | Fetch does not merge/pull/push history. `--sandbox` retains anti-autopush policy, not a no-write or no-maintenance guarantee. No automatic sync, merge, push or retry. |
| Hook warning | [hooks.go](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/cmd/bd/hooks.go#L1694) | Warning uses YAML-facing configuration separately from native store remotes. Do not execute hooks, including publishing chains, to collect it. No new warning collector. |

### 2. Native target interpretation, including mode evidence

Extend the existing context projection in `src/guard.ts` with optional diagnostic backend/mode and booleans for native server/proxy evidence, without changing admission. Native JSON explicitly exposes `backend` and `dolt_mode`; the current `BeadsWorkspace` only retains path/root/config-presence. Do not assume runtime mode is already available in the plugin.

A concrete source limitation matters: `GetDoltMode()` can return persisted `embedded` while `IsDoltServerMode()` honors environment/server configuration; `applyContextBackend()` then also emits server endpoint fields. Treat that conflicting observation as Unknown, using those native fields rather than recreating environment/config precedence. Missing or unrecognized mode, non-Dolt backend and proxied-server mode are also Unknown. Qualification includes that conflict. No `.dolt` inspection or new mode resolver.

For an unambiguous supported direct embedded/server context and a complete successful native listing:

| Evidence | Sync target | History before any explicit attempt |
| --- | --- | --- |
| Native `origin` listed | Resolved (`origin`, no URL) | Not checked |
| No remotes, confirmed embedded context | Local-only | Not applicable |
| No remotes in server context | Unknown | Not checked |
| Only other named remotes | Unknown | Not checked |
| Failure, unsupported/partial shape or conflicting/unsupported context | Unknown, with concise reason | Not checked |

Local-only means no current registered native remotes for this embedded store, not a promise that adoption can never occur. Details notes that native push may offer Git-origin adoption with consent. YAML presence alone does not select the current native remote; missing YAML/hooks is never proof of Local-only. A listed but unreachable `origin` stays Resolved and later history becomes Check failed, never Local-only.

Unresolved is reserved for positive native evidence that an expected target fails resolution. The current listing's generic `remote_list_failed` error is insufficient; do not invent an error-string resolver or tests for a nonexistent producer. Unknown is the honest outcome for those failures. This diagnostic selects the native default-name seam, not every possible administrative `--remote` choice.

### 3. Exact selectors and fresh result

After trimming and case folding, recognize only `help`, `details`, `remote`, and `details remote`. Bare/other text stays normal. `help` remains static and bypasses collection. `remote` uses normal tables; `details remote` adds bounded evidence. Neither exact nor non-exact selectors fetch on the current pins. Preserve the exact original input, attachments and delivery in the saved invocation.

Run one target check first. Local-only gives Not applicable. Otherwise, with no qualified history producer, report Not checked with the reason and spawn no history command. A future supported native producer must bind the selected peer and current branch to the tip actually fetched and compared in this invocation. A missing branch must fail even if a tracking ref is cached; do not clear refs, prune, invoke standalone Dolt/SQL from the plugin, or compare transport hashes. A separate approval and disposable qualification must precede enabling that producer.

Once qualified, zero/zero is In sync; positive/zero Local ahead; zero/positive Remote ahead; positive/positive Diverged. A started operation with no proven comparison is Check failed, never a cached status. Qualification must cover a present branch with both unchanged and changed tips, a missing branch with a cached ref (including an empty destination), and an unreachable destination; require sanitized output and disclose local object/ref writes and applicable native maintenance. No cache deletion, merge, push, migration workaround or new dependency is in scope.

Capture the observation once, with time, requested mode, native producer and outcome. Existing replay never reruns it. No remote URLs or credentials enter normal output or details; reduce errors before snapshot capture. Timeout or plugin disposal does not trigger retries; disposal prevents late prompt submission. A known unsupported path skipped before spawn remains Not checked; a started command that actually fails is Check failed if a report can still be submitted.

### 4. Proportionate callback execution

Use the current command callback and `runBd` timeout (10 seconds by default), diagnostic environment and plugin-disposal signal. The explicit selector requests that operation under existing user/repository authority and native host dispatch. No added `permission.assert`, typed-tool bridge, per-invocation abort promise or human-authentication layer.

The installed 2.3.0 API exposes `session.command`, described as executing a slash-command callback immediately, and plugin `CommandInvocation` has session/prompt/delivery but no authenticated human-origin field or abort signal. Thus “only a human can invoke this” is not a supported guarantee. This bounded source check does not establish that a stock model has a dedicated slash-command tool; it establishes that programmatic host invocation exists. Preserve that host surface and applicable authority; do not infer permission to call it from readiness or old snapshots. This is not a new owner decision or a prerequisite for an authorization framework.

### 5. Presentation and delivery

Extend Git hooks in place and append Sync target / Remote history, preserving all other checks. Missing optional hooks and ambiguous false-installed evidence are neutral; installed/shim states assess installation only. Positively observed installation problems remain mismatch. Retain a warning independently of a Resolved target only if an existing allowlisted native observation actually returns one. Do not add a warning collector, synthesize warning evidence from source or configuration, or run hooks to obtain it.

Remote differences/failures contribute mismatch, not automatic Plugin or local-store unhealthy. Local ahead is unpublished work. Neutral rows do not contribute severity; retain a short Remote history not checked summary when applicable. In `details remote`, replace the blanket remote-freshness caveat with evidence scoped to the actual Beads history outcome: fresh result, attempted failure, or unperformed comparison. Source-Git freshness remains unchecked. Keep useful review/verification actions, deterministic headers/report framing, full prime/memories and existing replay/override/disposal behavior.

Help/docs and the command purpose disclose strict-readonly ordinary store access and that history is not fetched on the current pins. If a native history producer is later enabled, disclose its fetch and applicable maintenance/migration effects then. Do not claim that the subsequent full-prime request is store-free. No new public command or skill resource.

## Risks / Trade-offs

- **Native opening is not artifact-free** → disposable runs on 1.3.1/1.3.4 observed incidental lock/marker/mtime effects, not sampled schema/config/data content changes. Task 2.1 verifies the integrated local path; live server behavior remains unqualified.
- **Context mode can be contradictory** → preserve the native ambiguity as Unknown; no reconstruction of upstream routing.
- **Explicit observation has native maintenance effects** → disclose them accurately and use normal native behaviour; no new migration guard or automatic repair.
- **Comparison is point-in-time** → captured time/scope, no live claim on replay or polling.

## Migration Plan

No plugin-driven data/configuration migration. Following separate implementation dispatch, implement only local observations, selector reporting and revised command purpose; qualify the integrated local path and run the existing suite. Existing snapshots replay unchanged. Fresh history, release/publication and archival remain separate authorization boundaries.
