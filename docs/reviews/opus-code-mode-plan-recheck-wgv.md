# Opus corrected-plan delta recheck

Review `opencode-beads-ecj`; planning `opencode-beads-wgv`; prospective source `opencode-beads-vuy.10`.

Actual model `claude-opus-5-5`; requested medium effort; resumed session `ef963df0-acdb-4479-af76-29a067b3975f`. Parent verified completed/is_error=false, actual modelUsage, no permission denials, all20 frozen hashes and exact working-candidate identity. Packet, manifest, correction-only diff and stream are under `/opt/data/cache/scratch/opencode-codemode-opus-plan-recheck/`. Baseline `072429f1a7723ade23e756a921924d9d0acacf31`.

The original REVISE in opus-code-mode-plan-review-wgv.md remains intact. This is a separate READY on the corrected plan, not implementation or installed/model acceptance.

## Independent recheck (verbatim)

**Verdict: READY** for the corrected plan. All eight findings (S1–S5, P1–P3) are resolved, and the corrections introduced no regressions. **Proportionality: yes.** The corrections bound the testing work without weakening any real guarantee: permissions, attribution, guard holds, cancellation and persistence honesty are all kept. The original REVISE stands unchanged as the historical verdict; this recheck is separate from it.

## Spec findings (correctness)

| Finding | Status | Evidence |
|---|---|---|
| **S1 — High** (argv order, `--sandbox`) | **Resolved** | The design rule (`design.md` corrected clause, diff :36) now keeps subcommand-first argv. `--sandbox` goes on every read and write; `--actor` goes on writes, after the operation's arguments and before any `--` terminator. Global flags never go before the subcommand or after `--`. The ledger rows (diff :51-61) match the frozen source exactly: `continuity.ts:70-74` plus the splice at `:154` produce `bd show <id> --json --sandbox`, `bd memories --json --sandbox -- [search]`, `bd recall <key> --json --sandbox`, `bd update <id> --append-notes <text> --json --actor <a> --sandbox` and `bd remember --key <k> --json --actor <a> --sandbox -- <text>`. The new rows (claim, update, close, create, find, edges) follow the same pattern. The new normative scenario "Canonical execution preserves permission and sync policy" (`work-continuity/spec.md`, diff :148-152) and the requirement clause (diff :140) state it. Task 7.2 (diff :193) carries it into implementation. |
| **S2 — Moderate** (throw vs. value) | **Resolved** | Diff :64 and the new scenario "Execution is refused before spawn" (diff :154-158): invalid input, missing identity, guard hold and location change stay thrown. There is no `executed:false` branch. Permission rejection and cancellation are unchanged. A started write that is interrupted keeps its recovery uncertainty even without a normal return. This matches accepted `continuity.ts:56-60, 179, 185, 201`. |
| **S3 — Moderate** (actor wording) | **Resolved** | `workflow-access/spec.md` (diff :170) and design (diff :74): the context actor and the typed-write actor both derive from the same actual request/invocation session and agent, never the session-default agent. Attribution grants no permission, and permission checks separately use the actual `context.agent`. Task 7.3 (diff :194) adds "no session-default substitution or mandatory delegation". |
| **S4 — Moderate** (1.3.0 evidence path) | **Resolved** | Task 7.1 (diff :192) and design (diff :87): under a future authorised assignment, `scripts/install-bd.sh` installs 1.3.0 and 1.3.1 into disposable directories, and the existing `scripts/bd-contract.ts` runs once per version. Extensions are limited to the touched shapes. Help and source count only as discovery, never as passing evidence. The ledger is a table in the SDK contract citing captured output. Nothing is authorised now, and the operator environment and the minimum version are untouched. Unsupported optional filters are omitted; a core operation that fails its contract stops for a parent decision. |
| **S5 — Low** (executor seam) | **Resolved** | Diff :89 and task 7.2 state plainly that no maintained executor seam exists. 7.2 reruns the two existing scratch probes once against the real candidate definitions and records the pin, commands and results in the SDK contract. Product tests assert that every definition declares `output` and that normalised fixtures satisfy their declared branch. No vendored runtime, new dependency or host replica. Installed confirmation stays with .2 and .9. |

## Standards findings (proportionality)

| Finding | Status | Evidence |
|---|---|---|
| **P1 — Moderate** (capability combinations) | **Resolved** | Task 7.3 (diff :194) and design (diff :93) now name four representative states: typed available; `execute` denied with shell available; neither available; guard hold. Actor isolation stays, and the capability cross-product is explicitly excluded. |
| **P2 — Low** (test multiplication) | **Resolved** | Task 7.2 and diff :91: one table-driven case set per operation. Shared negative tests are retargeted once, against a representative multi-spawn `get` and a representative write, plus only the necessary new partial/completeness/uncertain cases. Production still rechecks before every child spawn. The matrix and the upstream-owned tests are excluded. |
| **P3 — Low** (.6 overlap) | **Resolved** | Task 4.2 (diff :181), `execution-map.md` (diff :104), design (diff :83, :93), and the scoped `.6` record (`scoped-beads.json:227-228, 244`) all say the same thing. .6 consumes the 7.2/7.3 deterministic evidence and adds only its own Stop/handoff observation. Explicit cancellation must still prevent later dispatch. |

**Regressions from the corrections:** none found. The two optional items the planner chose to resolve are consistent with the necessary contracts:
- `memories` keeps the accepted key→value map (diff :54).
- An uncertain claim returns its target and actor, and the caller runs `get` explicitly; claim no longer hides a second permission prompt (diff :69).

Task IDs, markers, ownership and dependencies are unchanged in the files I read.

## Optional notes (non-blocking)

- **`create` title can be parsed as flags.** This predates the corrections and is outside the recheck scope. The `create` row (diff :60) passes `<title>` as a free positional before the flags. IDs and keys can't start with `-` because of the token check, but a model-supplied title starting with `-` (for example `--assignee=x`) could be read as a flag. When 7.1 qualifies the exact argv for create, use a supported title flag or reject titles with a leading `-`. Search text already follows `--`.
- **"No per-command reapproval" wording.** In 7.1 (diff :192) this should be read as orchestration/tracker approval inside the scoped assignment, not as bypassing OpenCode or host permission prompts. Making that explicit would remove any doubt.

## Scope

This verdict covers the corrected plan only. It does not accept any source, installed behaviour or model behaviour, and it does not authorise implementation, CLI installation or contract runs. I didn't run anything. I read the correction diff, the corrected clauses, the frozen `continuity.ts` argv placement and the scoped Beads fields.

## Parent disposition

All S1-S5 and P1-P3 corrections are independently resolved; no additional plan revision/review is required for the two nonblocking notes. Carry these into the existing task7.1/7.2 implementation handoff: qualify a supported title flag or otherwise ensure flag-like create titles remain data, never CLI options; scoped orchestration authority never bypasses native host permission prompts. These are reminders within existing operation/argv qualification, not new tasks or runtime fixes.

The review gate is complete. Source .10 remains blocked/unassigned/implementation_authorized=false; no source execution, CLI installation/contract runs, host/model qualification, publication, activation or release is authorized by this verdict. Planning record remains open for parent-controlled adoption/publication closeout.
