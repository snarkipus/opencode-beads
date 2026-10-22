# Sync native context evaluation

Historical reference: this document preserves qualification of the original sync slice and its later UX polish. The accepted generalization and final implementation review are recorded in [workflow native context evaluation](workflow-native-context-evaluation.md); original sample/archive identities below remain unchanged.

This local uncommitted candidate implements only sync presentation/context from
baseline `76549cff2558404f8b855b8708d13ac81c52f138`. Implementation Bead:
`opencode-beads-9ux`, executor `codex:oc-sync-sol`. Source and bounded corrected-runtime
checks are parent-accepted. This is not the published beta.3 archive.

## Current owner-authorized presentation follow-up

After the owner demonstrated a completed explanation-only canary turn on Zeus,
the owner approved removing the implementation-facing `Literal user details:`
heading from new sync history. Single-line free text now follows the command on
the same line; multiline text follows on a new line, preserving the exact input,
including whitespace and line endings. This is presentation only: no help-keyword
parser, instruction-snapshot change, hook change or non-sync migration.

The parent implemented this narrow follow-up directly. The regression first failed
on `/oc-beads:sync explain`, then passed after the one-line product correction.
Fresh gates: 210 tests / 3036 assertions, typecheck, scoped strict specification
validation and exact-archive installed package smoke passed. The 29 other command
baseline digests and static sync instruction digest remain unchanged. Actual local
provider serialization remains 2738 → 2784 characters for the bare-sync fixture;
the three-sync fixture is now 7858 → 7944, rather than the original 7996, because
two generated free-text headings were removed. These are character observations,
not token-cost measurements.

New local archive: `opencode-beads-sync-canary-a3945401.tgz`, SHA256
`a3945401eecee09a9370d308e502eddae3aeed5a909d50e7b34281b6c5701098`.
Evidence is in the implementation scratch directory's `ux-followup/`; the initial
RED observation is `ux-followup-red.log`. No new genuine model run or Zeus
installation was performed for this small follow-up. The original archive and
independent review/runtime packets below are retained unchanged and apply to their
original bytes, not this revised artifact. No commit, push, release or shared
service change is implied.

## Original reviewed candidate: parent-verified status

The parent accepted the source and deterministic checks after direct diff review
and independent reruns: 210 tests, typecheck, the exact sampled archive package
smoke, strict scoped/global specs, baseline fixture comparison and protected hashes.
All five source/runtime task markers are parent-reconciled. The original interrupted sample remains historical and
incomplete. The owner separately approved one harness-only correction and one
additional sample: the parent independently verified its non-interrupted final
report and observed compact native TUI entry, actual provider context and sync
result, convergence, unchanged sentinels, custody and operator fingerprints.
Product/source acceptance is unchanged; no release or task closure is implied.
No automatic retry occurred.

Accepted inherited evidence is the beta.3 bounded action/explanation, denial,
missing-input and guide campaign described in
[command action evaluation](command-action-evaluation.md), including its corrected
R1–R5 result and user-confirmed ordinary sync behavior. Those cases are not rerun.
The accepted sync-only design and READY review establish the intended approach;
they do not themselves prove runtime behavior.

New deterministic checks capture meaningful prompt RED/GREEN and registered-hook
RED/GREEN, literal/native input preservation, request-copy immutability and
idempotence, serialized native replay, compact summary recent-context, unload,
location-return ordering and unchanged 29-command baseline digests. Actual
`@opencode/ai` 2.1.1 Responses serialization is captured through a local endpoint;
its fixture responses are not model inference or semantic action evidence.

| Provider fixture | beta.3 serialized characters | Candidate serialized characters |
| --- | ---: | ---: |
| One sync plus interleaved assistant | 2738 | 2784 |
| Three syncs, interleaved assistant, native replay | 7858 | 7996 |

The +46 characters per sync are exactly the visible invocation and additional
text-part framing. Static instructions match the baseline digest; each tagged
message contributes one snapshot, the routing metadata never serializes, the
current turn retains its instructions and unchanged consecutive expansions are
byte-stable. Unhooked title/generate serialization stays compact without action
snapshots; existing hook registration remains exactly primary context/compaction.
Character counts are payload-size observations, not token usage or billing.
The compaction cue adds 113 text characters (including its newline) separately for semantic continuity.
Native storage can contain another snapshot copy after compaction, while native
estimation from visible text can undercount it. No cache or price savings are
claimed, and actual summary quality is not inferred from a guidance assertion.

## Original prescribed sample: historical incomplete acceptance

The one genuine sample used pinned OpenCode 2.1.2, binary SHA-256
`22636c800ba6c8dc5353e264183bb3927725d824cba412f007dea9c694740f52`,
Beads 1.3.1 and local unpublished beta.3-version candidate archive SHA-256
`2031a1afc6f27dfd3530deead2be215cfaa7f0429cb0668a6de84d6c8a47b109`.
The native host installed every archive file unchanged through the public
entrypoint and registered 30 commands and 17 resource links. It used genuine
`openai/gpt-6.1-sol/high` at `https://chatgpt.com/backend-api/codex`.
Session: `ses_e9c4752aeffeO5prp4cLaxHVnb`; executor:
`opencode:sync_eval:690d5b278e4a`.

The ordinary command endpoint admitted one bare queued sync. Native prompt
observation and persisted user-message readback contain exactly `/oc-beads:sync`
with version-1 metadata. The first actual outbound provider frame contains the
exact snapshot once and the host-rendered actual actor/capability guidance,
without the routing marker or serialized second copy. Later frames use native
`previous_response_id` continuation and incremental tool outputs rather than
resending history; their zero snapshot occurrences are not missing context.
All four observed requests were primary requests; no auxiliary expansion or
extra plugin model call was introduced. Deterministic tests above separately
check full serialization and replay, not provider cache behavior.

The model selected and received a real native permission approval for:

```sh
bd sync --no-adopt --actor='opencode:sync_eval:690d5b278e4a' --sandbox --json
```

It ran exactly once in the owned `sample/repo` directory and returned exit 0,
`status: ok`, pulled/pushed true, one attempt and zero corrected rows. Independent
local and peer readback contained all three seeded IDs (`sctx-9nn`, `sctx-ter`,
`sctx-uae`). The peer pull was harness readback, not product repair. The unrelated
issue, file sentinel and configured remotes remained unchanged.

**This original sample did not complete runtime acceptance.** After successful sync the model asked
for read-only `git status --short`. The reused narrow permission responder
rejected this command, which interrupted the native step before a final model
report. This is a harness-caused interruption, not demonstrated product failure.
The original runner's `passed: true` checks only CLI/convergence/sentinels; it
does not establish complete acceptance. The authoritative evidence review
records the missing final report. At that original handoff, no second sample,
continuation inference or permission-policy repair had been performed.

A real owned TUI was connected to that same completed/interrupted session without
submitting a prompt. Its retained ANSI capture, decoded terminal screen and native
API readback show the sync output and interruption. The compact invocation was
above the captured viewport, so **that original capture did not verify the
visible compact UI**; persisted compact text was verified. Neither fixture rendering nor
an inferred screenshot is substituted for this missing observation.

| Genuine primary request | Provider input tokens (including cached) | Cached input tokens | Output tokens |
| --- | ---: | ---: | ---: |
| 1 | 9281 | 0 | 19 |
| 2 | 12462 | 9088 | 172 |
| 3 | 21612 | 12288 | 73 |
| 4 | 21743 | 21504 | 20 |
| Observed interrupted-sample total | 65098 | 42880 | 284 |

These are provider-reported observations for this single interrupted sample,
not an A/B comparison or subscription/billing proof. Character estimates above
are separate. Current native access was read through a read-only connection and
imported into owned disposable state with no refresh capability. No login,
refresh, operator database copy, billing fallback or operator mutation occurred.
Operator credential/file fingerprints matched before and after. Owned host/TUI
processes and listener exited; disposable credential-capable data/state were
removed, while sanitized raw evidence and disposable repositories were retained.

## Owner-approved corrected sample

The owner then approved exactly one corrected disposable sample in the same
Sol/high implementation session, limited to the harness and this evidence doc.
Current source custody is the parent's 16-path
`parent-source-reviewed-manifest.json` (SHA-256
`3fce62c87ed6f26e7e5012382f93b2ea0e50b21d38485426106750fcd76b3bf5`),
with only this evaluation document subsequently permitted to change. All 164
other protected paths and all 31 members of the original candidate archive
matched before and after the corrected run. No product prompt, runtime, test,
baseline fixture, dependency, README, changelog, spec or task marker changed.
The original `sample/` packet's 234 files and historical `final-candidate.json`
remained byte-identical, including the original narrow `passed: true` result.

New evidence lives exclusively in
`/opt/data/cache/scratch/oc-beads-sync-context-implementation/evaluation-corrected/`.
The copied permission fixture added only:

```python
if argv == ['git', 'status', '--short']:
    return case == 'R1'
```

This check follows existing shell-syntax rejection and tokenization. The new
RED test failed against the unchanged copy; GREEN passed six tests, including
existing token-aware `--no-adopt` acceptance and denials for other Git commands,
extra status options, destructive/unrelated operations and shell chaining.
Native product permissions were unchanged. The runner also requires the latest
completed assistant to have `finish: stop`, nonempty final text and no error,
plus observed compact native UI, alongside CLI/convergence/sentinel checks.
Three deterministic harness tests verify that CLI-only or interrupted results
and missing UI cannot pass. The narrow fixture diff and runner diff are retained.

The corrected run reused the exact archive SHA-256
`2031a1afc6f27dfd3530deead2be215cfaa7f0429cb0668a6de84d6c8a47b109`
and the same pinned 2.1.2 host binary above. Its native installed public entrypoint,
all archive files, 30 commands and 17 resource links were verified again. Fresh
isolated HOME/XDG/store/local-file remote and two divergent replicas held base
sentinel `sctx-3gh`, local-only seed `sctx-71r` and remote-only seed `sctx-ajz`.
These setup writes and peer readback were separately attributed harness work,
not product initialization or repair. The model route was genuine native
`openai/gpt-6.1-sol/high` at `https://chatgpt.com/backend-api/codex`.
Session: `ses_e9c3431c3ffeZoDiGaIEL2RB7C`; actual executor:
`opencode:sync_eval:b14ef2bcbb4a`.

One ordinary bare queued command produced one native prompt admission. Persisted
user text is exactly `/oc-beads:sync`, with version-1 instruction metadata. The
first actual provider-bound frame contains the exact static snapshot once plus
actual executor context, and no routing marker or duplicate snapshot. Later
frames use native `previous_response_id` incremental continuation. Five primary
requests were observed, with no auxiliary request or added plugin model call.
The actual selected direct-shell operation received native approval once:

```sh
bd sync --no-adopt --actor='opencode:sync_eval:b14ef2bcbb4a' --sandbox --json
```

It executed exactly once in the owned `evaluation-corrected/repo` directory,
returning exit 0, `status: ok`, one attempt, pulled/pushed true and zero corrected
rows. The model subsequently requested the exact observed read-only
`git status --short`, received one approval under the corrected fixture, and
completed that read. Both replica readbacks then contained all three seeds;
the unrelated issue, sentinel file, staged/untracked files and remote
configuration were unchanged. No manual product repair occurred.

The owned native TUI started before command admission and was read continuously.
Its real user-message viewport displayed `/oc-beads:sync` with no generated
action/authority body. `native-ui.ansi` retains the raw sanitized terminal stream;
`native-ui-compact.txt` records the decoded 160×60 viewport and
`native-ui-compact.png` faithfully renders those captured terminal cells.
This is an image of the actual ANSI-derived native viewport, not an invented
mock screenshot or a persisted-text substitute. The end-state viewport/image
also shows the successful sync, permitted Git read and final model report.
No navigation was needed, and the TUI capture submitted no text or model prompt.

The latest assistant completed with `finish: stop` and no error. Its report
matches the observed CLI and sentinel evidence:

> Dolt-remote synchronization succeeded using `--no-adopt`, the actual executor actor, and `--sandbox`.
>
> - Pulled and pushed in one attempt.
> - No blocked-state corrections needed.
> - No adoption or manual repair performed.
> - Existing staged/untracked files left untouched.

| Corrected primary request | Provider input tokens (including cached) | Cached input tokens | Output tokens |
| --- | ---: | ---: | ---: |
| 1 | 9300 | 0 | 19 |
| 2 | 12525 | 0 | 176 |
| 3 | 21683 | 12544 | 66 |
| 4 | 21807 | 9216 | 37 |
| 5 | 21900 | 21760 | 60 |
| Observed corrected-sample total | 87215 | 43520 | 358 |

These provider-reported figures describe this one corrected sample only. They
are separate from deterministic payload character counts and are not an A/B
comparison, savings claim or subscription/billing measurement. The corrected
sample resolves the two prior observations without relabeling the interrupted
sample as successful.

Current native access alone was used, imported into disposable state with an
empty refresh capability. No refresh, login, whole operator database copy,
billing fallback or operator state/config/install/service change occurred.
Before/after operator credential and file fingerprints matched. Owned TUI and
private host exited, the listener closed, no process remained under the corrected
scratch cwd, and disposable credential-capable data/state were removed. Raw
sanitized evidence, exact archive reference and disposable replicas were retained.
No additional sample or continuation inference was attempted. Product/source
hashes still match the accepted candidate; only this evidence document changed.
Parent verified this corrected runtime sample and reconciled task 3.1; closure
and any further dispatch/publication remain separate.

The corrected packet's `semantic-evidence-review.json` binds native/model/actor,
provider context, UI, permission, argv/cwd/result, final report, convergence,
usage and custody checks. `permission-fixture.diff`, `permission-red.log`,
`permission-green.log`, `runner-correction.diff`, `qualification-checks.log`,
`R1-provider-wire-inputs.json`, `R1-provider-usage.json`,
`R1-persisted-user-message.json`, `R1-final-report-check.json`, native traces,
operator snapshots and UI artifacts retain the detailed evidence.

## Local verification and handoff

Prompt and registered-hook RED/GREEN logs, actual serializer captures and the
original and corrected runtime packets are retained under
`/opt/data/cache/scratch/oc-beads-sync-context-implementation/`.
`sample/semantic-evidence-review.json` distinguishes verified action/context
checks from incomplete final-report/UI acceptance;
`sample/semantic-result.json` is the narrower original mechanical runner result.
`sample/R1-provider-wire-inputs.json`, `R1-provider-usage.json`,
`R1-persisted-user-message.json`, native events, permissions, argv/cwd/CLI captures,
replica readbacks and `native-ui-screen.txt` retain the underlying observations.

The direct simplification review found the source limited to one sync branch,
one pure helper, two existing-hook calls and the selected sentence. There is no
new registration, dispatcher, state queue, CLI wrapper in product code or change
to authority/tool boundaries. Final source/package/spec/protected checks are
recorded in the implementation Bead. Final typecheck passed; `bun test` passed
210 tests with 0 failures (2964 assertions); installed package smoke passed using
the exact sampled archive/checksum. Named strict validation passed and global
strict validation passed all four items. Whitespace passed, all 164 protected
paths matched baseline, and the generated comparison preserved all 29 other
command payloads/descriptions. No bd contract campaign was run for this
presentation/context-only change. All five task markers are parent-reconciled;
the bounded runtime sample is accepted, and canonical specs and
archives are unchanged. Full source gates were not repeated during this
qualification-only correction: product and accepted source hashes stayed fixed.
The corrected sample supplies the previously missing runtime observations,
verified independently by the parent. The candidate remains local and uncommitted;
closure, canonical archival and any publication remain separate.
