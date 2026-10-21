# Exact OpenCode 2.1.1 host qualification — vuy.2 / task 1.1

**Result: NOT QUALIFIED.** The real released host passed the independent permission, discovery, identity, grant, location and command probes below. Code-mode explicit decline failed to preserve the abort outcome. Task 1.1 remains unaccepted; privileged continuity remains withheld. No source fix, fallback, namespace change, activation or later-child work was performed.

## Identity and isolation

- Repository baseline: `072429f1a7723ade23e756a921924d9d0acacf31`, branch `openspec/improve-beads-workflow-parity`. Entry status included an untracked `.claude/settings.local.json`, left untouched.
- Executor: `codex:oc-host`; actual worker session/thread `01a15c62-d106-7e80-af58-5a47b1032cd4`. Requested model/reasoning: `gpt-6.1-sol` / high. No delegated workers.
- Execution date: 2026-10-21 UTC. Evidence root, abbreviated **R** below: `/opt/data/cache/scratch/vuy2-oc-host`.
- Official exact package discovered from pinned `packages/cli/package.json`, `script/build.ts`, `script/publish.ts` and [exact CLI registry metadata](https://registry.npmjs.org/@opencode%2fcli/2.1.1): `@opencode/cli-linux-x64-baseline@2.1.1`. No latest install or global package mutation.
- [Binary metadata](https://registry.npmjs.org/@opencode%2fcli-linux-x64-baseline/2.1.1) identifies the first-party repository and exact tarball. Published SHA-512 SRI and SHA-1 both matched. Both registry signatures verified with the matching public key from `https://registry.npmjs.org/-/npm/v1/keys` using `openssl dgst -sha256 -verify`; results retained in `npm-signature-results.json`.
- Tarball SHA-256: `216d3861d0a167adad5850282439bae13483203f4b110f0510f260118bba2858`. Extracted executable `R/release/package/bin/opencode` SHA-256: `4595933989548a452e920c971d5931898d7d64e73e039f777ed62c84a18916c9`. Actual command output: `opencode v2.1.1`; extracted package name/version also read back.
- Official `v2.1.1` tag resolves to `ba546ec1598a70db2570e9c6258028d955ba8f58`, tree `6b520b02605e7eafa41c03bf9d4e0cab029d5f9c`. Thirty-six bounded source files fetched for setup/API lookup were Git-blob verified against the complete cached pinned tree; see `source-verification.json`, `source-tag.json`, `source-commit.json`. This establishes artifact integrity and official source/release identities, not an independent reproducible-build attestation.
- Separate `R/home`, `config`, `data`, `cache`, `state`, temporary files and a fresh `R/repo` with an initial Git commit. The resolved project ID was `4cc9a0e821dd59eb76d00cd84d22650766c9efd0`, not the shared global project. All startup environment variables were explicitly constructed; no operator environment/auth database was reused.
- Foreground `serve --hostname 127.0.0.1 --port 43355`, PID/process group `634873`, launched from `R/repo`. The controlled local HTTP provider ultimately ran as PID/group `635618` on `127.0.0.1:39209`. No service command, external binding, tunnel or operator restart.
- Provider/model: **controlled local response fixture**, provider ID `vuy2-fixture`, model `deterministic`, using the host's native OpenAI-compatible HTTP/SSE transport. It emits one planned tool call and then `CONTROLLED_FIXTURE_STOP`. No external inference, genuine credential access or model-obedience claim. It records request bodies, never Authorization headers. Host tool registries, permission service, saved-grant storage, code-mode runtime and execution are real.

## Probe scope and results

`plugin/index.mjs` is a throwaway Promise plugin registering only `probe_direct` (`codemode: false`), `probe_code` (native code mode), both with `options.permission: "shell"`, and a harmless `oc-beads:ready` command. Its tools pass actual invocation `sessionID`, `agent`, `messageID` and call ID into `permission.assert`, use exact supplied resources and `save: []`, and rethrow rejection unchanged. Before approval the target cannot run. Early targets append a scratch observation only; later location probes additionally run `/usr/bin/pwd` with an explicit scratch cwd. Resource strings beginning `bd` are permission probes, not project-tracker operations. The native `bd` comparison uses a scratch-only shell stub that prints `VUY2_THROWAWAY_BD_STUB_NO_DATABASE` and its cwd.

The local fixture chooses calls and API replies deterministically. This measures host contracts and propagation; subsequent real-model decisions remain task 6.2. `analyze.py` checks the recorded observations, not a mock implementation. `results.json` indexes all full host session IDs; `cases.jsonl` contains invocation, assertion, evaluation, rejection, target and after-hook records. There were 31 settled probe cases plus one superseded setup attempt with no tool measurement. Counts do not determine acceptance.

| Selected case | Result and exact evidence |
| --- | --- |
| Whole-shell deny, direct and code-mode discovery | **PASS.** `deny-discovery`: provider request lacks direct `probe_direct` and the `tools.probe_code` catalog entry. `selective-discovery` contains both. Actual inventories are in `provider.jsonl`, not inferred from registration metadata. |
| Selective operation denial in both paths | **PASS.** `selective-deny-direct` / `selective-deny-code`: `bd forbidden target` yields `Permission.BlockedError`; no target event. Code-mode outer completion carries `metadata.error: true` and an inner error record; it is not target success. |
| Actual invoking agent differs from session default | **PASS.** `invoking-agent-differs`, session `ses_ea3960befffeIVHsw6iL9hJ4H3`: provider response held after the real request snapshot for `probe_selective`; native `POST /api/session/:id/agent` switches the session to `probe_allow`. Readback confirms that default; an agent-omitted native permission request for the same resource allows. Releasing the original response invokes the tool as `probe_selective`; its explicit-agent assertion denies `bd forbidden identity-target`. No child agent or forged invocation context. |
| Allow and ask | **PASS.** `allow-direct-http` / `allow-code` reach one target each without a prompt. Ask cases wait for native API approval before a target event. Exact action/resource/source fields are retained in `api.jsonl` and `plugin.jsonl`. |
| `save: []`, always and repeat ask | **PASS.** `ask-always-first` approves `bd update throwaway --append-notes 'probe text' --json --actor codex:oc-host --sandbox` with `always`; saved list remains empty. `ask-always-repeat` asks again. Each reaches one target after its own reply. No Beads write occurs. |
| Correction with feedback, direct | **PASS.** `corrected-direct`: `reject` with `Use staging; original target is not authorized.` yields `Tool.Error` wrapping `Permission.CorrectedError`. Native message has `state.status: error`, `error.type: permission.rejected` and exact feedback. Zero target events and one invocation; the fixture's next step only stops. |
| Correction with feedback, code mode | **PASS.** `corrected-code`: exact `Use staging; code target is not authorized.` survives leaf rejection, inner error and outer code-mode output/`metadata.error: true`. Zero target events and one invocation; no retry. |
| Explicit decline, direct | **PASS.** `declined-direct`: leaf rejects with `Permission.DeclinedError`; native tool message is `aborted`, assistant error says `Step interrupted`, and no next provider request occurs. Zero target events, one invocation. |
| Explicit decline, code mode | **FAIL.** `declined-code`, session `ses_ea396cc6affenEp6WisS1KyHef`, message `msg_15c6933a4001vwxlp9uhAKg3TG`, call `vuy2_declined-code`: leaf rejects with `Permission.DeclinedError`, but outer `execute` has `status: completed`, text `Tool.Error`, inner `status: error` and `metadata.error: true`. It loses the distinct decline/abort outcome and allows a second provider request, unlike direct decline. Target never runs and is not retried. This is a failure of preserved decline propagation, not evidence that the rejected operation succeeded. Affected path stopped after observation. |
| Existing shell `bd *` grant and deny precedence | **PASS.** A fixture-owned grant is created through native session permission request/reply with `save: ["bd *"]` and `always`. `saved-bd-direct`, `saved-bd-code` and `native-bd-existing-grant` proceed without asks. The native command resolves to the scratch stub (first checked by `native-stub-path`), never the installed Beads CLI. `saved-deny-wins` remains blocked by configured `bd forbidden *` deny. |
| Externally edited/revoked grant | **PASS.** Native saved-permission PATCH changes `bd *` to `bd other *`; the next equivalent request asks. Restoring it allows code mode; DELETE makes code mode ask again. Stronger same-session sequence `native-bd-existing-grant` → `same-session-grant-allows` → `same-session-edited-reask` → `same-session-revoked-reask` also asks after edit/revoke, without restarting the host or replacing the session. All fixture grants removed; final saved list empty. |
| Explicit external-directory assertions and actual location | **PASS.** `native-external-pwd` and `typed-external-pwd` request exactly `external_directory: ["R/external/*"]` followed by `shell: ["/usr/bin/pwd"]`, each asking twice. Both actual processes exit zero and print `R/external`. Typed host/session locations both remain `R/repo`; explicit cwd is `R/external`. `typed-local-pwd` / `native-local-pwd` both print `R/repo` and require no external permission. Here `R` abbreviates the full path; logs retain the literal strings. |
| External correction and deny | **PASS.** `typed-external-reject` retains correction feedback and never reaches shell assertion/target. `typed-external-deny` and `native-external-deny` retain the actual blocked external resource and report errors before successful execution. No routing or final-store confinement claim. |
| Native `oc-beads:ready` registration/admission/invocation | **PASS.** `/api/plugin` reports the local throwaway plugin active; `/api/command` lists the exact namespace. `POST /api/session/:id/command` with literal `literal $ARGUMENTS / ready` and `delivery: queue` returns 204; the command body records those literal arguments and the actual session ID. No command rename or production adapter. |

## Decline mismatch and supported disposition

Pinned [Promise permission declarations](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/plugin/src/promise/permission.ts) document plain rejection ending the current step and requiring rethrow. The probe does rethrow. The [code-mode result construction](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/codemode/tool.ts#L89) returns a normal tool result with error metadata when runtime execution fails; the observed outer envelope and continuation are consistent with that path. No upstream test service mock was used to establish this result.

The concrete remaining prerequisite is a parent/owner disposition of the demonstrated exact-host code-mode decline incompatibility, followed by passing measured evidence for the selected guarantee on an explicitly authorized host. No supported 2.1.1 configuration remedy was established. This worker did not patch upstream, add a permission translator, hide code-mode tools as a workaround, choose N0 or activate continuity. Independent passing cases do not complete task 1.1. External-provider/model behavior, child handoff/stop/recovery, installed-package access/unload/reactivation and final product acceptance were **NOT RUN** under this authority.

## Reproduction and evidence

All scripts and payloads are scratch-local. To reproduce in a **fresh** dedicated scratch root, replace the literal root in the retained Python/plugin files, retain the verified `release/package` artifact and `plugin/package.json`, and follow this sequence. `start.py` now contains the final supported package-object configuration; the original setup attempt used a string directive, which did not load a package. A separate abandoned in-process language-hook fixture did not intercept native HTTP transport, tried only an unreachable loopback URL, reached no tool, and was interrupted. Neither setup attempt is accepted contract evidence.

```sh
# From the fresh scratch root; provider binds loopback and writes provider-process.json.
python3 provider.py > provider-process.log 2>&1 &
python3 start.py
python3 - <<'PY'
from probes import *
api('POST', '/api/location/reload', {})
s = create('probe_allow')
api('POST', f'/api/session/{s}/command', {
    'name': 'oc-beads:ready', 'text': 'literal $ARGUMENTS / ready', 'delivery': 'queue'})
run('repro-deny-discovery', 'probe_deny')
run('repro-correction', 'probe_ask', {
    'name': 'probe_direct', 'input': {'resource': 'bd show throwaway --json'}},
    [{'decision': 'reject', 'message': 'Use staging'}])
run('repro-code-decline', 'probe_ask', {
    'name': 'execute', 'input': {
        'code': 'return await tools.probe_code({resource:"bd show throwaway --json"});'}},
    [{'decision': 'reject'}])
PY
python3 cleanup.py
```

`client.py` sends authenticated native API requests without logging the transient credential. Actual request/reply payloads for **all** measured cases, including native grant creation/PATCH/DELETE and the agent switch, remain in sanitized `api.jsonl`; provider bodies are in `provider.jsonl`. `plugin.jsonl`, `cases.jsonl` and message API readbacks expose leaf versus outer outcomes. `analyze.py` verifies filtering, exact resources, target absence/counts, feedback, same-session grant behavior and the decline difference from those retained traces; it passed. `evidence-sha256.json` identifies retained evidence bytes. Runtime commands read Bun `1.3.14` (existing baseline build), OpenSpec `1.14.2` and Beads `1.3.1 (c1c4b642a)`; no runtime repair or dependency edit occurred.

## Cleanup and handoff

`cleanup.json` records both owned process groups stopped, no remaining owned process and no listening socket on either port (`43355`, `39209`), checked through `/proc` process/FD/socket data. The scratch server credential and unsanitized server log were deleted; sanitized logs, source/artifact identities and executable remain under R. Final active-session and saved-permission API lists were empty before shutdown.

Before provisioning and after shutdown, `/usr/local/bin/opencode` resolves to `/opt/hermes/image-toolchain/npm/node_modules/@opencode/cli/bin/opencode.exe`, reports `opencode v2.0.29`, and hashes to `7e23471f4ebe2313d78baacc9ac96fe9e197ce26d808de4b0fcc37efbe473dad`. `operator-before.json` / `operator-after.json` show identical hashes for the executable and known existing global/project OpenCode configuration/package files. No configuration or credential contents were dumped.

Documentation checks: strict change and all OpenSpec validation, planning validator against `/opt/data/cache/scratch/parity-sources`, and `git diff --check`. Source/package/assets/OpenSpec/reviews remain unchanged. No staging, repository commit, publication, remote synchronization or closure. At worker handoff `.2` remained `in_progress`, assigned to `codex:oc-host`; parent owns acceptance, markers and closure.

## Parent evidence review and disposition

Parent inspected the throwaway plugin and the pinned Promise permission and
code-mode implementation, then independently ran the retained evidence analyzer.
Its raw-log assertions passed for 31 settled cases, including zero target events,
one leaf invocation and the same `Permission.DeclinedError` for each decline
path. The direct path made one provider request and aborted; code mode made two
requests and exposed an outer completed envelope with inner error metadata.
This is **not** evidence of unauthorized target execution, a retry, or a successful
persistence acknowledgement. It is a host-owned decline/step-termination mismatch
against the selected preserved-outcome contract and the pinned declaration.

Parent independently verified the isolated executable hash, current operator
executable/config hashes, absence of both owned listeners and deletion of the
transient fixture credential. The controlled provider tests real host contracts,
not external-provider or model-obedience behavior.

A bounded first-party lookup found [PR #46056](https://github.com/anomalyco/opencode/pull/46056),
which describes the same nested-decline problem and proposes explicit decline
propagation. Its API state is closed with `merged_at: null`; **this is not a merged
or released fix**, and no successor or supported released remedy is established
by that lookup. No upstream issue/comment, patch, version change or further host
experiment was performed.

**Disposition:** `.2` blocked for owner/parent disposition of the code-mode
plain-decline path; task 1.1 remains unchecked and activation stays withheld.
Preserve the passing independent observations. Do not invent a local translator,
weaken the selected contract, silently disable code mode or choose another host
baseline. Later .6/.9 work, publication and activation remain separately gated.

## Superseding owner disposition: accepted limitation, investigation pause

Matt subsequently accepted the as-built code-mode continuation limitation while retaining composition. The failed stronger plain-decline/whole-step-termination observation above remains failed historical evidence; it is now an accepted host limitation rather than a demand for downstream repair or a supported upstream fix before shipping. Zero rejected-target execution, no plugin automatic retry, correction feedback, independent later-operation permissions and truthful persistence results remain required. Explicit Stop/Cancel is separate and still requires qualification.

Task 1.1 is not checked or closed by this decision. Remaining qualification/activation is paused for bounded product investigation `opencode-beads-wgv`, including the separate product output-schema defect. No current host experiment, operator change, activation, source fix, publication or tracker closure is authorized. The existing 31-case evidence and cleanup remain intact.
