# OpenCode 2.3.0 bounded qualification and deferred coverage

## Owner disposition — 2026-11-13

**Accepted with explicitly deferred coverage, not an exhaustive native pass.** After the parent recommended accepting the bounded qualification rather than another timing campaign, the owner agreed: “I agree - just document the gap and the rationale for deferring.”

This decision removes the two cases below from the remaining required qualification scope for this candidate. They remain **deferred and unexecuted, not passed**. It does not weaken the intended stop, freshness, scope, acceptance or honest-outcome requirements, resolve `opencode-beads-o66`, or authorize publication, release, merge or operator upgrades.

## Exact candidate and evidence classes

- Source: baseline `bc8031c1f8bb80baf0f739cb6fff0644d902a5c2` plus the reviewed thirteen-file working candidate; no product changes during qualification.
- Normal packed archive: SHA-256 `80d3295bcdd378a6b920eb309e1bfb5e33b46e35f36bb490a4f1160b03253724`; all 32 packaged files matched the candidate source.
- Exact native host and SDK/client: OpenCode 2.3.0; Beads CLI 1.3.4.
- Genuine provider/model: OpenAI `gpt-6.1-terra`, `high`, for primary and inherited default task-agent children. Codex Terra/high orchestrated the probes; that is distinct from the native model execution being evaluated.
- Source checks: parent-run 233 tests / 12,340 assertions, typecheck, exact-package smoke, strict specification validation and whitespace checks passed. Independent Claude Opus 5.5 source review returned READY. That review did not independently review the later native evidence.
- Native evidence: parent reran both offline analyzers against retained traces and independently checked source preservation and owned-process/fixture cleanup. Actual request observations are pre-serializer captures, not provider-wire interception.

## Measured native coverage accepted

- Ordinary packed-plugin registration: 30 commands, installed skill/default task agent and all eleven native Beads namespace operations.
- Immediate running launch handle, later real child report and idle-parent wake; actual model/session/actor provenance, child claim and checkpoint independently read back.
- Report delivery while the parent remained active after launch-time processing; subsequent actual task and reusable-knowledge reads matched independent fixture state. The transparent observer captured the post-report request; final model prose alone was not treated as freshness proof.
- Native VM discovery and composed `find`/`get` execution, with actual leaf results and invoking permissions.
- Child interruption at a checkpoint permission wait before CLI approval; independent readback showed no landed note.
- Parent interruption followed by a late child report: the host woke the parent, which disclosed the interrupted read and made no further tool calls. Native wake was not mislabelled as an adapter-initiated restart or authorization for task work/closure.
- Approved checkpoint landed before acknowledgement was interrupted; durable readback confirmed it, the parent reported uncertainty and did not retry. This used a disclosed fixture-only wrapper which ran the real CLI unchanged and held its output after exit; it did not fabricate an execution result or implement custom abort behavior.

## Deferred, unexecuted coverage and rationale

### 1. Repeated idle reports while the same work is still outstanding

**Gap:** Native reports and a separately authorized follow-up report were observed, but not repeated idle-period reports while the same assignment retained outstanding work. The existing source/fixture checks are not a substitute for this missing native observation.

**Why defer:** The changed adapter cue does not parse report contents/status or implement a completion state machine. The meaningful changed boundaries—launch versus report, active/idle parent freshness, durable reconciliation and no work after stop—were observed on the real host. Obtaining this additional timing/state combination would require more deliberately arranged background work and another native campaign, without a demonstrated adapter defect. The owner judged that incremental qualification cost disproportionate for this bounded compatibility change.

**Residual uncertainty:** Repeated reports with outstanding work have not been demonstrated end to end with this candidate. Neither reliable report ordering nor repeated-report model judgment is claimed.

**Revisit when:** Ordinary authorized use supplies this case, an upstream report-lifecycle change affects our integration, or evidence shows incorrect closure/reconciliation on a repeated report. No automatic follow-up campaign is scheduled.

### 2. Cancellation while the real `bd` process is still executing

**Gap:** The probes covered both pre-execution permission-wait cancellation and a landed write with interrupted acknowledgement. They did not interrupt `bd` during its own execution. The output-hold result must not be presented as proof of a mid-CLI kill, rollback or uncertain database commit.

**Why defer:** The compatibility patch does not change the CLI process runner or typed-operation cancellation implementation; existing deterministic cancellation coverage remains applicable. The native samples demonstrated cooperative interruption and the important landed-but-unacknowledged recovery path without blind retry. Hitting the narrower in-process timing window would require further timing instrumentation or repeated attempts. No observed failure currently justifies that additional campaign.

**Residual uncertainty:** Mid-`bd` process termination and resulting durable state were not measured on this host/candidate. Atomic rollback, exactly-once execution and a guaranteed final checkpoint are not promised.

**Revisit when:** The runner/cancellation path changes, a real interrupted operation exposes incorrect settlement/readback, or an upstream cancellation change materially invalidates retained coverage.

## Preserved invalid observations and qualifications

The first monitor incorrectly treated parent idle as completion while its child remained active. Its initial completion flag is invalid; observation continued on the same native sessions through the real report, and the original capture remains preserved. The cancellation fixture note anticipated an interruption before it occurred; that wording is not evidence. Independent permission/process/interruption/readback timestamps establish the actual outcome. No product behavior was tuned to hide these harness/executor errors.

The original worker reports remain historical handoffs with their then-current INCOMPLETE verdicts. This owner decision is a successor disposition, not a retroactive alteration of those reports.

## Evidence locations and boundaries

Raw evidence stays outside the product and credential profile:

- `/opt/data/research/opencode-2.3.0-plugin-impact/native-qualification/native-report.md`, `verify.py`, `assertions.json` and associated sanitized native traces.
- The `remaining/` subdirectory contains `remaining-report.md`, the second analyzer, request/event/permission traces, independent state readbacks, wrapper source/timeline and cleanup receipt.
- Source-stage review and parent acceptance are under the adjacent `source-review/` and `implementation-terra-high/` directories.

All owned qualification servers/listeners, disposable trackers and transient server secrets were removed. The authorized isolated native authentication profile was retained in place, outside scratch pruning; no operator credentials were copied or bundled. The public README/package documentation in the frozen archive still says native qualification is pending because it predates this evidence disposition; the 2.2.0 preparation reconciles current documentation to this bounded scope without relabelling the deferred checks as passed. This qualification record itself changed no packed runtime file or operator installation; release preparation and publication are separate actions.
