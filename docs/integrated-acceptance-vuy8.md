# Task 6.1 qualification candidate — 2026-10-21

**Final parent verification: task 6.1 accepted locally.** Both response-handling
corrections, the deterministic/package checks and the installed-Beads CLI contract
pass. The candidate and acceptance marker remain uncommitted/unpublished; `.8`
stays open for publication/closeout. Live OpenCode qualification is unexecuted.
Earlier incomplete results below are retained as historical phases, not the
current verdict.

**Hold-retirement disposition (historical phase):** Matt confirmed the Docker Lab-only ancestor hold
was obsolete after the completed Beads 1.3.1 migration and authorized retiring it
and its guidance. Parent removed the exact `/opt/data/cache/MIGRATION-FREEZE`
marker and verified its absence; no command-scoped bypass or replacement marker
was introduced. No separate matching active AGENTS.md/SKILL.md guidance was found.
The freeze failures recorded below are historical evidence, not a current hold.
Removal custody is `/opt/data/cache/scratch/vuy8-retired-freeze-removal.json`.
The guard-classification mismatch remains unresolved, append/memory checks have
not been rerun, and 6.1 remains unchecked. This cleanup does not authorize a guard
source edit, another worker, live host/model work, publication or activation.

## Identity and consumed evidence

- Executor `codex:oc-integration`; full Codex session
  `01a15c16-2bc1-7841-8289-0cf74b40090b` (environment-provided). Requested route:
  `gpt-6.1-sol`, reasoning `high`; no independent model-route attestation made.
- Candidate baseline HEAD `c7d2129584365764b2ea65d50007244cebeb1f6a`, branch
  `openspec/improve-beads-workflow-parity`, plus the parent-owned protected local
  planning refinements and this worker's two paths below.
- `.8` atomically claimed with
  `BEADS_ACTOR=codex:oc-integration bd --sandbox update opencode-beads-vuy.8 --claim --json`.
  Readback: `status=in_progress`, `assignee=codex:oc-integration`,
  `created_by=unknown`, account/record `owner` absent. Heartbeat's `owner` is the
  lease holder, not a stored account-owner observation.
- Consumed `.6`'s explicit `deterministic_contribution_accepted=true` at
  `a5d6b2bea779259ba9aa3175ab86fb2f4f2b862b`, evidence
  [native assessment](opencode-native-parity-assessment.md),
  [Opus READY review](reviews/opus-flow-source-review-vuy6.md), and parent-verified
  160-test/typecheck/package results. Its nested historical `not_started` field
  does not replace that acceptance. No `.6` write or repeated independent review.
  Source/assets, host/flow/guidance/continuity fixtures, package declarations,
  lockfile and package script compare unchanged against that revision (exit 0;
  `/opt/data/cache/scratch/vuy8-consumed-source-diff.log`). The additional current
  tests include the separately accepted `.7` upstream comparison work.
- Actual CLI: `/usr/local/bin/bd`,
  `bd version 1.3.1 (c1c4b642a: HEAD@c1c4b642ac1c)`;
  executable SHA-256 `a8f48d771b9e11eccfced4aed72923b59eda746f7a9b425e7ca1af7a51251653`.
  Full source pin `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c` from the cached
  release tree; downloaded `memory.go`/`admin.go` at that commit match the cache.
- Bun **1.3.14**, existing cached baseline binary. OpenCode **2.1.1**, source
  `ba546ec1598a70db2570e9c6258028d955ba8f58`, is only the source/type target;
  admission `>=2.1.1 <2.2`. No OpenCode command was run.

## Commands and actual results

All logs below are in `/opt/data/cache/scratch/`. The successful Bun route and
both real-contract attempts used this command-scoped environment:

```sh
TMPDIR=/opt/data/cache/scratch BEADS_ACTOR=codex:oc-integration \
PATH=/opt/data/.npm/_npx/60c3515df86f25b1/node_modules/@oven/bun-linux-x64-baseline/bin:$PATH \
bun <arguments below>
```

| Arguments / command | Exit | Result / log |
| --- | --- | --- |
| `bun run test:bd-contract` via the requested npm wrapper, before edits | 1 | Did not reach checks: cached wrapper says Bun postinstall was not run; `vuy8-contract-baseline.log` |
| `run test:bd-contract`, original script, cached baseline Bun | 1 | 7 failed checks; `vuy8-contract-baseline-cached-bun.log` |
| `run test:bd-contract`, diagnostic candidate | 1 | 7 failed checks including dependent assertions; `vuy8-contract-diagnostic.log` |
| `test` | 0 | **166 pass, 0 fail**, 1,245 assertions, 12 files; `vuy8-tests.log` |
| `run typecheck` | 0 | `tsc --noEmit`; `vuy8-typecheck.log` |
| `run test:package` | 0 | Packed consumer/import/callback/resource checks; `vuy8-package.log` |
| `openspec validate improve-beads-workflow-parity --strict --no-interactive` | 0 | `vuy8-openspec-change.log` |
| `openspec validate --all --strict --no-interactive` | 0 | 1 passed, 0 failed; `vuy8-openspec-all.log` |
| `python3 docs/validate-parity-planning.py /opt/data/cache/scratch/parity-sources` | 0 | All seven validation groups pass; `vuy8-planning.log` |
| `git diff --check` | 0 | `vuy8-diff-check.log` |

The first command was exactly
`TMPDIR=/opt/data/cache/scratch BEADS_ACTOR=codex:oc-integration npm exec --yes --package=bun@1.3.14 -- bun run test:bd-contract`.
The cached optimized x64 binary also raised SIGILL on `--version`; the existing
baseline binary returned `1.3.14` and ran the checks. No runtime install,
postinstall repair or upgrade was performed.

Package identity: `@snarkipus/opencode-beads@1.0.2`, archive
`snarkipus-opencode-beads-1.0.2.tgz`, SHA-256
`51f0d2ab294e1b23f90bec424ba479fa2162cef621b47e161743eb4d652d8cb1`.
The existing package script deleted its temporary archive/consumer after checking
both exports, all 30 commands, 16 resource links and owned fixture disposal.
This is fixture/package evidence, not installed-host activation.

## Failures, correction and stop boundary

1. In the script's disposable repository with no workspace,
   `bd --sandbox --actor codex:oc-integration context --json` exits **1** with
   `{"error":"cannot resolve repo context: no .beads directory found","schema_version":1}`.
   The production guard returns `probe-failed`; the existing contract requires
   `uninitialized`. That assertion remains failing. Resolving this distinction
   needs parent disposition and potentially production-source authority; no guard
   edit, fallback probe or weaker passing assertion was introduced.
2. Disposable `create` and `migrate schema` exit **14** because
   `/opt/data/cache/MIGRATION-FREEZE` says:
   “Docker Lab-only migration: all other workspaces/stores remain held; do not
   migrate or remove without separate approval. docker-lab-3dpc.3”.
   The hold is intact. No `BD_MIGRATION_FREEZE_FILE` override, removal, force or
   repair was attempted. Fresh disposable init/setup/prime checks did execute;
   issue creation, claim/close and schema-refresh outcomes remain unqualified.
3. One stale script assertion called `minimizeBeadsInstructions` without supplied
   context and expected deletion by marker alone. The accepted implementation
   intentionally retains unique policy. The candidate now checks exact retention
   without context and actual replacement with the complete duplicate body
   supplied. Both checks pass; this preserves and strengthens the real checks.

Stopped affected qualification after confirming the guard mismatch and the hold.
No append-retention or memory mutation extension was qualified, and none is
reported as passing. Pinned 1.3.1 source inspection shows remember JSON exposes
`key`, `value`, `action`, without `committed`, `commit_error` or
`commit_indeterminate`; recall renders `found` as `value != ""` and exits 1 for
an empty value. A real found-empty distinction and failed/indeterminate commit
fields were therefore **not observed** on this release. Existing adapter fixtures
cover those shapes separately; no empty store injection, synthetic live result,
unsupported flag or demand for marketplace-main outcomes was added.

Current help advertises `admin cleanup`, `admin compact`, `admin reset`;
top-level `compact` squashes Dolt history and directs semantic issue compaction
to `admin compact`. Existing packaged guidance asks for current help and explicit
administrative authority. Only help/source were inspected, with no administrative
mutation or backend expansion. CLI routing/database/consistency remain upstream
responsibilities; this qualification introduces no product confinement promise.

## Candidate custody and remaining acceptance

Worker changes only:

- `scripts/bd-contract.ts`: explicit command actor and `--sandbox` for test CLI
  calls; actual stdout/stderr failure diagnostics and observed guard kind; correct
  supplied-context minimization checks. Existing disposable HOME/root re-exec and
  cleanup remain in use. Successful test setup writes use disposable fixture Git
  identity, never the human Git identity.
- `docs/integrated-acceptance-vuy8.md`: this evidence and stop report.

Five protected paths were checked against the supplied SHA-256 manifest before
and after work; all match. Exact readback is
`/opt/data/cache/scratch/vuy8-protected-final.json`. The separately observed
untracked `.claude/settings.local.json` was untouched. No production source,
dependencies, versions, OpenSpec markers or prior review reports changed.

The worker left `.8` in progress under `codex:oc-integration` for parent review.
Parent subsequently classified it blocked on the two items below, preserving
worker assignment and history. **6.1 is unchecked and incomplete.** Live **1.1,
4.2 and 6.2 remain UNEXECUTED**, including permission correction/decline and the
installed unload/reactivate case. Model behavior, external-directory approvals,
real child delivery and host lifecycle were not evaluated. No installation or
activation, extra agent, staging/commit/push, publication, Dolt remote sync or
closure occurred. Parent owns acceptance and any separately scoped next step.

## Parent review — incomplete acceptance

Snarkimedes inspected the complete script diff, the failed CLI-contract log,
the actual freeze marker and production guard source, and verified all five
protected planning/report hashes. The script changes are limited to test actor
attribution/sandboxing, diagnostics and the supplied-context assertion correction;
no production-source change or freeze bypass was made.

Parent independently ran the existing cached baseline Bun 1.3.14 with its
containing directory on PATH: **166 tests pass, 0 fail**, typecheck passes, and
package smoke passes. Logs are `vuy8-parent-tests.log`,
`vuy8-parent-package.log` under the scratch directory; typecheck returned exit 0
in the parent tool output. An earlier direct-binary test invocation without Bun
on PATH failed a subprocess lookup; that distinct invocation is preserved in
`vuy8-parent-tests-direct-binary.log`, not represented as a product defect or a
passing run. The worker's requested model/reasoning route was independently
verified in the parent-captured Codex startup banner as gpt-6.1-sol/high.

A parent-created disposable Git repository with an isolated HOME and no
BEADS_DIR reproduced the exit-1 no-workspace JSON response exactly; the observed
result is retained in `vuy8-parent-context.json`. The guard catches this supported
CLI absence response as `probe-failed`, so the uninitialized-workspace contract
fails. This is our classification mismatch, not broken upstream behavior to
repair. Initial parent probes without a Git boundary instead discovered ancestor
workspace configuration and were not used as this reproduction evidence.

The ancestor `/opt/data/cache/MIGRATION-FREEZE` explicitly holds other workspaces
and still blocks disposable create/migrate writes. Parent did not rerun the
already-demonstrated blocked mutation path, remove the marker, redirect its check
or weaken the contract assertion. Source inspection of memory output is not
append/memory execution evidence.

**Disposition:** retain the candidate as partial, leave task 6.1 unchecked and
`.8` blocked. Completing it needs a bounded authorization for our guard's known
no-workspace result handling and authority to run only disposable fixture writes
despite the ancestor hold (or an owner-authorized disposition of that hold).
Do not reopen upstream storage/routing semantics, install a newer CLI, construct
unsupported memory outcomes, or start live host/model acceptance.

## Resumed phase — authorized guard correction and disposable CLI checks

**Current result: incomplete; stopped on a new memory-list acknowledgement
mismatch.** Matt authorized the narrow guard correction and disposable rerun in
the same Codex session/actor. This authority supersedes the earlier guard-edit
restriction; the parent review and failed runs above remain historical evidence.
The retired ancestor hold remains absent, with no replacement or bypass. `.8`
was read as blocked/assigned to `codex:oc-integration`, transitioned with
`bd --sandbox --actor codex:oc-integration update opencode-beads-vuy.8 --if-assignee codex:oc-integration --if-status blocked --status in_progress --json`,
then read back in progress with the same assignee, historical `created_by=unknown`
and absent record/account owner. Readbacks are `vuy8-resume-transition.json` and
`vuy8-resumed-readback.json` under the existing scratch directory.

### Regression and guard correction

First added a regression using the runner's actual `PrimeProcessError`: exit 1,
empty stderr and stdout
`{"error":"cannot resolve repo context: no .beads directory found","schema_version":1}`.
Focused **RED**: 15 pass, 1 fail, exit 1; the expected uninitialized result was
probe-failed (`vuy8-resume-guard-red.log`). Only afterward, changed
`probeBeadsWorkspace` to recognize that exact error text/schema on exit 1 from
`PrimeProcessError`. It returns absence without marker/store reads or fallback.
Other errors still fail the probe. The negative regression covers an unrelated
exit-1 error, a different exit code, unsupported error schema and interruption;
existing malformed/unsupported context tests remain. Focused **GREEN**: 16 pass,
0 fail, 52 assertions, exit 0 (`vuy8-resume-guard-green.log`). The real CLI
no-workspace guard check now passes too.

### Actual CLI results and newly demonstrated blocker

The existing disposable HOME/root re-exec was retained. Every test CLI invocation
carries `--sandbox --actor codex:oc-integration`; no project tracker was used for
fixture operations. Append acknowledges and fresh show retains the exact prior
notes plus newline-separated multiline checkpoint, including literal shell-like
text. Created audit author and claimed assignee match the explicit executor.
Disposable create/claim/discovered-from/close and schema-refresh checks now pass.

Installed **bd 1.3.1 (c1c4b642a: HEAD@c1c4b642ac1c)** actually returned:

- Empty remember: exit 1, JSON `error="memory content cannot be empty"`,
  `schema_version=1`; no empty memory is created.
- Recall of both the rejected-empty key and an absent key: exit 1, JSON contains
  the requested key, `value=""`, `found=false`, `schema_version=1`.
- Remember and same-key update: exit 0, exact multiline value, explicit key,
  actions `remembered`/`updated`, and `schema_version=1`. A separate recall finds
  the exact stored content with `found=true`.
- **Empty list and no-match search:** exit 0, `{"schema_version":1}`.
  **List and matching search:** exit 0, an object containing the exact updated
  memory value plus numeric `schema_version:1`.

The last shape is a genuine **plugin acknowledgement mismatch**, not an upstream
defect: `src/continuity.ts`'s memories branch requires every object value to be a
string. The installed CLI's numeric metadata therefore makes even successful
empty/populated lists fail that branch. The four raw-map contract expectations
remain failing; they are not weakened by deleting metadata only inside the test.
The first extended run (`vuy8-resume-contract.log`) and a diagnostic-only rerun
in another fresh disposable root (`vuy8-resume-contract-evidence.log`) both exit
1. The latter records exact JSON: **36 checks pass, 4 fail**, all four failures
are this list/search shape. Source tracing establishes the adapter consequence;
no installed OpenCode tool invocation or model behavior was tested.

Stopped on that newly demonstrated blocker. Correcting the acknowledgement and
its fixtures would require `src/continuity.ts`/`tests/continuity.test.ts`, outside
the authorized paths. Neither was edited; no upstream repair, new harness or
backend restriction was introduced. Empty-found and failed/indeterminate commit
fields are still not fabricated: this release refuses empty writes, and its
observed remember JSON has no commit outcome fields. Existing adapter fixtures
for richer outcomes remain unchanged and pass. No admin experiment was run.

### Consolidated current candidate checks

All commands used the verified cached baseline Bun on PATH, `TMPDIR` and explicit
test actor exactly as in the earlier environment block; no wrapper repair,
runtime/CLI install or upgrade occurred. Logs below are all in
`/opt/data/cache/scratch/` and preserve earlier runs under their original names.

| Command | Exit | Current evidence |
| --- | --- | --- |
| `bun test` | 0 | **168 pass, 0 fail**, 1,260 assertions, 12 files; `vuy8-resume-tests.log` |
| `bun run typecheck` | 0 | `vuy8-resume-typecheck.log` |
| `bun run test:package` | 0 | `vuy8-resume-package.log` |
| `bun run test:bd-contract` | 1 | First extended run and diagnostic rerun described above |
| `openspec validate improve-beads-workflow-parity --strict --no-interactive` | 0 | `vuy8-resume-openspec-change.log` |
| `openspec validate --all --strict --no-interactive` | 0 | 1 passed, 0 failed; `vuy8-resume-openspec-all.log` |
| `python3 docs/validate-parity-planning.py /opt/data/cache/scratch/parity-sources` | 0 | Seven groups pass; `vuy8-resume-planning.log` |
| `git diff --check` | 0 | `vuy8-resume-diff-check.log` |

Current package: `@snarkipus/opencode-beads@1.0.2`,
`snarkipus-opencode-beads-1.0.2.tgz`, SHA-256
`d7f32c76f1b9abcfe788a1362bbaea325faf51f460fd3fe055f16e64074eb8d7`.
The archive/consumer were cleaned up by the existing smoke script. Its changed
identity reflects the guard source correction; no version or publication changed.

### Source relationship, custody and parent handoff

The original `.6` acceptance/review remains immutable at
`a5d6b2bea779259ba9aa3175ab86fb2f4f2b862b`; it did **not** review this new guard
correction. `src/guard.ts` is now the sole production-source difference against
that revision. The current full suite reran the relevant host/guard/flow,
guidance/agent and continuity fixtures, plus package/type checks. Those passing
fixtures do not supersede the real CLI failure or establish live acceptance.
No `.6` ownership, metadata or acceptance record was changed.

Total worker paths are now exactly `src/guard.ts`, `tests/guard.test.ts`,
`scripts/bd-contract.ts`, and `docs/integrated-acceptance-vuy8.md`. The five
protected paths still match the supplied manifest; custody is
`vuy8-resume-protected-final.json`. The previous report including parent edits
was retained as an exact byte prefix (snapshot `vuy8-resume-prior-evidence.md`,
SHA-256 `371afa8e1f35a9df4d3fc37eb661684528934cb23c180342d2d4ea59d6024f00`).
Current four-path hashes are in `vuy8-resume-candidate-manifest.json`.

`.8` remains open/in progress under the same executor with a final evidence
pointer for parent disposition. **No task 6.1 acceptance or checkmark is claimed.**
Live **1.1/4.2/6.2 remain UNEXECUTED**, including correction/decline and actual
installed unload/reactivate. No next child, OpenCode command, model evaluation,
activation, extra agent, Git staging/commit/push, remote Dolt sync or closure.

## Final parent correction and task 6.1 acceptance

Snarkimedes reviewed the worker guard diff and its RED/GREEN evidence. The exact
supported exit-1/schema-1 no-workspace response is classified as uninitialized;
other errors, unsupported error versions and interruption remain probe failures.
There is no fallback store access. This resolves our adapter classification, not
an upstream defect.

The resumed real CLI run also exposed numeric `schema_version: 1` in memory
lists. Parent treated this small response-decoding correction as part of the
same task 6.1 integration work, without another worker, issue or upstream repair.
Parent added a regression in `tests/continuity.test.ts` and observed RED (exit 1,
acknowledged expected but failed returned; `vuy8-parent-memory-red.log`) before
editing production code. `src/continuity.ts` now removes only known numeric
schema-1 envelope metadata from a copy of the memory map and validates all
remaining values as strings. Empty and populated versioned lists are accepted;
unsupported numeric versions and unrelated non-string fields remain rejected.
The CLI contract now asserts the actual versioned raw envelope, exact memory
contents and absence of additional entries. Metadata is not merely discarded
inside tests while leaving production decoding broken.

Final independent parent executions used cached baseline Bun 1.3.14 on PATH,
`TMPDIR=/opt/data/cache/scratch` and actual actor `snarkimedes` for disposable
CLI operations. All exited 0:

- Guard/continuity focused tests: **31 pass, 0 fail**.
- Full repository suite: **170 pass, 0 fail**, 1,267 assertions, 12 files.
- Typecheck and packed-package smoke: pass.
- Real Beads 1.3.1 disposable CLI contract: **40 checks pass, 0 fail**.
- Strict named/global OpenSpec, planning/source validation and whitespace: pass.

Execution logs and exits are indexed in
`/opt/data/cache/scratch/vuy8-parent-final-checks.json`; detailed logs use the
`vuy8-parent-{focused-green,tests-final,typecheck-final,package-final,contract-final}.log`
names. Tested production/fixture/contract hashes are retained in
`vuy8-parent-final-source-manifest.json`. The final archive SHA-256 is
`043257ca145a775bf8b10cb73194a2fae2eb0d2d25b379e00f90ca8219e6ddf3`, still package
`@snarkipus/opencode-beads@1.0.2`; no version bump or publication occurred.

Real checks establish append retention/readback, explicit audit/claim actor,
remember/update/recall, empty-content rejection, missing-key exits, empty and
populated list/search envelopes, setup/prime and disposable schema-marker refresh.
The installed release does not demonstrate found-empty memory or richer commit
outcome fields; those remain fixture-supported shapes, not fabricated live results.

**Standards:** no remaining blocking finding in the bounded guard/parser/test
changes; direct CLI invocation, attribution, no retry/bypass and user-file
preservation remain intact. **Spec:** task 6.1's supported deterministic/package/CLI
acceptance is met; live 1.1/4.2/6.2 and final reconciliation 6.3 are not satisfied
by these checks. The original `.6` review remains unchanged and does not review
the new guard/parser fixes; relevant current host/guard/flow/continuity fixtures
were rerun by the parent in the full suite.

Parent checked only task 6.1 and reconciled the validator's accepted task set;
the local ledger is now nine accepted of thirteen. The five protected planning
paths matched before acceptance; the sole subsequent protected-file change is
the parent-owned 6.1 checkbox, with no task wording or gap-resolution changes.
`.8` remains open pending separately authorized publication/closeout; no worker
continuation, next child, live host/model evaluation, install, activation,
commit/push, Dolt synchronization or closure is implied.
