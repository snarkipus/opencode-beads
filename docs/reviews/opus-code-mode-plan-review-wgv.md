# Opus review of reconciled code-mode plan

Review `opencode-beads-ecj`; planning `opencode-beads-wgv`; prospective source owner `opencode-beads-vuy.10`.

Actual model `claude-opus-5-5`, requested medium effort, resumed session `ef963df0-acdb-4479-af76-29a067b3975f`. Review scope: correctness, completeness AND proportionality of Astra-reconciled planning, not implementation or installed qualification. Parent verified completed/is_error=false, actual modelUsage, no permission denials, and all20 frozen hashes. Baseline `072429f1a7723ade23e756a921924d9d0acacf31`. Full execution and candidate manifest: `/opt/data/cache/scratch/opencode-codemode-opus-plan-review/`.

## Independent verdict (verbatim)

**Verdict: REVISE** — four bounded wording corrections, then the plan is ready for parent acceptance. **Proportionality: yes, apart from three wording fixes** (P1–P3 below).

The eleven-operation direction is still the right product. It adds no generic runner, macros, queue or cache, and it doesn't pull in a full upstream data model.

The corrections fix two problems:
- **A permission and sync regression:** the new argv ledger moves `--actor` in front of the subcommand and drops `--sandbox`.
- **Ambiguities an implementer would have to guess at:** whether pre-spawn refusals throw or return a value, the actor wording in the spec, the 1.3.0 evidence path, and an executor test seam the plan treats as existing when it doesn't.

## Spec findings (correctness)

**S1 — High. The argv ledger drops `--sandbox` and puts `--actor` before the subcommand.**
- **Where:** `design.md:121-126` writes every write as `bd --actor <derived> <sub> … --json`; `:112` makes the permission resource the rendering of that argv. Neither the specs nor the design mention `--sandbox` anywhere.
- **What's accepted today:** `continuity.ts:154` adds `--actor` and `--sandbox` after the subcommand. The accepted tests assert resources starting `bd update task-1 --append-notes` and `bd remember --key` (`continuity.test.ts:58, 72`). The skill documents the same subcommand-first form with `--sandbox`.
- **Consequence 1:** a user's selective rule such as `bd close *` (deny or ask) no longer matches `bd --actor … close …`. That is a permission-parity regression against existing user rules.
- **Consequence 2:** without `--sandbox`, Dolt auto-push is no longer suppressed, which breaks the no-automatic-sync policy.
- **Fix:** change the ledger column to "`bd <sub> <positionals> <flags> --actor <derived> --sandbox --json` (writes); reads append `--sandbox --json`; keep the accepted `--` terminator before free text where the current mapping uses it. The canonical resource is this exact subcommand-first rendering."
- **Also:** add one clause to the requirement at `work-continuity/spec.md:115`: "fixed argv keeps the accepted subcommand-first canonical form and `--sandbox`".
- **Test:** covered by the per-operation table test below; nothing extra.

**S2 — Moderate. It's unclear whether pre-spawn refusals throw or return a value.**
- **Where:** `design.md:128` says "a pre-spawn refusal is `failed` with `executed:false`". In the same paragraph, permission rejection and cancellation propagate unchanged.
- **What's accepted today:** invalid input, missing identity, guard holds and location changes all throw (`continuity.ts:56-60, 179, 185, 201`; tests at `:78` and `:99`).
- **Consequence:** an implementer has to guess which refusals become values. Turning a hold into a returned value changes code-mode control flow: the program keeps running instead of being interrupted. It would also mean rewriting accepted tests.
- **Fix (smaller option):** "Invalid input, missing identity, guard hold and location change remain thrown pre-spawn refusals, as accepted; there is no `executed:false` result branch." If the owner does want the value branch, list exactly which refusals use it and keep permission and abort thrown.

**S3 — Moderate. The spec's actor wording contradicts how the actor is derived.**
- **Where:** `workflow-access/spec.md:208` says the actor is the same "independently of permission context.agent".
- **The contradiction:** the actor is derived from the actual invocation session plus agent (`continuity.ts:34-41`; `design.md:136`). The vuy2 evidence shows the invoking agent can differ from the session default.
- **Consequence:** taken literally, an implementer could render a session-default actor in context that doesn't match the actor the tool actually writes with.
- **Fix:** "context and typed results expose the same actor derived from the actual request/invocation session and agent; attribution grants no permission, and permission checks separately use the actual `context.agent`."

**S4 — Moderate. Task 7.1's evidence path can't establish what the minimum version needs.**
- **Where:** `tasks.md:46` says "existing cached source/help and, only under separately authorized source execution, disposable `bd-contract` cases".
- **The gap:** help text can't establish JSON shapes, claim-conflict evidence, the generated ID from create, close state, or whether prime depends on issue state. The risk is either "qualifying" 1.3.0 from help alone, or stalling with no defined rule.
- **Fix:** "JSON, claim, create, close and prime-dependence facts for 1.3.0 and 1.3.1 are established only by running the existing `scripts/bd-contract.ts`. Its binaries are installed into disposable directories via the existing `scripts/install-bd.sh`, under explicit authority. Help-only evidence leaves a contract unestablished: omit the optional filter, or stop for a core operation. The ledger is a table in the SDK contract that cites `bd-contract` output, not a second tool."

**S5 — Low. The "existing pinned executor/catalog seam" isn't in the product tests.**
- **Where:** `tasks.md:47` says to extend it. The product tests import only `@opencode/plugin` types. The seam exists only as scratch probes (`opencode-codemode-shape-review/check-output-contract.ts`, `opencode-codemode-product-wgv/bridge-probe.ts`), which run against copied host files.
- **Consequence:** an implementer may vendor the host runtime into maintained tests, or skip the one check that catches the demonstrated undeclared-output failure.
- **Fix:** "Rerun the existing scratch executor/catalog probe against the exact .10 candidate's real definitions and record the result in the SDK contract. Product tests assert that every definition declares `output` and that each normalised fixture satisfies its declared branch. Installed catalog and executor confirmation stays with .2 and .9."

Checks that passed:
- **Capability rendering:** source-supported; `event.tools` is on the context hook (`plugin/src/effect/session.ts:35`).
- **Batch partial failure:** per-ID failures; all failed returns `failed`.
- **Completeness:** true / false / unknown (`null`), and `limit+1` only where the CLI view supports a bounded query.
- **Uncertain outcomes:** uncertain claim and create keep their target; `not-claimed` only on evidence.
- **Prime refresh:** stays conservative until 7.1 settles prime dependence; acknowledged writes no longer trigger a redundant cue.
- **Settled boundaries:** the accepted plain-decline limitation and Stop/Cancel owned by .6.
- **Task 1.1:** already covers the namespace, catalog signatures and execute-denied checks (`tasks.md:12`).

## Standards findings (proportionality and ownership)

**P1 — Moderate.** `tasks.md:48` says "for each capability combination". That invites a cross-product of capabilities. Replace with "representative states: typed available; `execute` denied with shell available; neither available; guard hold".

**P2 — Low.** `tasks.md:47`, "exercise all result branches … rechecks for every child spawn", is a correct implementation requirement but an unbounded test instruction. Add: "Tests: one table-driven case set per operation (argv, normalisation, declared branches). Shared boundary negatives run once against a representative multi-spawn `get` and a representative write. Retarget the 15 existing shared-boundary tests rather than multiplying them across operations."

**P3 — Low.** `execution-map.md:34` gives .6 "affected identity/handoff/abort rechecks", which overlaps the deterministic abort checks in 7.2/7.3. Add: ".6 consumes the 7.2/7.3 deterministic results; it adds only its Stop/handoff observation."

Optional, non-blocking:
- The claim readback fallback via "a separately permissioned show" (`design.md:132`) hides a second permission prompt inside one claim. Returning `uncertain` plus the target and letting the program call `get` is simpler.
- Define the `memories` result shape once (`design.md:119` says "records"; the accepted adapter returns a key→value map).
- The `.2 → .10` edge blocks .2's throwaway host probes, which don't need the adapter. Live-host authority gates them anyway.

The ownership graph is otherwise coherent: one source owner (.10) for 7.1 → 7.2 → 7.3, and the qualification owners (.2, .6, .9) consume its outputs.

## Verification outline

| Category | Owner | Content |
|---|---|---|
| Per-operation argv and normalisation | 7.2 | One table entry per operation (about 11): canonical subcommand-first argv with `--sandbox`, the resource string, success normalisation, each declared branch from fixture CLI output. |
| Shared boundary failures | 7.2 | Retarget the existing tests once: permission identity and `save: []`, external directory, hold before and after approval, location change, abort during approval and after spawn, missing identity, no retry, notification error keeps the original detail, sole acknowledgement. Plus new: batch partial failure, complete/unknown, uncertain claim and create. |
| Native executor and catalog seam | 7.2 (scratch), .2 / .9 (installed) | One rerun of the scratch probe against the real definitions, recorded in the SDK contract. Product test only asserts declared outputs. |
| CLI ledger | 7.1 | Existing `bd-contract.ts`, extended only for new shapes (find views with limit, close, update fields, `dep list` direction/type, claim conflict, create ID, prime before/after an issue write). Run once on 1.3.0 and once on 1.3.1. |
| Guidance, context, package | 7.3 | The four capability states, actor isolation across agents and sessions, operation-aware references, conservative invalidation, 17 links installed, disposal. |
| Installed workflows and Stop | .9 / .6 | Workflows A–D on the actual host; one Stop during a composed write; actor agreement between typed and shell writes. Byte and process observations, with no token-savings claim. |
| Regression | 7.3 | Existing suite, typecheck, package smoke. |

**Do not test downstream:**
- OpenCode's interpreter, JavaScript or Promise semantics.
- Catalog search ranking or renderer internals.
- The permission service's wildcard engine.
- Compaction, replay or scheduling.
- Beads readiness, routing or consistency.
- Plain-decline whole-step termination (owner-accepted).
- Cross-products of operations × versions × modes × permission outcomes.
- A host replica, or a vendored executor in product tests.

## Scope

This verdict covers the reconciled plan only. It does not approve implemented source or installed or model behaviour, and it does not authorise implementation. I didn't run anything. I read the plan, the frozen source and tests, `bd-contract.ts`, the scoped Beads, and the pinned host session-type cache.

## Parent verification and disposition

REVISE is retained. The broader eleven-operation architecture is judged proportionate; required corrections concern the actual plan/verification scope. Independently confirmed the canonical argv drift against src/continuity.ts:148-154, contradictory actor wording at workflow-access/spec.md:208, and task7.2/7.3 references to an existing product executor seam and every-capability-combination testing. Review finding IDs S1-S5 and P1-P3 are the authoritative correction references; the opening prose count does not enumerate them accurately.

No product defect was introduced into running code by these planning errors: product source remains unchanged and typed activation withheld. Plan corrections and a bounded recheck are still pending; no source implementation or auto-correction dispatched from this review notification. Preserve all prior reports and accepted source task history. Proposed reuse of existing boundary tests and representative native/installed evidence must not weaken real guard, permission, actor, cancellation or truthful-persistence requirements.

Minimum/current JSON/mutation/prime contract qualification requires observed supported CLI evidence in isolated repositories, not help alone. Tagged source/help remains useful for planning/discovery; do not create a parallel qualification tool or upstream test campaign.
