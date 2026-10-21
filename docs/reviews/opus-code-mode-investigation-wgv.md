# Opus code-mode investigation review

Review: `opencode-beads-ecj`; investigation: `opencode-beads-wgv`.

Scope: frozen investigation report and proposed implementation direction, NOT implemented source, installed/model qualification, activation or release.

- Baseline: `072429f1a7723ade23e756a921924d9d0acacf31`.
- Actual model: `claude-opus-5-5`; requested effort: medium.
- Reviewer session: `ef963df0-acdb-4479-af76-29a067b3975f`.
- Report SHA-256: `58af436a57730d4df396b9e38551a1c689efa848af7509c4fe1062f277db1826`.
- Parent verified all 14 frozen hashes and completed working-report identity.
- Result: `is_error=false`, `terminal_reason=completed`, no permission denials; actual modelUsage identifies Opus 5.5.
- Read-only tools: Read/Grep/Glob; no subagents spawned.
- Full execution record: `/opt/data/cache/scratch/opencode-codemode-opus-review/review.jsonl`; manifest alongside.

## Independent verdict

**Verdict: READY.** This covers the investigation and the implementation direction it recommends. It does not approve source code, installed behaviour, activation or release.

## Standards findings
No material findings.

- **Ownership and scope fit `AGENTS.md`.** The report proposes no upstream patch, no decline translator, no retry loop and no confinement or routing framework (`docs/code-mode-product-investigation.md:46`, `:199`, `:243`). Beads keeps routing and the database (`:27`). Write actors still come from the host's session and agent identity, and the model gets no actor argument (`:195`; matches `src/continuity.ts:34-41`, `:150`, `:201`).
- **Size is proportionate.** It adds one fixed-argv read operation with no generic runner and no writes (`:91-106`, `:236`). Schemas stay as raw JSON with branch checks inside the existing result construction, rather than a validation framework (`:83`). The deferral list is explicit (`:243`).
- **Namespace claim confirmed in pinned source.** `effectiveName` turns namespace + name into `beads_show` (`core/src/tool/runtime.ts:278-281`). `editor.namespace` exists (`core/src/tool.ts:171-178`), and code-mode paths become `beads.show` (`codemode/tool.ts:321-322`). So `host.ts`'s existing exclusion of `beads_*` events can stay as it is (`:28`, `:236`).

## Spec findings
No blockers. Two low-severity points are worth fixing in the implementation dispatch rather than in another report revision:

1. **Low: the query filter flags aren't backed by captured evidence.** `:95-97` and `:106` propose `parent` on ready/list, `status`, `assignee`, and `--direction`/`--type` on `dep list`. The packet has no saved help output for them; I found no `--parent`/`--direction` text in any packet file. `:258` says help was inspected, and `:236` makes a 1.3.0 check a condition of implementation.
   - **Consequence:** the published `QueryInput` could advertise a filter that the 1.3.0 minimum rejects.
   - **Smallest fix:** in the P1 acceptance, require recorded 1.3.0 and 1.3.1 help (or `bd-contract` runs) for every advertised filter. Drop any unsupported filter from the input schema instead of branching on version at runtime.
2. **Low: the `complete` flag for ready/list leaves an ambiguous edge.** `:106` treats a full page as conservatively incomplete. That is honest: it never claims completeness falsely. But a result of exactly `limit` records gets reported as incomplete even when nothing was left out.
   - **Smallest fix:** ask the CLI for `limit+1`, return at most `limit`, and set `complete` from whether the extra record arrived. State that "complete" means complete for the CLI view's own default filters, not the whole tracker.

The remaining spec checks passed:
- **Your accepted plain-decline decision is kept, not reopened.** Stop/Cancel stays separate and still unqualified, and the historical failure stays recorded as a failure (`:9`, `:199`, `:241`).
- **Persistence stays truthful.** Fulfilment and completion are kept distinct from durable success; `uncertain` writes carry their target; there is no automatic retry; a mutation that runs before an outer contract failure is called out (`:28`, `:43`, `:85`).
- **Proposed signatures are labelled as proposed, not available** (`:71`, `:98-101`, `:120`, `:125`). The search signature matches pinned source (`tool-runtime.ts:89-107`).
- **Status checks don't lose uncertainty.** The ordered-write sketch stops on any non-`acknowledged` checkpoint and keeps `commitIndeterminate`. The read sketches keep `rejected` separate from `failed` and `missing` (`:136-147`, `:183-190`).
- **Branch table matches current code.** Write failures produce only `uncertain`, reads produce `failed`, and recall-missing is decided only from the CLI's exit-1 output (`continuity.ts:206-214`).
- **Value of `query` is stated honestly.** It improves discoverability and reliability over structured shell; it doesn't uniquely make selective handling possible. No real savings are claimed (`:89`, `:203`, `:217`).
- **Bridge metrics match `bridge-results.json`:** 18,432 vs 905 bytes, 9 calls, 0 logs, guidance 7,758 / 4,421 bytes, and the as-built signature `Promise<string | null>`.
- **The scope fits your broad objective.** All commands, the shared skill and shell fallback stay; typed tools cover the common read paths and the continuity primitives (`:108-116`).

## Optional observations
- **Parent follow-up:** the parent's spec and tasks don't yet mention the six-tool namespaced direction; `candidate.diff` only covers the decline decision and the defect it doesn't accept. That is the parent's reconciliation step after acceptance, as `:245` says, not a defect in the report.
- `:83` could say the readable `content` keeps the `failed`/`uncertain` detail in the direct path. It's implied by "retaining status/reference/detail".
- The dependencies view caps after normalising, so its `complete` flag is exact. Saying so would make it clearer than the ready/list case.

## Not verified
- Whether 1.3.0 or 1.3.1 supports the query flags, and what `dep list` actually returns.
- The count of 30 commands and 16 resource links (`:116`).
- That the cached source matches its Git blob IDs (I took the researcher's claim).
- Any installed host, model, interpreter, real token use, or cancellation behaviour.
- `host.ts` registration details beyond what the report cites.

I didn't re-run either probe and relied on the reported results. I also didn't check the manifest hashes.

## Parent disposition

Review completed READY for the report and recommended direction. No blocking corrections; retain both low-severity implementation notes: record minimum/current CLI support for every advertised filter, dropping unsupported filters rather than adding runtime version branches; and consider a limit-plus-one lookahead with completeness explicitly scoped to the CLI view defaults. Neither note authorizes implementation or changes the frozen report.

The owner-accepted upstream plain-decline limitation remains accepted; the output-schema defect is not waived. Investigation remains open pending parent/owner direction and normative implementation reconciliation. No product source, task marker, host/model run, upstream filing, publication, activation or release follows from this review.
