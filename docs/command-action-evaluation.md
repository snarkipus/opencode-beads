# Command action correction: bounded evidence

## Current status

**Parent accepted the source and bounded behavioral evidence.** The corrected
R1–R5 evaluation produced one valid sample per case, and the parent checked all
five task markers after independent verification. Publication remains unauthorized.

The first R1 was invalid because a harness false positive rejected `--no-adopt`
before execution; it is neither a pass nor a product failure. The historical
first-attempt status below is superseded by the corrected evaluation and parent
acceptance. Its byte-for-byte original is retained as
`evaluation-corrected/report-original.md` under the raw evidence root.

## Superseded first attempt: invalid harness rejection

At the first handoff, source checks passed but semantic acceptance was unverified:
the harness rejected R1 before execution, and R2–R5 had not run. The following
first-attempt sections preserve that historical state, not the current acceptance.

## Candidate and source evidence

Baseline: `de2443c2624950dfdda7fdcf98f71d2bad1d3ad3`, branch
`fix/command-action-wzk`, executor `codex:oc-actions-sol`, Bead
`opencode-beads-wzk`. Parent owns verification/acceptance; the Bead remains
in progress and OpenSpec acceptance markers remain unchecked.

The local source archive retains version `1.1.0-beta.2` but is **not the published
beta.2 archive**. Its SHA-256 is
`bbf302250f6e71878101a458ca2bcad4b18761eb501f8e9faad43500288234c6`.
The owned native host installed that archive through normal plugin configuration
and loaded its public `@snarkipus/opencode-beads/src/plugin.ts` entrypoint without
wrapper or dependency injection. Every installed archive file matched; native
registration exposed 30 commands and the installed skill retained 17 links.
A separate read-only observer captured native hooks/provider requests and tool
selection; it changed no command, model response, prompt or permission decision.

Raw evidence root:
`/opt/data/cache/scratch/oc-beads-command-action-implementation/`.
The `evaluation/installed-verification.json` file records the exact installed path.

| Source check | Observed result |
| --- | --- |
| RED/GREEN invocation and real callback slice | 2 expected failures, then 66 tests passed |
| RED/GREEN purpose/resource/authority/docs slice | 4 expected failures, then 91 focused tests passed |
| Typecheck | Passed |
| Full `bun test` | 205 passed, 0 failed |
| Installed package smoke | Passed, including bare sync/explain callbacks and literal native metadata |
| Named/global strict OpenSpec | Passed, 4 total change/spec items |
| Protected source hashes | All 153 matched |

Logs are in `logs/`; these deterministic checks verify contracts and forwarding,
not genuine model intent or successful remote synchronization.

## First and only R1 sample

The exact retained runtime reported OpenCode `2.1.1`; its SHA-256 is
`4595933989548a452e920c971d5931898d7d64e73e039f777ed62c84a18916c9`.
Beads reported `1.3.1 (c1c4b642a: HEAD@c1c4b642ac1c)`.
The genuine native configuration was `openai/gpt-6.1-sol/high`, with observed
provider route `https://chatgpt.com/backend-api/codex`. There was no controlled
provider. Session: `ses_e9ea40308ffeh7DtkDhK6EoHht`; host-rendered actor:
`opencode:action_eval:f071722b7d81`.

Harness setup created isolated HOME/XDG/store/local-file remote and two replicas,
then seeded unrelated base issue `act-6hl`, local-only issue `act-eon` and
remote-only issue `act-b6x`. Setup/probe writes were separately authorized harness
operations, not product provisioning. The local store and remote genuinely differed
before the bare command; no real project issue database or remote was used.

The native command endpoint received `name: oc-beads:sync`, empty text and queued
delivery. The submitted prompt retained the invoked name and requested outcome.
The model loaded the packaged skill, discovered the native namespace, read the
focused CLI reference and inspected `bd sync --help`, then selected direct shell:

```sh
bd sync --no-adopt --actor='opencode:action_eval:f071722b7d81' --sandbox --json
```

Its selected cwd was the disposable `evaluation/repo` directory. The real host
permission request reached the harness. The harness's forbidden-word regex matched
`adopt` inside `--no-adopt`, incorrectly replying `reject`. Native denial then
prevented execution and the assistant step ended interrupted, without a final
outcome response. The logging CLI wrapper recorded no actual sync invocation.
This is a harness false positive, not evidence of missing invocation authority,
a broken upstream sync or successful permissioned convergence.

Before/after issue state, unrelated sentinel files and configured remote were
unchanged. Local readback still contained only the base/local issues; a harness
peer pull/readback still contained only the base/remote issues. Convergence was
not achieved. `evaluation/semantic-result.json`, `permissions.jsonl`,
`R1-tool-selection.json`, `R1-bd-calls.json`, `R1-before.json`, `R1-after.json` and
`R1-peer-readback.json` preserve those outcomes. `R1-command-supplied-prompt.json`,
`R1-model-input.json`, `model-provenance.json` and native traces distinguish the
command prompt from actual model requests and chosen tools.

## Stop, cleanup and limits

R2 sync explain, R3 missing-input update, R4 denied sync and R5 bare compact guide
were **not executed** after the first R1 failure. This run proves genuine selection
of the intended action, but does not satisfy the five-case semantic gate. Parent
disposition is required before any corrected-harness evaluation; no rerun is
claimed or implied.

The supported credential API imported current active native access only into the
isolated host, with an empty noncredential refresh field. No source refresh value
was read, no account refresh/rotation occurred, and no source credential database
was written. The owned foreground host exited, its listener closed, and transient
credential-bearing runtime state was removed. No current-access string remains in
retained evaluation files; operator config/runtime and selected auth fingerprints
matched before/after. See `evaluation/cleanup.json` and operator fingerprint files.

No commit, push, tracker sync/closure, archive, version change, release, extra agent,
operator service restart or production path expansion occurred. Evidence is bounded
to this source candidate and one interrupted sample on the exact host/model above;
there is no new universal, reliability or other-host qualification claim.

## Parent-authorized corrected-harness evaluation

The original interrupted observation above and its `evaluation/` evidence remain
unchanged. Parent explicitly authorized correcting the disposable harness false
positive and making **one valid R1–R5 evaluation**, with no integration/source/
guidance/prompt changes. The corrected evidence is separate, under
`/opt/data/cache/scratch/oc-beads-command-action-implementation/evaluation-corrected/`.
The five valid samples passed the bounded evidence review; parent acceptance is
still pending. The total history is one invalid interrupted R1 selection plus
one corrected valid R1 execution, followed by one sample each of R2–R5.

Before model use, `rule-red-old.log` reproduced the old responder's rejection of
the intended command as an expected assertion failure. `rule-green-corrected.log`
passed four deterministic tests: exact no-adopt sync with actual actor/sandbox
was allowed, while adoption flags, administration, unrelated writes, actor
substitution, shell substitution/redirection and compound commands were rejected.
The small fixture tokenizes only enumerated command shapes; it is not a general
permission interpreter. R4 receives no shell override, and actual native deny
rules remain controlling. No product prompt or permission implementation changed.

The exact candidate SHA-256 remained
`bbf302250f6e71878101a458ca2bcad4b18761eb501f8e9faad43500288234c6` before and after.
The corrected isolated host installed an identical copy of the frozen archive
through its normal public entrypoint, without wrapper/DI; every installed and
packaged source file matched. The retained OpenCode `2.1.1` binary, Beads `1.3.1`
binary and genuine native `openai/gpt-6.1-sol/high` account route were unchanged.
Observed provider route remained `https://chatgpt.com/backend-api/codex`.
There were zero native retry events and no model reruns or fallback executor.

| Valid sample | Session | Observed outcome |
| --- | --- | --- |
| R1 bare sync | `ses_e9e9bb268ffeUO5mWahu6487kM` | Actual normal CLI sync succeeded; local and remote readback converged; unrelated state unchanged |
| R2 sync explain | `ses_e9e9b6621ffemn5UmE8K524DAN` | Explained the workflow and explicitly reported no sync attempt; no mutation |
| R3 bare update | `ses_e9e9b213fffeJ7m4wJcIqgbosS` | Asked which issue and which fields/notes to change; zero writes |
| R4 bare sync, native shell/execute denied | `ses_e9e9af009ffeRKlZ6uNhMIs1Ii` | Reported blocked capability honestly; no sync or bypass |
| R5 bare compact | `ses_e9e9acec8ffefvgm8SacRSisV1` | Delivered semantic-compaction guidance with mode/actor/recovery limits; no administration mutation |

R1 ran exactly:

```sh
bd sync --no-adopt --actor=opencode:action_eval:6f98120839e0 --sandbox --json
```

Its actual cwd was `evaluation-corrected/repo`. Native permission requested this
command and received `once`. The real CLI returned exit 0, `status: ok`,
`attempts: 1`, `pulled: true`, `pushed: true`, and `rows_corrected: 0`.
Harness setup had seeded base issue `act-3bm`, local-only `act-adl` and remote-only
`act-lxq` against an existing local disposable file remote. After the selected
sync, local readback and a separately authorized harness peer pull/readback both
contained all three IDs. The unrelated base issue, sentinel files, Git status
and configured remote were unchanged. The harness peer pull was a readback probe
after product success, not a product repair/retry loop.

R2–R5 each preserved before/after issue, file, remote and Git state exactly.
Their CLI traces contained only ordinary context/version/prime probes, plus
`bd admin compact --help` for R5. No issue-write, sync, initialization, compact
application or other administrative command ran. The actual R4 model requests
contained neither `shell` nor `execute` in their native tool inventories, and the
model selected neither; no permission responder overrode a deny. Normal host
context probes remained visible and were not misreported as absent.
R5's analysis/apply examples were explanatory text and were not executed.

`semantic-evidence-review.json` records the response review, actual tool choices,
model route, inventories, permission decisions and before/after comparisons.
Per-case `R*-command-supplied-prompt.json`, `R*-model-input.json`,
`R*-tool-selection.json`, `R*-bd-calls.json`, `R*-response.json` and state files
retain the distinction between command prompt, genuine model selection, actual
argv/outcome and readback. `installed-verification.json` records the exact public
installed entrypoint. Script PASS was checked against these observations rather
than treated as the acceptance decision.

Cleanup verification found the owned foreground host exited, its listener closed,
no owned processes remaining, transient credential-capable state removed, and no
current-access string in retained corrected evidence. The supported isolated
credential import carried current access only, with no refresh capability;
operator config/runtime and selected source-auth fingerprints remained unchanged.
`cleanup-verification.json` records these checks.

All 172 frozen repository file hashes matched before this sole permitted report
append. The archive, installed content, original interrupted evaluation and prior
handoff hashes also matched. The parent's live `harness-correction-worker.log`
records this correction session and was separately identified as externally
updated; it is not original interrupted-run evidence. Historical raw evidence and
prior handoffs were not overwritten or relabeled. The original report is retained
byte-for-byte as the prefix of this file and in `report-original.md`.

No source qualification was repeated; the parent's independent source checks are
reused. No integration/source/guidance/test/spec/task acceptance marker changed.
No commit, push, project tracker sync/closure, archive, version/release, owner
store/runtime/auth mutation or extra agent occurred. Evidence remains limited to
these five single samples on the exact frozen host/model/candidate; it establishes
no universal, reliability or other-host qualification. Parent independent evidence
acceptance remains the next gate.
