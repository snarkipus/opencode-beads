# Independent broader code-mode architecture assessment

Review `opencode-beads-ecj`; investigation `opencode-beads-wgv`. Actual reviewer `claude-opus-5-5`, requested medium effort; resumed session `ef963df0-acdb-4479-af76-29a067b3975f`. This supersedes the six-tool architectural recommendation and narrows the prior READY to its valid output-schema/namespace mechanics; original evidence/verdict is preserved.

Parent verified completed/is_error=false, actual modelUsage, no permission denials and all 58 frozen hashes. Baseline `072429f1a7723ade23e756a921924d9d0acacf31`; host `ba546ec1598a70db2570e9c6258028d955ba8f58`. Frozen packet/manifest and full result under `/opt/data/cache/scratch/opencode-codemode-opus-broader/`. No product implementation or live/model qualification was performed or authorized.

## Opus assessment (verbatim)

**Recommendation: yes, substantial reshaping is warranted.** In pinned OpenCode 2.1.1, native `shell` is not callable from code mode. Inside a code-mode program, Beads can only be reached through tools this plugin registers. So the current five continuity tools plus one query (Sol's "six-tool" proposal) would leave claim, close, create and status changes outside composition entirely. That is a legacy seam, not a coherent code-mode product.

The target I recommend is one `beads` code-mode namespace of about 11 typed operations covering the daily work loop (reads and lifecycle writes), not a wrapper for every CLI verb. It comes with capability-aware context, a single executor-actor source, and the 30 human commands kept as entry points.

**My earlier narrow READY missed this.** It accepted the claims at `code-mode-product-investigation.md:89` and `:195` that code can call `tools.shell`. That READY should be read as covering the output-schema and namespace mechanics only.

## 1. Source-backed facts that change the design

| # | Fact | Evidence | Consequence |
|---|---|---|---|
| F1 | Native `shell` is registered `options: { codemode: false }`, so it is direct-only. | `parity-sources/baseline211/source/packages/core/src/tool/plugin/shell.ts:195` (tag v2.1.1 → `ba546ec`, `baseline211/tag.json`). The other three cached copies agree. | Code mode can't run `bd`, tests or git. Sol `:89` ("five tools plus native shell are functionally sufficient… code can check completion and parse JSON") and `:195` (`tools.shell` as "the verified shell signature") are wrong for code mode. Any Beads operation without a plugin tool can't be composed. |
| F2 | Snapshot split: `codemode !== false` tools appear only inside `execute`. Direct definitions are just the `codemode:false` tools plus `execute`. If `execute` is wholly denied, code-mode tools vanish completely. | `core/src/tool.ts:236-262` | The current tools have no direct path. Sol `:29` ("direct tool consumers receive readable content") and parity doc `:126` ("direct and code-mode inventory") describe a path that doesn't exist under default registration. An agent that denies `execute` loses every typed Beads operation and needs the shell fallback. |
| F3 | Effective ID is `namespace_name`; the catalog path is `namespace.name`; `pinned` is supported; namespace descriptions stay visible in the catalog. | `tool/runtime.ts:278-281`, `codemode/tool.ts:191-208, 321-322` | A namespace with any number of operations keeps `beads_*` IDs, so the after-hook exclusion at `host.ts:349` still works. Catalog cost is the namespace summary plus selected signatures; everything else is reached through search. |
| F4 | The code-mode runtime has no timers, imports or filesystem. Pending calls are interrupted when execution ends. Concurrency comes from `Promise.allSettled`. The outer result is the returned value plus logs; `toolCalls` metadata keeps inner inputs. | `codemode/tool.ts:71-78, 95-150, 333-345` | Code mode is the place for state reads, joins and ordered Beads writes. Repository validation still runs in direct shell turns. Write text persists in trace metadata. |
| F5 | Every typed call runs `session.get` twice and the store guard twice (`bd version`, and possibly `bd context --json`) before the operation itself. | `continuity.ts:188-200`, `guard.ts:39,106` | Hydrating N issues one call at a time costs about 3–5 process spawns per issue. Reads should be batch-shaped: one guard check and one permission assertion per call. |
| F6 | Any typed write runs `invalidateAll()` and sets a "re-read the affected task" recovery cue (`host.ts:279, 288`). Any non-Beads tool error invalidates prime and injects a "A tool failed…" cue (`host.ts:350-355`). | `host.ts` | In code-mode-heavy work, every checkpoint or claim triggers a guard and prime re-run for every session at that location. The cue also tells the model to re-read its own just-acknowledged write. Every failing test command injects a generic cue. That is repeated reasoning and process work with no information gained. |
| F7 | Typed writes use a derived `opencode:<agent>:<hash>` actor (`continuity.ts:34-41`). Guidance and the skill tell the model to use "the actual executor actor… if unavailable, establish it" for shell writes (`guidance.ts:28`, `SKILL.md:45-48`). The model is never told the derived value. | as cited | One executor ends up with two identities: a typed claim as `opencode:build:…`, then shell heartbeats or notes under a model-chosen actor. That breaks the "keep the actor through updates" policy. |
| F8 | Always-on text: full `bd prime --full` (which can include memories) plus 7,758 B of guidance for primary agents and 4,421 B for task agents, on every eligible request. The task agent gets the executor section twice (prompt `guidance.ts:66` plus injected `:84`). The host guidance says "There is no native `bd`… Run `bd` through the `shell` tool" (`:36`). Commands say "no assumed MCP tool or typed tool" (`workflows.ts:99`). | as cited; byte counts from `bridge-results.json` | Once typed tools are active, the always-on guidance contradicts the real capability. The duplication costs bytes on every request. The context hook can see the request's tool set (`event.tools`, as shell's own hook does at `shell.ts:285`), so the capability statement can be made truthful per request. |
| F9 | The five tools have no output schema, so the executor fails, and the catalog shows `Promise<string\|null>`. | shape-review reproduction; `bridge-results.json` | Our defect, still unfixed and withheld. It is a prerequisite for everything below. |

## 2. Alternatives considered (choosing one)

| Shape | Verdict |
|---|---|
| **A. Five continuity tools + one query (Sol)** | Rejected as the target. Given F1, claim, close, create and status changes can't be composed. "Start authorized work → read back → checkpoint → close or hand off" has to be split across model turns, which defeats the point of code mode. |
| **B. One wrapper per CLI verb (~29)** | Rejected. Catalog and maintenance cost scale with verbs that are rare, administrative or human-directed. Code mode adds nothing to `init`, `rename-prefix` or `import`. |
| **C. Generic `beads.cli({args})` passthrough** | Rejected for daily use. The output can't be declared (`Promise<unknown>`). The plugin can't tell writes from reads, so acknowledgement, invalidation and `uncertain` reporting become guesswork. The actor would have to be parsed out of arguments, which invites impersonation. Justified later only as a read-only, allow-listed `--json` escape hatch, and only if evaluation shows models need advanced or admin reads inside programs. Deferrable. |
| **D. Workflow macros (`beads.start`, `beads.handoff`)** | Rejected. They encode scope and acceptance judgment in plugin code. The one exception is folding a pure invariant into an operation: claim readback (D2 below). |
| **E. Typed daily-loop API in one namespace (recommended)** | About 11 operations, each with a discriminated, declared output and a fixed argv. Each exists because code mode gains something specific from it: fields for programmatic decisions, truthful per-operation outcomes, actor injection, or a single acknowledgement site. |

## 3. Target design

### Ownership layers

| Layer | Owns |
|---|---|
| **Beads CLI** | Database, routing, consistency, atomic claim, ID generation, readiness semantics |
| **Host (OpenCode)** | Code-mode runtime, catalog and search, per-call permission, cancellation, compaction, child transport, trace storage |
| **Plugin primitives** | Fixed argv, guard and location checks, permission assertion, derived actor, output normalisation, completeness, acknowledgement and invalidation |
| **Model-authored JavaScript** | Filtering, joins, adjacency checks, projection, ordering of dependent writes, bounded concurrent reads |
| **Model or user judgment** | Relevance, scope, whether to claim, whether acceptance is met, closure authority, what to remember |

### Proposed operations

These are **proposed contracts, not available today.** Flags not marked "AGENTS.md-documented" are unverified on 1.3.0/1.3.1.

**Reads** (no actor, no invalidation):
- `beads.find({view: "ready"|"list"|"search"|"blocked", parent?, assignee?, status?, labels?, text?, limit≤50})`
  - Returns `{status:"acknowledged", view, records:[{id,title,status,priority,type,assignee}], complete}` or `failed`.
  - Fetches `limit+1` so `complete` is exact for that view's own CLI filters.
- `beads.get({ids: string[] (≤25)})`
  - Returns `{status:"acknowledged", issues:{[id]: issue}, failed:[{id,detail}]}`.
  - One guard check and one assertion per call. Uses a multi-ID `bd show` if 1.3.0 supports it, otherwise sequential spawns inside the call.
  - Per-ID failure is never relabelled as "missing".
- `beads.edges({id, direction:"down"|"up", types?})`
  - Direct relations with `dependency_type`; capped after normalisation, so `complete` is exact.
- `beads.memories({search?})` / `beads.recall({key})`
  - Current semantics: `found` / `missing` / `failed`, with empty-found distinct from missing.

**Writes** (derived actor, sole acknowledgement; each call asserts its own canonical shell resource with `save: []`):
- `beads.claim({id})`
  - `acknowledged` only when the CLI's returned record shows `assignee === actor`.
  - `not-claimed` (with the returned assignee and status) when the CLI returned a record showing someone else.
  - `uncertain` (with target) on any ambiguous failure.
  - Claim uses `bd update --claim --json` (AGENTS.md-documented).
- `beads.note({id, text})` — append checkpoint, as today.
- `beads.update({id, set:{status?, priority?, addLabels?, removeLabels?}})`
  - Notes replacement and description rewrites stay in shell as deliberate edits.
- `beads.close({id, reason})` — `bd close --reason` (AGENTS.md-documented); acknowledged from the returned status.
- `beads.create({title, type, priority, description?, acceptance?, design?, parent?, discoveredFrom?, labels?})`
  - `--deps discovered-from:` is AGENTS.md-documented.
  - An `uncertain` create says to search before retrying, because blind retry risks a duplicate.
- `beads.remember({key, text})` — as today: `acknowledged` / `landed-uncommitted` / `uncertain`.

Every write result carries `{operation, status, target, actor}`. No operation takes an actor input.

**Implementation shape:** keep the existing runner, guard, permission and acknowledgement pipeline from `continuity.ts`. Replace the `inputFor` / `operationArgs` / `acknowledge` ternaries with one table of about 11 entries: input JSON Schema, output JSON Schema, argv builder, normaliser, read/write kind. That is a table, not a framework. The plugin enforces branch invariants itself, because the host only checks JSON-ness for raw schemas.

**Registration:** code-mode-only (default), namespace `beads` with a short description, none pinned at first. `oc-beads:status` reports whether typed operations are registered and whether `execute` is visible for the session's agent. Agents without `execute` follow the shell fallback.

**Actor:** the derived host actor becomes the single executor identity for OpenCode sessions.
- It is rendered into injected context per session and agent ("Your Beads executor actor: `opencode:build:3f…`; use it for any shell write").
- It is returned on every typed write.
- Child sessions get their own derived actor, which matches "the executing worker claims its own work".
- Owner decision D2.

**Context:**
- Keep prime injection unchanged for now.
- Restructure guidance into:
  - a short always-on core: authority, missing/failed/withheld context, honest persistence;
  - a capability block chosen from the request's actual tool set ("`beads.*` available in code mode; use `search({namespace:"beads"})`", or "use `bd` via shell");
  - on-demand material: a new `resources/CODE_MODE.md`, and existing delegation, planning and review policy.
- Remove the duplicated task-agent sections.

**Invalidation:**
- Refresh prime on `remember` (prime can contain memories) and on external events.
- Don't refresh on note, claim, close or update, unless measured prime content turns out to depend on issue state (unverified).
- Emit the recovery cue only for non-acknowledged outcomes and child returns, not for the model's own acknowledged writes or every ordinary tool error.
- References become operation-aware (`task:` for issue operations, `memory:` for memory operations).

## 4. What stays, what changes, what goes

| Mechanism | Disposition |
|---|---|
| `prime.ts` runner, abort, timeout | **Keep**. Optional: a stdout byte cap. |
| `guard.ts` migration and store guard | **Keep**; run once per batch read. |
| `continuity.ts` pipeline (location, external-dir, permission, abort, actor, sole acknowledgement) | **Keep the core**. **Replace** the five flat tools with the namespaced operation table and declared outputs (fixes F9). |
| `host.ts` lifecycle, disposal, compaction references, event observer | **Keep**. **Change** `rememberResult` invalidation and cues (F6) and the `execute.after` generic error cue. Status adds typed-registration and `execute` visibility. Production activation still gated on 1.1. |
| `context.ts` cache, audience, prime policy | **Keep the mechanism**. Its render step gets the capability block and actor line, so the cache key must include the agent when the actor is rendered. |
| `guidance.ts` | **Restructure** (F7, F8): remove the "no native `bd`" and "no typed tool" claims; deduplicate; move this repo's planning/review-ticket policy (`:32`) out of always-on product guidance into a resource (D4). |
| `workflows.ts` 30 commands | **Keep all names**: they're the human entry points, user overrides depend on them, and they cost nothing until invoked. **Rewrite the shared text** (`:99`) to be capability-neutral. Daily commands (ready, show, list, blocked, workflow, update, close, create, comments, dep) say "compose with `beads.*` in code mode when present". Admin commands keep shell plus `--help`. Nothing removed; no human writes JS. |
| `oc-beads` skill and resources | **Change**: add `CODE_MODE.md` (status handling, ordered writes, bounded reads, projection, decline/Stop semantics, pointer to catalog search instead of copied signatures). The link count rises 16 → 17, which needs the hard-coded `16` at `workflows.ts:63` updated. Upstream `.agents/skills/beads` untouched. |
| `agents.ts` task agents and permission asks | **Keep**. Prompt deduplicated; mentions the namespace. |
| `instructions.ts` duplicate-block minimiser | **Keep**. |
| Sol's six-tool and namespace proposal | **Replaced** by section 3. Its output-schema, namespace, completeness and no-retry findings carry over. |

## 5. Representative workflows

These are **proposed signatures, not qualified behaviour.** Each block is one `execute` program; the gaps between programs are model or user decisions.

**A. Discovery and graph triage (read-only; no claim):**
```js
const f = await tools.beads.find({view: "ready", parent: "EPIC", limit: 20});
if (f.status !== "acknowledged") return {failed: f.detail};
const ids = f.records.map(r => r.id).slice(0, 8);            // bounded fan-out
const edges = await Promise.allSettled(ids.map(id => tools.beads.edges({id, direction: "down", types: ["blocks"]})));
return {complete: f.complete, candidates: f.records.slice(0, 8).map((r, i) => {
  const e = edges[i];
  if (e.status === "rejected" || e.value.status !== "acknowledged") return {...r, blockers: "unknown"};
  const open = e.value.records.filter(d => d.status !== "closed").map(d => d.id);
  return {...r, openBlockers: open, edgesComplete: e.value.complete};
})};
```
The join and the "all direct blockers closed" check are computation in JavaScript. Choosing a candidate, and whether it is in scope, stays with the model or user. `unknown` is never turned into "unblocked". Ready status gives no dispatch authority.

**B. Authorized execution:**
- **Program 1:**
  ```js
  const g = await tools.beads.get({ids: ["T"]}); const t = g.issues?.T;
  if (!t || t.status === "closed") return {stop: "not actionable", g};
  const c = await tools.beads.claim({id: "T"});
  return {claim: c.status, actor: c.actor, assignee: c.issue?.assignee, acceptance: t.acceptance_criteria, notesTail: t.notes?.slice(-2000)};
  ```
  Anything other than `acknowledged` makes the model stop.
- **Direct shell turns:** implement and run validation (code mode can't do this).
- **Program 2:**
  ```js
  const n = await tools.beads.note({id: "T", text: "<evidence, commands, results, next>"});
  if (n.status !== "acknowledged") return {note: n};
  // Only when the model has judged acceptance met AND closure authority exists:
  const x = await tools.beads.close({id: "T", reason: "<acceptance evidence>"});
  return {note: n.status, close: x.status, detail: x.detail};
  ```
  A follow-up `create({..., discoveredFrom: "T"})` only when authorized. A rejected write throws and stops the dependent writes; don't catch it and continue. Under the accepted limitation, later independent calls still get their own permission check.

**C. Selective recovery:**
- **Program 1:**
  ```js
  const [mine, mem] = await Promise.allSettled([
    tools.beads.find({view: "list", status: "in_progress", assignee: ACTOR, limit: 10}),
    tools.beads.memories({search: "build"})]);
  // return ids/titles and memory KEYS only
  ```
  `ACTOR` is the rendered actor value.
- **Model:** picks the task and the relevant keys.
- **Program 2:** `get` the chosen issue plus `recall` the chosen keys concurrently; return an excerpt of the notes and the recalled values.

## 6. Operational semantics

- **Ordering:** dependent writes are sequential `await`s; there is no write batching, and batching never implies transactions, exactly-once execution or idempotency. Reads are batch-shaped (`get` takes IDs). Program fan-out is bounded by guidance. A small per-location spawn semaphore is an optional bounded-I/O addition, not a scheduler.
- **Authorization:** one assertion per operation with its canonical resource. Existing `bd *` grants apply, denies win, and there is no new saved grant. A three-write program can prompt three times under `ask`, and that is correct.
- **Uncertain outcomes:** the plugin never retries. It returns `uncertain` with the target, and the program or model reads back with `get` before considering another write.
- **Identity:** a single derived actor (D2). The permission agent is still the actual invocation agent.
- **Cancellation:** the combined abort signal stays as it is. Stop/Cancel is still unqualified (.6).
- **Not built:** no queue, poller, graph cache, or state engine.

## 7. Context economy

| Budget | Change |
|---|---|
| Always-on system | Capability-aware and deduplicated guidance; planning/review policy moved on demand. Prime unchanged. |
| Catalog | One namespace summary plus selected signatures under a heuristic 2,000-unit budget. Large unions get trimmed and reached via search. Measure before pinning anything. |
| Generated code | Model-authored; a small extra cost for one-off reads. For a single trivial read, plain shell may be cheaper. |
| Returned output | Projection in JavaScript. Tools return full typed records, since raw data stays in the runtime. |
| Trace storage | Inner inputs, including write text, are kept in `toolCalls`. Not replayed, but not ephemeral. |
| Process cost | Batch reads and targeted invalidation cut spawns (F5, F6). |

Possible regressions:
- Models that ignore the catalog and use shell anyway.
- Agents with `execute` denied.
- Larger union signatures crowding the catalog.

No token savings are claimed. The synthetic 18,432 → 905-byte figure remains fixture bytes only.

Prime policy: measure prime bytes and the size of its memory section in .9. Any lighter prime is a later owner decision (D6), and depends on a supported CLI mode that I have not verified.

## 8. Minimum coherent pre-release slice

1. Operation table with declared outputs and matching input constraints (fixes F9). Namespace registration for the 11 operations. Keep the earlier detail fixes: uncertain results keep their target, and the original detail survives a notification failure.
2. Actor rendered into context and returned by writes.
3. Capability-conditional, deduplicated guidance, plus the `CODE_MODE.md` resource. Rewrite the shared command text. Update the link count.
4. Narrower invalidation and recovery cues; operation-aware references; status reports typed/`execute` visibility.
5. Tests: `continuity` (per-operation argv, normalisation, branches, `limit+1` completeness, claim `not-claimed` / `uncertain`, create-uncertain, no retry), `host` (registration, disposal, IDs, invalidation scope, actor rendering), `guidance` / `workflows` (no false capability claims). `bd-contract`: check every flag used on 1.3.0 and 1.3.1, and drop unsupported filters from the schemas rather than branching on version.

**Independently deferrable:**
- `link` / `dep add`
- `heartbeat`
- description/notes edits
- read-only passthrough (C)
- prime reduction
- spawn semaphore
- pinning
- comments

**Spec and tasks** (the parent maps these; I'm not creating a graph):
- `work-continuity` spec: the typed set becomes the daily-loop API.
- `workflow-access` spec: capability-neutral command text.
- Task 3.1 is checked against the five-operation scope, so the expansion needs either a new task or an explicit re-scope (parent/owner).
- 1.1 adds: namespace path, `execute`-denied visibility, write-operation permission resources.
- 6.2 / .9 adds workflows A–C on the installed host, using actual catalog signatures and recorded bytes.
- 4.2 / .6 adds Stop during a multi-write program, with no later dispatch.

## 9. Owner decisions needed

| # | Decision | My recommendation |
|---|---|---|
| D1 | Adopt the ~11-operation daily-loop API, including lifecycle writes, instead of the six-tool shape | Yes |
| D2 | Derived host actor is the canonical OpenCode executor identity, shown to the model, never model-supplied | Yes |
| D3 | Code-mode-only registration with shell fallback; no direct duplicates | Yes |
| D4 | Restructure always-on guidance; move repo-specific planning/review policy on demand | Yes |
| D5 | Narrower invalidation and cue policy | Yes |
| D6 | Prime policy unchanged until .9 measurement | Yes |
| D7 | Keep all 30 command names; their prompt text changes, and that is a compatibility-visible change | Yes |

## 10. Evidence limits

- Verified by reading source: F1–F8 and the cited lines.
- Not verified:
  - 1.3.0 support for any proposed flag, multi-ID `show`, or the claim-conflict output shape;
  - whether prime content depends on issue state;
  - whether `execute` is enabled for every installed agent and provider;
  - blob IDs for `shell.ts` against `tree.json` (I relied on `tag.json` and agreement between the four cached copies);
  - any installed, model, interpreter or token behaviour.
- No probes were run.

## Readiness

**Ready for an owner design decision.** This is not code or installed-behaviour acceptance.

**Blockers to implementing the design:** owner decisions D1–D3, and the 1.3.0 flag check for each operation (which may shrink the filter sets).

**Remaining unknowns, not blockers:** claim-conflict CLI output, whether prime depends on issue state, catalog fit under the budget, and real model uptake. These are resolved in implementation tests and .9.

## Parent verification and disposition

The decision-changing F1/F2 findings were independently verified against the exact pinned Git-tree blob IDs after the review: `packages/core/src/tool/plugin/shell.ts:195` declares `codemode:false`, and `packages/core/src/tool.ts:236-262` excludes direct-only tools from code-mode inventory and omits code-mode exposure when execute is wholly denied. Both cached files match the pinned complete tree. The earlier claim that ordinary shell provides an in-code-mode CLI fallback was incorrect; shell remains a direct/model-turn fallback only. Sol report and narrow READY are historical and not broader design approval.

The recommendation is ready for owner DESIGN decision, not accepted product implementation. The review itself is complete; investigation and remaining implementation/qualification remain open and paused. The parent recommends the coherent daily-loop direction rather than the six-tool patch. Before implementation contracts are finalized, verify supported CLI inputs/outputs, including claim/conflict evidence, multi-ID reads and flags. Do not silently weaken post-approval/pre-spawn guard, location, identity and abort rechecks while optimizing batched reads. Narrowing invalidation also requires confirming whether selected prime output depends on issue state. These are bounded correctness checks, not authority for a new infrastructure or test project.

No task markers, source, assets, provider/runtime configuration, upstream posts, publication, release or activation changed. Proposed additional resources/commands/tool shapes and context policy require owner selection and active-spec/task reconciliation before implementation.
