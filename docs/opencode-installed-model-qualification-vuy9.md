# Installed-package / real-model qualification — vuy.9

**Task 6.2 failed a selected lifecycle guarantee and remains incomplete. Task 6.3 was not started.** On the released host, an actual request waiting for package-owned prime output sent a late Beads context to OpenAI after the package had disappeared from the native registries. Passing registry restoration and earlier source/host/Stop evidence do not satisfy that guarantee. No source repair, changed acceptance contract or activation is authorized by this report.

## Candidate, identity and evidence

The sole worker was `codex:oc-accept`, actual Codex session `01a15ff1-fc4e-7d53-9b4d-2cb102cd4f76`, gpt-6.1-sol/high. Repository HEAD was `d5e2b172c3ab7106b2ea1a55af3725821f4b4d9a`; accepted runtime source was `8831169d3c83c333fdf13d4a4efc743eaf495e2b`. Evidence root **R** is `/opt/data/cache/scratch/vuy9-installed-model`. `prompt.md`, `record-before.json`, `identity.json` and the parent-frozen `protected.json` retain authority and provenance.

The reused first-party OpenCode executable is `/opt/data/cache/scratch/vuy2-oc-host/release/package/bin/opencode`, version **2.1.1**, SHA-256 `4595933989548a452e920c971d5931898d7d64e73e039f777ed62c84a18916c9`. Its retained archive SHA-256 is `216d3861d0a167adad5850282439bae13483203f4b110f0510f260118bba2858`. SHA-512 SRI, SHA-1, both registry signatures, and all 36 previously retained source-file SHA-256/Git-blob identities were reverified. Additional inspected provider/lifecycle files were checked against the retained official tree at **`ba546ec1598a70db2570e9c6258028d955ba8f58`**. This reuses release provenance, without asserting reproducible-build equivalence. Beads was **1.3.1**, commit `c1c4b642a`, executable SHA-256 `a8f48d771b9e11eccfced4aed72923b59eda746f7a9b425e7ca1af7a51251653`.

The existing `bun pm pack --destination R/archive --quiet` path produced `snarkipus-opencode-beads-1.0.2.tgz`, SHA-256 **`e952532140b44f812e2660425ec485d3bbd474962dd424ed03d70108593b259f`**, matching accepted source acceptance. Both the scratch consumer installation and native host installation contain the same 31 files, each byte-identical to the repository preimage. `artifact.json` records the entire content manifest and both exact install paths. The native installed root was:

```text
/opt/data/cache/scratch/vuy9-installed-model/cache/opencode/npm/file:/opt/data/cache/scratch/vuy9-installed-model/archive/snarkipus-opencode-beads-1.0.2.tgz/1792611344357/node_modules/@snarkipus/opencode-beads
```

All qualifying package behavior below used the **ordinary, unchanged packed package** through native `file:` archive installation. Its privileged typed path remained withheld. A minimal immutable bootstrap importing this installed `src/host.ts` with the existing `continuityQualified:true` dependency was prepared but **never activated**: no typed qualification ran before the lifecycle failure. It did not bundle a different source candidate, replace assets or alter the installed package. `bootstrap-identity.json` preserves that unused preparation and its distinction from ordinary installation.

The [accepted source report](code-mode-source-acceptance-vuy10.md), [native-host report](opencode-host-codemode-qualification-vuy2.md), [original host evidence](opencode-host-qualification-vuy2.md) and [Stop/handoff report](opencode-stop-handoff-qualification-vuy6.md) were consumed. The 191 source tests, 63 CLI cases, 15 native follow-up cases and 74 Stop checks were **not rerun**. Their source/mechanical results do not establish missing model semantics. The owner-accepted plain-decline continuation failure remains historical failed evidence, separate from explicit Stop.

## Real route and isolation

Before inference, native `/api/model` discovery established `providerID:"openai"`, model/modelID `gpt-6.1-sol`, tool support and the `high` variant. Its package was `@opencode/ai/providers/openai`, with native ChatGPT/Codex base URL `https://chatgpt.com/backend-api/codex`. Actual outbound WebSocket `response.create` frames used that model and `reasoning.effort:"high"`; actual completed provider frames and native assistant results are retained. There was no OpenRouter, controlled provider, fallback model or supplied model answer. Returned native service tier was `default`; high describes reasoning, not service tier.

The operator's existing OpenAI OAuth entry alone was copied programmatically into mode-0600 scratch material, after reading the exact native credential/global-path/import contract. Supported native `POST /api/credential` imported it into the disposable database. Native refresh changed the scratch access and refresh tokens and advanced expiry before successful inference. No manual token exchange, login or operator migration occurred. `operator-auth-before.json`, `auth-provenance.json` and `operator-auth-after.json` record nonsecret evidence. **Operator auth bytes, inode, mode, size, mtime and ctime remained unchanged. Refreshed scratch credentials were discarded, never written back over operator auth.** This does not assert that an old operator refresh token remains usable after rotation.

The host used isolated HOME/XDG/cache/state, committed disposable `R/repo`, its own Beads store and only loopback port **56167**, owned process group **767999**. Harness-created tasks used explicit `--actor codex:oc-accept --sandbox`; their creator, disposable account owner and absent assignee were kept distinct. The model made no issue writes, claims or handoffs. Its actual fallback identity was `opencode:fallback:44e5ef89b5cd`, derived from native session `ses_ea007a134ffer7ErRF24VMZokT` and agent `fallback`.

An independent scratch observer recorded actual context, tool events, model selection and native transport frames without replacing requests, responses, compaction or tool results. Sanitized `native.jsonl`, `api.jsonl`, `cases.jsonl` and `bd.jsonl` preserve observations. The `bd` logging shim executed unchanged argv against the real CLI. Its only timing intervention held already-completed `prime --full` output until an owned marker was removed, before the normal runner timeout. It supplied no replacement prime text, CLI result or provider response. The unused create-output hold was never exercised.

## Observed case map

| Case | Actual result and limit |
| --- | --- |
| Ordinary installed command / design D fallback subset | **PASS.** Native `oc-beads:ready` forwarded the read-only request. With execute denied, the real model loaded the installed skill, read WORKFLOWS, checked current help and invoked direct shell. It reported two of four ready issues with incomplete coverage, no execution authority, separate creator/owner/assignee observations and its actual actor. No issue mutation, delegation or unrelated continuation occurred. |
| Settled native registries | **PASS.** Thirty distinct namespaced commands and the installed skill were effective. User command/skill overrides won. Unload left only the user-owned `oc-beads:ready` and user skill; product agents disappeared. Reactivation restored package entries once while preserving overrides. Removing only the harness-owned overrides restored package descriptions/path. Before/after command/skill/agent/plugin snapshots are `registry-*-settled.json`. |
| Pending-generation output after removal | **FAIL, selected acceptance.** The real prime process was held before unload. The package was absent from the settled plugin registry, product commands/agents were absent and its skill was replaced by the preserved user skill. Releasing the held output then produced a Beads context in the still-running request and an actual outgoing OpenAI request. The held process had remained alive until release. |
| Post-reactivation context | **PASS.** One eligible request received exactly one Beads envelope and one actual model response. This does not erase the preceding failure. |
| Seventeen installed links | **Filesystem PASS; native access partial.** All 17 explicit links resolve inside the unchanged native installation, with bytes/hashes in `installed-links.json`. Native skill loading and WORKFLOWS reading were observed, including one accepted `external_directory: ask` request. Native reading of every other resource, ask rejection and deny remain **unexecuted**. |
| Provider/native replay | **Limited observation.** Genuine same-provider/model requests and native reasoning/replay metadata were observed; encrypted payload fields are sanitized. No compaction, provider/model switch or replacement `native.messages` was manufactured. Their remaining semantic acceptance is unresolved. |

The decisive settled timeline is retained in `failure.json` and the raw traces:

| UTC epoch seconds | Observation |
| --- | --- |
| `1792611636.0914652` | Real `bd prime --full` completed; shim PID/group `769512` holds its unmodified output. |
| `1792611636.3046305` | Native registry shows only the user namespaced command; adjacent settled plugin/skill/agent snapshots confirm package removal. |
| `1792611636.338` | After the harness releases output, the in-flight context event contains one Beads envelope. |
| `1792611636.665` | Actual WebSocket `response.create`, OpenAI gpt-6.1-sol/high, includes that envelope. |

The selected guarantee fails at the outgoing request boundary, independently of the model's simple lifecycle reply. This is installed host/package lifetime evidence; precise upstream-versus-adapter causation was not established. A request continuing across native location reload is not reclassified as explicit Stop failure, and no upstream patch, new supervisor or compensating lifetime framework was attempted.

Registry snapshots and observer setup/dispose events are retained. The ordinary package's individual disposer invocation counts are not public native observations here; none was invented. In particular, registry removal is not treated as proof that the pending package process had already been aborted.

The remaining design **A–C** typed composition/projection/partial-failure cases, meaningful append versus selective reusable memory, exact assignment versus authorized continuation, actual-model failure discovery/partial child handoff, fresh/compacted recovery, typed/shell actor agreement, restricted leaf/neither-capability outcomes and uncertain-create readback are **unexecuted selected acceptance gates**. Earlier deterministic/mechanical passes do not complete them. `case-map.json` maps every attempted case and these gaps. Task 6.3's current-summary changes and final 19-requirement/corpus/CODE_MODE coverage reconciliation remain gated; none was marked complete.

## Measurements and harness corrections

`measurements.json` separates UTF-8 prime/guidance/catalog text bytes, compact-JSON direct tool schemas, returned result JSON and returned text. Per fallback request, prime was **5,714 bytes**, appended guidance **7,624**, code-mode catalog **0** and direct schemas **11,360**. Lifecycle requests had prime **5,714**, guidance **7,622**, stock host code-mode catalog **13,192–13,272** and direct schemas **12,483**. That stock catalog is not a qualified Beads typed catalog. Returned text bytes were skill **10,679**, WORKFLOWS read **3,965**, shell help **6,125**, and ready output **1,444**; full result JSON sizes are recorded separately. No transmission, token-saving or model-quality inference follows from these sizes.

Captured processes were **22 shim invocations plus 22 real CLI children**, including initialization, four harness task creations, version/context/prime probes and two model-selected shell commands. There was one additional direct real-CLI final readback, separately disclosed from shim counts. The runner's own `ps` helpers and process-wide startup internals were not instrumented; this is not a total-OS-process census. There were **eight actual model request frames**: four fallback steps and four lifecycle replies across initial and settled runs; **zero typed calls and zero native children**. These are measured counts, not quotas or a benchmark campaign.

Initial setup failures remain distinct from product findings. An absolute installed-directory reference had no native server entry point; the supported native `file:` archive path resolved the package without editing it. The initial scratch database contained no imported legacy credential row; the supported native credential-create route supplied only the existing scoped OpenAI credential. Early model/registry snapshots were taken before asynchronous settlement. The first lifecycle run similarly sampled premature empty registries, so its unsuffixed snapshots are **inconclusive**, not passing removal proof. The one bounded correction waited for observable effective registries at each stage; it confirmed the late-output failure. `run-fallback.log`, `run-lifecycle.log` and `run-lifecycle-settled.log` retain those runs. No inferred API output or silent successful retry was substituted.

## Offline verification, cleanup and handoff

Run without credentials, host, network or inference:

```sh
python3 /opt/data/cache/scratch/vuy9-installed-model/analyze.py
```

The analyzer asserts exact installed bytes/identity, actual provider/model/reasoning frames, read-only fallback, settled registries/overrides, **the observed failure**, single post-reactivation injection, link inventory, unresolved cases, unchanged markers and cleanup. Its passing evidence checks are not a passing acceptance verdict; `analysis.json` says `selectedAcceptance: FAILED / incomplete`.

`cleanup.json` and `final-native-state.json` establish empty active sessions, pending permissions and saved grants, removal of owned sessions, termination of the owned host group, no listener on 56167 and no live process among all 44 recorded shim/CLI PIDs. The scoped credential was removed through native API; its temporary file, native database/sidecars, private native logs and server secret were removed. Sanitized observations and the disposable Beads records remain. Operator OpenCode is still **2.0.29** with unchanged executable/config/package bytes; all **146 protected repository paths** remain unchanged. Only this new report changes repository content. README and the five permitted current-summary docs remain unchanged because 6.3 did not start. Fourteen accepted and two unchecked markers remain intact; `.9` stays `in_progress / codex:oc-accept`.

Existing strict named/all OpenSpec validation, planning validation, focused docs/link checks and whitespace verification are recorded in `validation.json`; the unchanged source full suite was not rerun. The focused docs check passed 14 tests/180 assertions. Its initial launch failed before running tests because the script's child shell lacked Bun on PATH; that log is retained separately from the corrected explicit-PATH run. Final scratch handoff is `R/result.md`.

**Smallest next gate:** parent independently runs the offline analyzer and reviews the failed outgoing-request timeline, then the owner decides the required lifecycle contract and any separately scoped investigation/correction. The late-output guarantee has not been waived. No continuation of qualification, source repair, task acceptance/closure, marker edit, commit, push, sync, archive, publication, release or operator activation is authorized by this handoff.
