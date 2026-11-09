# Two-mechanics completion — TWO_MECHANICS_READY

This bounded continuation supplies the two missing controlled-host measurements: **native title-request snapshot exclusion** and **cancellation of an actually pending diagnostics invocation at product plugin disposal**. Both passed. This is not full task 2.2/2.3 acceptance: the genuine-model workflow remains separately pending with the parent. No genuine inference or account/authentication work occurred.

Executor `codex:86c72145`, unchanged native Codex session UUID `01a1bd7e-5bd2-7720-88f3-870d909d432b`; the actor suffix is the parent execution token. Requested model/effort remains Astra/medium. Same actor claimed normally, read back `in_progress`, and used explicit `--sandbox` for checkpoints/heartbeat. Parent retains assignment, synchronization, markers, acceptance and closure. Work started 2026-11-08 23:50:36 UTC and finished inside the 20-minute bound.

## Exact inputs and isolation

HEAD `f22177939b65ad95e6cf6b7cdb049c07447fd8aa`; runtime `ccc9851bce42ec3f5a5b348cfa4cc40e1d93a643`. The unchanged frozen archive is `/opt/data/research/opencode-beads-2.2.6-impact/implementation-5rj1/snarkipus-opencode-beads-1.1.0-beta.5.tgz`, SHA256 `072d9c29ef89fa2697109be072798e79cf4af622111266de40ef65e7950ac836`. All 31 extracted files match it. Internal beta.5 does not identify the published beta.5 bytes. No source installation, repack, installs or production changes.

Actual installed CLI and owned foreground server report **OpenCode 2.2.6**. Used the existing Node 26 Promise client and public package `./server` directory export. A lifecycle-only observer forwards and awaits the archive's original setup and cleanup without changing context, dependencies, results, hooks or abort behavior.

New scratch root only: `/opt/data/cache/scratch/oc-beads-22-5rj2-completion`. Explicit isolated HOME/XDG config/cache/data/state/TMPDIR; disposable committed Git and embedded Beads fixture at `.../tmp/project`, beneath declared `TMPDIR` (`.../tmp`). `BEADS_DIR` is explicitly `.../tmp/project/.beads`; actual `bd context --json` passed before inference. Fixture init used `codex:86c72145`; no issue writes were needed. `isolated-environment.json` and `preflight.json` record the exact environment and CLI outcomes.

Owned host PID 48839 listened on `127.0.0.1:45205`; owned controlled provider PID 48838 on `127.0.0.1:44577`. Provider `controlled`, model `completion`, native package `@opencode/ai/providers/openai`, variant default, no reasoning effort configured. The native title agent was explicitly routed to this same controlled model, avoiding any implicit alternative provider selection. **Exactly two outgoing provider frames**, both CONTROLLED; fixture token values are synthetic and establish no cost, usage or model-quality claim.

## Native title exclusion — passed

Untitled native root session `ses_e426bc4d1ffenWOvPhD2ZPvMLg` received one actual `/oc-beads:show` command, with exact free text `Explain only the workflow; do not read or modify issues. TITLE_CASE_5RJ2`. No plugin hook was invoked directly.

- `title-context.json` contains compact native user text and a durable current v1 workflow snapshot.
- `provider-001.json` is the actual native title request: stock “Here is the first message…” / “Reply with only the title” framing contains the compact command, zero workflow instruction expansions, no routing metadata and no tools.
- `provider-002.json` is the normal primary request: the identical durable snapshot appears exactly once. This provides a positive expansion comparison in the same native session.
- `provider-001-response.json` records the controlled title response. `native-events.jsonl` records native `session.renamed`, and `title-session-after.json` confirms `CONTROLLED completion title`.

This closes the native title mechanics gap independently of the earlier accepted generate exclusion. It is a representative ordinary-command snapshot observation, not a semantic title-quality claim or a new all-command campaign.

## Actually pending diagnostics at disposal — passed

Native session `ses_e426bc367ffenwuNM2xvM112DT` received an actual `/oc-beads:diagnostics` invocation. A fixture-local PATH shim invokes the real installed `/usr/local/bin/bd`, captures its exact stdout/stderr/exit, and normally forwards them unchanged. For this one diagnostic `context --json`, it held output **after the real subprocess completed**. The shim has no signal handlers, abort mechanism, substitute result or suppression logic. It would forward the original bytes when released if still alive.

The observed sequence (epoch milliseconds):

| Observation | Time |
| --- | ---: |
| Native diagnostics command started | 1794181971099 |
| Real `bd context --json` child 48984 completed, exit 0 | 1794181971231.655 |
| Shim 48982 held completed real output | 1794181971231.7756 |
| Callback confirmed pending; shim live, real child absent | 1794181971251 |
| Watched config removed the plugin | 1794181971251 |
| Original product cleanup entered | 1794181971516 |
| Original product cleanup returned | 1794181971520 |
| Native command returned `CommandExecutionError: Beads workflow unloaded` | 1794181971522 |
| Shim confirmed absent, then harness released hold | 1794181971552 |

`bd-subprocess.jsonl` preserves the real successful context JSON and its SHA256. The diagnostic's result was pending across actual cleanup. The shim disappeared before release, with neither output-forwarded nor output-released event; the product owns cancellation. This occurred roughly 290 ms after holding output, well below the unmodified 10-second subprocess timeout. No harness signal was sent to the shim. Later cleanup signalled only the owned host/provider groups, after this observation was complete.

`disposal-context.json` and `disposal-inbox.json` are empty; no user prompt was admitted and no diagnostics provider frame followed. `commands-after.json` confirms package commands were removed from the native registry. `lifecycle.jsonl`, `timeline.jsonl`, `held-process.json` and `native-events.jsonl` retain the correlation. This is actual watched-config plugin-scope disposal, not location reload, a registry-only inference, Stop, or custom cancellation.

The previous sample in the frozen partial report still remains timing-inconclusive; it has not been relabelled or edited.

## Cleanup and preservation

`cleanup.json` confirms all 12 recorded owned host/provider/shim/real-child PIDs absent, both listeners refusing connections, and no process with a cwd under the new scratch root. Owned sessions were removed; final active execution and permission inventories were empty. Private startup logs, the transient server password and isolated OpenCode data/state/cache were removed. No operator credential was inspected, selected, copied, imported, translated, refreshed or authenticated. No genuine call occurred. The fixture-only dummy API key is a nonsecret constant; it was removed from final scratch config.

All **146 prior durable evidence files** match `prior-evidence-manifest.json`. All **197 protected repository files** match the parent manifest. Captured installed executable/CLI/config fingerprints and the existing repository qualification summary match before/after. All 31 installed archive files match. Old scratch fixtures and raw evidence were not written. No repository file was edited in this continuation. Original compaction failures, stale Stop permission observation and incomplete unload remain preserved historical evidence.

No full source gates or earlier passing campaign were rerun; no source fixes, mitigation, upstream changes, expanded matrix, tracker sync, sibling work, markers, closure/reassignment, commits/push, releases or operator runtime changes.

## Offline parent verification

Run without a host, provider or credentials:

```sh
python3 /opt/data/research/opencode-beads-2.2.6-impact/qualification-5rj2/completion-pass/analyze.py
```

The analyzer checks **22 assertions** against retained raw provider/native/subprocess/timing evidence, archive identity, installed file equality, cleanup and preservation. `analysis.json` retains its output. `harness/` contains the exact scripts and transparent observer/shim; `case-index.json` labels these two passed mechanics and the separately pending genuine gate. No `passed:true`-only surrogate is used. The detailed report is this file; `result.md` is reserved for the CLI final summary.

**Handoff: TWO_MECHANICS_READY.** Leave `opencode-beads-5rj.2` in progress. Parent should review these two observations and integrate accepted status separately; the genuine workflow and full qualification/owner acceptance are not established by this pass.
