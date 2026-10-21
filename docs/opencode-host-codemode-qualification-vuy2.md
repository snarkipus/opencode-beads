# OpenCode 2.1.1 native code-mode follow-up — vuy.2 / task 1.1

## Parent acceptance

Parent independently inspected and reran the offline analyzer: all 15 follow-up cases passed, all 150 protected repository paths and 116 historical evidence files were unchanged. Operator before/after records match; independent current socket inspection confirmed neither owned port listening. Task 1.1 is accepted against the selected contract, combining these new observations with retained prior host evidence and the explicitly owner-accepted decline limitation. The stronger historical decline expectation remains failed, not relabeled passed. No installed product, real-model, explicit Stop/handoff or lifecycle acceptance is implied. The original worker handoff below records its pre-acceptance state.

**Bounded follow-up passed; parent acceptance is pending.** Fifteen isolated released-host cases measured the new namespace, inventory, signature, result-bridge and permission-resource facts. No new unsupported host contract was observed. The historical stronger nested-decline termination case remains **failed, owner-accepted**, as recorded in [the original qualification](opencode-host-qualification-vuy2.md) and [owner decisions](../openspec/changes/archive/2026-10-21-improve-beads-workflow-parity/owner-decisions.md). This report does not check task 1.1, close `.2`, enable the adapter or qualify later installed/model/Stop behavior.

## Identity, authority and retained evidence

- Date: 2026-10-21 UTC. Actor: `codex:oc-host`. Fresh replacement session: `01a15f7e-af76-7d73-9ed3-6d0fe89e3af7`; launch metadata records `gpt-6.1-sol`, high reasoning. No additional worker. This is not a continuation of unavailable session `01a15c62-d106-7e80-af58-5a47b1032cd4`.
- Evidence root **F**: `/opt/data/cache/scratch/vuy2-codemode-followup`. Exact bounded assignment: `F/prompt.md`; current authority: `F/record-current.json`. The original failed resume remains in `F/worker.log`, byte-identical by SHA-256 in `F/identity.json`. `fresh-worker.log` records this replacement's route and actual session.
- Published accepted source / repository HEAD: `8831169d3c83c333fdf13d4a4efc743eaf495e2b`. Entry worktree was clean. Only this new report was added in the repository; all 150 protected paths remain byte-identical to `F/protected.json`.
- Reused exact first-party `@opencode/cli-linux-x64-baseline@2.1.1` from **R**: `/opt/data/cache/scratch/vuy2-oc-host`. Tarball SHA-256 `216d3861d0a167adad5850282439bae13483203f4b110f0510f260118bba2858`; executable SHA-256 `4595933989548a452e920c971d5931898d7d64e73e039f777ed62c84a18916c9`. Published SHA-512 SRI/SHA-1 and both retained registry signatures were independently reverified; actual version output is `opencode v2.1.1`.
- Pinned host source: `ba546ec1598a70db2570e9c6258028d955ba8f58`. All 36 retained source-file SHA-256 and Git-blob identities reverified against the original recorded manifest. This reuses the prior official tag/tree provenance; it is not a reproducible-build attestation or a new upstream lookup.
- Retained analyzer rerun with its single results-file write redirected to `F/prior-analysis.json`: 31 settled historical cases asserted, including the failed stronger decline contract. No old case was rerun. All 116 original evidence files and their path set remain unchanged, checked against `F/prior-evidence-before.json`.
- Beads remains `1.3.1 (c1c4b642a)`; no 1.3.0 qualification. Only `.2` progress notes were written, with explicit `--actor codex:oc-host --sandbox`. `.2` remains `in_progress`, assigned to that actor; `created_by=unknown` remains historical audit data.

## Isolation and measurement boundary

The real released executable served only `127.0.0.1:39161`, PID/process group `747580`. The controlled HTTP/SSE response fixture served only `127.0.0.1:45971`, PID/group `747573`. Separate `F/home`, `config`, `data`, `cache`, `state`, temporary files and committed disposable `F/repo` were used. The actual host project ID was `9ffa3d06bf093090747246e6ac95a65d78123a8c`, with project and location both `F/repo`. Startup used an explicit isolated environment and a newly generated transient server credential. Operator auth/config/environment was not reused.

The provider fixture uses the native OpenAI-compatible HTTP transport. It records request bodies, never Authorization headers, emits the specified tool call, then `CONTROLLED_FIXTURE_STOP`. This measures real host mechanics; it provides no external inference or model-judgment evidence. All registration, catalog instructions, native search/execute, executor/result bridge, permission decisions and native shell execution were supplied by the unmodified release.

The throwaway plugin registers the eleven `beads` leaves through actual `editor.namespace` and `editor.add`, with `namespace: "beads", permission: "shell", codemode: true`. `schema-declarations.ts` copies only the published candidate's declarative schema constants, `outputFor` and input table into scratch; `definitions.json` contains their evaluated JSON. It neither imports nor executes product adapter, guard, argv, routing, normalization or acknowledgement code. `fixtures.json` supplies explicit accepted example inputs, fixed canonical resource templates and synthetic structured output objects. Each permitted target only appends a scratch observation. The resource strings beginning `bd` are never executed. No real project Beads store is opened by a probe.

The plugin returns a deliberately different text sentinel alongside each structured `output`. Observed composed results contain the structured objects, not that sentinel. This demonstrates the real bridge's object result behavior; it does not establish validation of every JSON-schema branch or genuine persistence. The candidate's source tests/CLI acceptance remain separate evidence.

## Observations

| Case | Actual released-host observation |
| --- | --- |
| `catalog-allow` | Provider direct inventory includes `execute` and native `shell`, with no direct Beads leaf duplicates. Code-mode instructions show `beads (11 tools, 4 shown)` and the namespace description. |
| `namespace-search` | Real `search({namespace:"beads",limit:20})` returns all eleven exact `tools.beads.*` paths, `remaining:0`, `next:null`. Signatures expose object inputs, structured Promise unions, status branches and relevant fields; no `Promise<string \| null>` fallback. |
| `execute-denied-shell-allowed` | Provider request has no `execute`, no Beads leaf tools and no Code Mode instructions/catalog. Direct native `shell` remains visible. |
| `execute-and-shell-denied` | Neither `execute` nor `shell` is in direct inventory; no Beads catalog or direct duplicates. |
| `whole-shell-denied` | Native shell and all eleven Beads leaves disappear; `execute` itself remains available for its independently allowed functionality. |
| `selective-catalog` | `shell: bd update *` deny preserves all eleven searchable leaf signatures, including note and get. Resource-selective denial is enforced at invocation, not inferred from tool visibility. |
| `shell-code-search` | Native `search({query:"shell",limit:20})` returns no code-mode tools. Shell remains direct-only; no `tools.shell` fallback is used. |
| `eleven-resource-and-result-bridge` | One composition invokes every leaf once. Eleven native approvals with `save:[]` precede eleven scratch targets. All eleven structured objects survive the real bridge, including multi-ID get, memory map, empty found recall value, completeness and write actor fields. |
| `selective-note-denied` | One note invocation, `Permission.BlockedError`, zero scratch targets, zero prompts/retries. Outer execute carries an inner error and `metadata.error:true`. |
| `selective-get-allowed` | Same selective agent invokes get once, obtains its independent approval and reaches one scratch target. |
| `namespace-correction` | One note invocation, one reject, zero targets/retries. `Tool.Error` wraps `Permission.CorrectedError`; exact feedback `Use staging; namespace original target is not authorized.` survives the leaf, execute output and next provider request. |
| `namespace-decline` | One note invocation, one reject, zero targets/retries. Leaf rethrows `Permission.DeclinedError` unchanged. Outer execute is completed with inner error, `metadata.error:true` and text `Tool.Error`; two provider requests occur. This reproduces the accepted continuation limitation, not a passing whole-step-termination claim. |
| `decline-then-independent-permission` | One composition catches note's plain decline and attempts get. Note never reaches its target; get asks separately and reaches its target only after its own approval. Two invocations, two permission replies, one scratch target. |
| `namespace-invoking-agent` | Response was held after the request snapshot under `probe_selective`; native API changed session default to `probe_allow` before release. Actual invocation/assertion retains `probe_selective` and blocks note. A native agent-omitted evaluation of the exact same resource under the new default allows it. No forged invocation or child dispatch. |
| `native-shell-with-execute-denied` | Real direct `shell` executes `/usr/bin/pwd` once, after its own shell approval, while `execute` remains absent from provider inventory. Exit 0; stdout is exactly `F/repo`. No Beads command runs. |

There are 18 typed leaf invocations, 13 scratch targets and five rejections across these cases. Every rejected leaf has one invocation and zero rejected-target executions; no rejected leaf is automatically retried. The independent later get is a different explicitly planned operation. There is also one harmless native shell process. Exact case session IDs, provider-request counts, inputs, permission source/call IDs, errors and result envelopes are retained in `results.json`, `cases.jsonl`, `api.jsonl`, `provider.jsonl` and `plugin.jsonl`.

Registration definitions are distinct from effective inventory: native transform callbacks logged 44 definition events across rebuilds and two plugin setups; each definition set has the same eleven names. Effective provider inventories and real search outputs establish the eleven callable leaves. The partial inline catalog is not mistaken for a four-tool registration limit.

### Canonical permission-resource observations

All eleven representative operation shapes were observed as native `action:"shell"` permission requests. `get` submits both resources together. Each request includes the actual invocation session and agent, tool message/call source and `save:[]`. **A** below abbreviates the observed host-derived `opencode:probe_ask:<12-hex-session-and-agent-hash>` actor, not a literal actor input. Full resources are in the raw captures. Newlines shown as `\n` below are actual newline bytes in the request.

| Operation | Observed resource shape |
| --- | --- |
| find | `bd ready --limit 3 --json --sandbox` |
| get | `bd show scratch-1 --json --sandbox`, `bd show scratch-2 --json --sandbox` |
| edges | `bd dep list scratch-1 --direction down --type blocks --json --sandbox` |
| memories | `bd memories --json --sandbox -- 'build lesson'` |
| recall | `bd recall build --json --sandbox` |
| claim | `bd update scratch-1 --claim --json --actor A --sandbox` |
| note | `bd update scratch-1 --append-notes 'scratch '\''note'\''\nnext' --json --actor A --sandbox` |
| update | `bd update scratch-1 --status blocked --priority 1 --add-label review --remove-label old --json --actor A --sandbox` |
| close | `bd close scratch-1 --reason 'scratch accepted' --json --actor A --sandbox` |
| create | `bd create --title 'Scratch only' --type task --priority 2 --description 'Fixture only' --acceptance Observed --design Minimal --parent scratch-parent --deps discovered-from:scratch-1 --labels review --json --actor A --sandbox` |
| remember | `bd remember --key build --json --actor A --sandbox -- '-- literal scratch\nlesson'` |

These are host observations of fixed probe definitions representing accepted canonical shapes. Adapter argv construction and every optional operation branch are not requalified here. Existing saved-grant, grant-edit/revocation, deny-precedence, external-directory/location, native command admission and `save:[]` repeat/always observations remain applicable from the original 31-case evidence; no new observation invalidated them.

## Reproduction, harness corrections and cleanup

Run the compact analyzer offline, without a host, provider, credential or product import:

```sh
python3 /opt/data/cache/scratch/vuy2-codemode-followup/analyze.py
```

It asserts actual inventories/search signatures, all eleven observed resources/results, actual actors, denied target counts, feedback/decline envelopes, independent later permissions, native shell result, final empty active/saved lists, protected hashes and unchanged original evidence. It deliberately asserts the stronger decline mismatch instead of relabeling it passed. `results.json` is its retained output.

The exact scratch scripts are retained: `prepare.py`, `make-fixtures.py`, `schema-declarations.ts`, `probe-plugin.mjs`/`plugin/index.mjs`, `start.py`, `provider.py`, `client.py`, `probes.py`, `run-cases.py`, `run-delta.py`, `resume-probe-control.py`, `run-remaining.py`, `run-shell.py` and `cleanup.py`. Launch commands were `python3 F/provider.py` under the explicit provider environment and `python3 F/start.py`; the latter records the actual `serve --hostname 127.0.0.1 --port 39161` command identity/environment names in `process.json`. Schema evaluation used the pinned available Bun executable at `/opt/data/.npm/_npx/60c3515df86f25b1/node_modules/@oven/bun-linux-x64-baseline/bin/bun`. Per-case code and direct tool inputs are captured in native request bodies; `run-delta.log`, `run-remaining.log` and `run-shell.log` preserve execution outputs.

Two harness corrections are disclosed. The first runner attempted to read a not-yet-created plugin log before creating a session; it was changed to treat the absent initial log as empty, with no tool measurement/retry. One approval payload used `reply` instead of the pinned API's `decision` key, producing an actual HTTP 400 (`Missing key at ["decision"]`) in `api.jsonl`/`run-delta.log`. The same pending call was completed using the correct key, without resubmitting the tool or duplicating any target. No host/product contract was changed.

`cleanup.json` confirms both owned process groups terminated, no remaining owned process or listener and neither owned port listening. Before shutdown the native active-session list was empty and saved grants were empty. The server secret and unsanitized private server log were removed; only sanitized logs remain. The provider API-key value was a noncredential fixture placeholder. No genuine external provider credentials were read or used.

`operator-before.json` and `operator-after.json` match for the resolved executable, known global/project configuration/package hashes and version `opencode v2.0.29`; executable SHA-256 remains `7e23471f4ebe2313d78baacc9ac96fe9e197ce26d808de4b0fcc37efbe473dad`. Original evidence and the failed resume log are preserved. The offline analyzer and whitespace checks passed. The unchanged 191-test source suite was not rerun for this report-only qualification.

No source/tests/package/assets/OpenSpec/old report/operator integration edits, task checkmarks, staging, repository commits, pushes, Dolt sync, closure, activation, release or `.6`/`.9` dispatch occurred. The SDK contract is protected by this assignment; parent can reconcile accepted evidence separately. **Smallest next gate:** parent independently reruns the offline analyzer and reviews this bounded report together with the retained historical evidence/accepted limitation, then decides task 1.1 acceptance and publication. Explicit Stop/handoff and real installed/model/lifecycle qualification remain with their existing later owners.
