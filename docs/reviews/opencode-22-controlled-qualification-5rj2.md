# OpenCode 2.2.6 local qualification — BLOCKED/PARTIAL

Executor: `codex:86c72145`; actual native Codex session UUID `01a1bd7e-5bd2-7720-88f3-870d909d432b`. The actor suffix is the parent-generated execution token, not a native session claim. Requested worker model/effort: Codex/Astra medium. This report does not independently attest the orchestration model banner. Native Codex performed qualification; it was not an OpenCode agent session.

Work began 2026-11-08 23:29 UTC and completed within the 45-minute bound. Only `opencode-beads-5rj.2` was claimed/checkpointed, with the explicit actor and `--sandbox`; heartbeat used the supported command. It remains `in_progress` for parent review. Tasks 2.2/2.3 checkboxes, acceptance, closure, assignment and sync remain parent-owned.

## Candidate and isolation

- Branch `work/adapt-opencode-2-2-5rj1`; HEAD `f22177939b65ad95e6cf6b7cdb049c07447fd8aa`.
- Runtime source `ccc9851bce42ec3f5a5b348cfa4cc40e1d93a643`; source acceptance is `docs/reviews/opencode-22-source-acceptance-5rj1.md`. Evidence/tooling successors do not replace the runtime.
- Used the frozen archive `/opt/data/research/opencode-beads-2.2.6-impact/implementation-5rj1/snarkipus-opencode-beads-1.1.0-beta.5.tgz`, SHA256 `072d9c29ef89fa2697109be072798e79cf4af622111266de40ef65e7950ac836`. Extracted the public package unchanged; all 31 installed files match the archive. No repack or source installation. The internal beta.5 version is not published beta.5 bytes.
- Actual executable `/usr/local/bin/opencode`, resolved to `/opt/hermes/image-toolchain/npm/node_modules/@opencode/cli/bin/opencode.exe`. CLI and owned server both report **2.2.6**; executable fingerprint is retained. SDK/client package is the existing installed 2.2.6 contract.
- Explicit isolated HOME/XDG config/cache/data/state and TMPDIR under `/opt/data/cache/scratch/oc-beads-22-5rj2`. Disposable committed Git project and embedded Beads 1.3.4 fixture at `tmp/project`; explicit `BEADS_DIR`, no tracker redirect or remote. `preflight-corrected.json` retains successful actual `bd context --json`, seed and prime before any provider request. Seed audit actor is `codex:86c72145`; fixture item `q22-r36` remained open/unassigned.
- Owned foreground/private server bound only to `127.0.0.1:54973`; controlled HTTP provider bound only to `127.0.0.1:44367`. No managed service, operator server, Zeus transport or global install was used.
- `harness/observer-plugin.ts` forwards and awaits the unmodified public plugin setup/cleanup; it records four lifecycle timestamps only. It does not replace dependencies, results or cancellation.

The source suite (218 tests / 11,883 assertions), typecheck, exact packed smoke and strict 4/4 evidence were reused, not rerun. No per-command/argv matrix was added.

## Controlled installed-host observations

All provider frames are **CONTROLLED**, not genuine inference. Provider ID `controlled`, native package `@opencode/ai/providers/openai`; models `model-a` and `model-b`, native variant `default`, no reasoning effort configured. Twenty-eight actual outgoing HTTP requests were captured without headers; native tool calls/results and permission requests are retained. Fixture token counts are synthetic and support no usage, quality or cost claim.

| Case | Outcome | Evidence |
| --- | --- | --- |
| Ordinary command admission and expansion | Passed: one compact persisted user invocation, one static snapshot in its first provider input, no serialized routing key | `ordinary-context.json`, `provider-001.json` |
| Diagnostics capture/replay | Passed transport: durable captured report reappears byte-identically in later primary input; no new diagnostics invocation on replay | `diagnostics-context.json`, frames 002–003; source once-capture evidence reused |
| Legacy/current snapshots | Passed: legacy v1 snapshot expands; new command uses current v1 metadata | `legacy-context.json`, frame 003 |
| Auxiliary generate exclusion | Passed: native session.generate request lacks action/diagnostic/legacy expansion | `generate-result.json`, frame 004 |
| Native title exclusion | Unrun; no independent title-provider frame was established | No title pass inferred from generate |
| Native code-mode catalog and operations | Passed: host search returned real signatures; composed get/note returned actual CLI outcomes | `catalog-context.json`, `composed-allowed-context.json`, frames 005–008 |
| Independent permissions | Passed: separate get/note asks, distinct permission IDs, exact CLI resources, source call correlation, `save: []`, once replies | `permissions.jsonl`, `native-events.jsonl` |
| Denied inner operation | Passed nonexecution: note rejected, independent read approved/completed; outer execute completed with inner error and host continued | `composed-denied-context.json`, frames 009–010; no whole-step-termination claim |
| Direct fallback | Passed: execute denied; real provider catalog exposes direct Beads leaves; actual beads_get succeeds under separate shell-equivalent permission | `direct-inventory-context.json`, `direct-get-context.json`, frames 011–013 |
| Scoped native child identity | Passed bounded observation: native child session with parentID executed direct note with a distinct derived actor; seed authorship and assignment preserved | `session-child.json`, `child-note-context.json`, frame 014; this is not a genuine delegated reasoning/handoff assessment |
| Native compaction and A replay | Passed corrected fixture: real host compaction hook/request, stored native replacement and provider replay | `corrected-native-compaction-context.json`, frames 022–023 |
| Native A → non-replayable B | **Verified limitation**: earlier plain command transcript restored; old snapshot IDs absent from native latest context; unavailable notice emitted, accessible current snapshots expanded | `corrected-native-switch-b-context.json`, frame 024 |
| Summary compaction/replay | Passed corrected fixture transport: stored summary and compact recent text, current snapshot expansion on replay | `corrected-summary-compaction-context.json`, frames 025–026; fixture summary is not semantic model evidence |
| Stop at permission wait | Passed selected nonexecution/no-restart behavior: actual pending ask, native interrupt, aborted tool/step, idle execution, no stopped note | `stop-*.json`, frame 027, final fixture readback |
| Permission request retirement after Stop | **Failed stronger observation**: the stopped request remained listed through session deletion | `stop-pending-after.json`, `after-session-removal-permissions.json`; no repair, no claim that the inventory was empty |
| Actual plugin disposal | Passed lifecycle observation: watched-config removal caused original cleanup entry/return, then native command registry lacked package commands | `lifecycle.jsonl`, `unloaded-commands.json`, `unloaded-plugins.json` |
| Pending diagnostics callback during unload | **Unrun/inconclusive timing**: command returned before cleanup; no pending-callback cancellation pass | `case-timeline.jsonl`; command return 1794181147283, cleanup start 1794181147474, completion 1794181147478 |
| Genuine model workflow | **Blocked/unrun**: no authorized account-managed path supporting the required isolated state | `genuine-readiness.json`; zero isolated accounts, zero genuine requests |

Native sessions:

- Main: `ses_e427c565bffeO1o7GcXCdTA5Zk`, actor `opencode:qualifier:ff5a4b12d522`.
- Direct/Stop: `ses_e427adc94ffeKTHBN4K0GHT1zX`, actor `opencode:qualifier:433d578cb780`.
- Child and unload IDs, exact native agents/models and derived child actor are retained in `session-child.json`, `child-note-context.json`, `session-unload.json` and `permissions.jsonl`.

The native host executors legitimately use their derived OpenCode session actors on fixture writes. These do not replace the qualification worker's `codex:86c72145` coordination actor. Independent CLI readback shows exactly `CONTROLLED_NOTE_5RJ2\nCHILD_NOTE_5RJ2`, unchanged seed author, no assignee, and neither denied nor stopped note.

The B-switch result is the accepted unresolved deficiency `opencode-beads-o66` / upstream #57424, **not recovery of old snapshots, a fix, or a new downstream repair blocker**. The retained native window is used only by A; B receives earlier ordinary user transcript plus explicit unavailable disclosure. No Beads data or stored history was rewritten to manufacture restoration.

## Preserved setup failures and limits

1. Initial `bd context` rejected the fixture outside TMPDIR because installed Beads blocks `/opt` except supported temporary roots. Moving the disposable project beneath the already configured isolated TMPDIR corrected the setup; no CLI/guard patch. Original preflight and narrow probes remain. The pinned reference inspected was `https://raw.githubusercontent.com/gastownhall/beads/7ef2fd05e/internal/beads/context.go`; a retained copy is in `harness/`.
2. Initial plugin config pointed to a file; this host expects a package directory. Before inference, the observer became a directory with a package `./server` export. Native registry then settled to 30 package commands plus 3 built-ins. A first snapshot before settlement showed only built-ins; it was not a dispatch pass. Bun was unavailable on PATH, so the existing generated Promise client ran with installed Node 26.12.1; no installation occurred.
3. Original provider fixture incorrectly answered native compaction with text and summary compaction without mandatory headings. Frames 016, 019–020 and native failed compaction records remain. The host's automatic summary nudge is retained. Only the controlled fixture response protocol was corrected, plus explicit `keep.tokens=0` to select the required missing-old-snapshot case. No product prompt/source was tuned. Original and corrected provider scripts remain; only the owned fixture provider process was replaced, not the OpenCode server. Later corrected frames are separately numbered.
4. Initial offline analyzer assumed one global show instruction copy despite four separate durable show invocations. The corrected assertion derives multiplicity from stored user snapshots. A second assertion expected permission retirement after Stop and failed against actual retained inventory. That stronger failed observation remains explicit; selected Stop nonexecution is verified independently. No host rerun or guarantee silently waived.
5. Session cleanup initially removed the parent before its child, so the host's cascading removal produced SessionNotFound for the child. The remaining cleanup recorded that absence and removed the unload session. The stopped permission entry remained in the host registry until owned process/state teardown.

No authorized genuine route was available in isolated state. No operator credentials/database were copied, selected, imported, translated, refreshed or authenticated. No alternative public/free/paid account or provider was chosen. Inspecting the fresh isolated credential list found zero entries. Existing Codex inference is not OpenCode model qualification. The smallest missing prerequisite is an explicitly authorized account-managed genuine OpenCode route that supports these isolated-state constraints without changing credential custody.

## Cleanup and preservation

`cleanup.json` records terminated owned host PID 45210, controlled provider PID 46715, and retired provider PID 45209, all absent. Both loopback listeners refuse connections. `owned-process-census.json` finds no process with a cwd beneath the scratch root. Only owned process groups were signalled. Private native logs, transient server password and isolated OpenCode data/state/cache were removed. No real provider credential entered the fixture. The fixture/public dummy provider key was removed from final config; retained source contains only its clearly labelled nonsecret constant.

All 197 protected repository paths match the supplied manifest. Captured operator executable and known JSON/JSONC config fingerprints match; no operator credential/database content was inspected or fingerprinted. This is a scoped fingerprint claim, not a census of every possible operator file. All 31 extracted package files match the exact archive. No existing tracked file changed; only the optional new concise repository qualification report is added. No commit, push, tag, release, publication, tracker sync, canonical spec sync/archive or upstream posting occurred.

## Parent verification and remaining gates

Run, offline and without restarting a host:

```sh
python3 /opt/data/research/opencode-beads-2.2.6-impact/qualification-5rj2/analyze.py
```

The analyzer checks **33 assertions against raw evidence**, including preservation of the failed permission-retirement observation and the unqualified pending-unload timing. It prints **BLOCKED/PARTIAL** even when assertions succeed. `analysis.json`, `case-index.json`, `installed-manifest.json`, provider frames, native contexts/events, permission records and `harness/` support review. `result.md` is reserved for the parent CLI's final summary and is not this report.

Task 2.2 is not complete: genuine workflow is blocked; pending diagnostics unload and native title exclusion are unrun. Parent should review the useful controlled mechanics and the retained host permission-inventory observation, then arrange the smallest authorized genuine route and explicitly scope any remaining live check. Task 2.3 final acceptance, marker reconciliation and issue closure remain parent-owned. Stable 2.0 preparation/publication or operator activation is not recommended as accepted from this partial gate; preserve the frozen source and existing pins pending that review.
