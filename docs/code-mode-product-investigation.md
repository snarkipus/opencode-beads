# Code-mode product investigation

2026-10-21 · `opencode-beads-wgv` · executor `codex:oc-codemode` · parent owns acceptance and closure.

## Recommended decision

Keep composition and make one bounded pre-release improvement: publish correctly declared, discriminated results for the five continuity operations, group them using the host's native `beads` namespace, and add **one read-only `query` operation** for ready/list/direct-dependency inspection. Keep the existing 30 commands, shared adapted Beads skill and permissioned native shell. This gives broad work discovery, graph triage and selective recovery a useful structured path without wrapping every CLI verb or building a workflow engine. Implementation requires separate parent dispatch; this investigation changes no product behavior.

Accept the owner-selected OpenCode 2.1.1 limitation explicitly: a plain decline must prevent that operation from executing, but code mode can report an outer completed/error envelope and continue independently permissioned calls or model steps. Preserve the historical failed stronger guarantee as failed evidence with an accepted limitation. Later operations retain their own permission checks. Explicit Stop/Cancel remains separately unqualified and required; it is not covered by accepting plain-decline continuation.

## Evidence and boundaries

Product baseline: `072429f1a7723ade23e756a921924d9d0acacf31`. Host: exact OpenCode 2.1.1 source `ba546ec1598a70db2570e9c6258028d955ba8f58`. Local Beads help identifies 1.3.1, commit `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`; package minimum remains 1.3.0. Current help is evidence for 1.3.1 syntax, not certification of every flag on the minimum version.

Read `AGENTS.md`, the Beads skill, `bd --sandbox prime`, and the exact investigation Bead before claiming. Claim used `bd --actor codex:oc-codemode --sandbox update opencode-beads-wgv --claim --json`; readback confirmed `in_progress`, assignee `codex:oc-codemode`, original `created_by: snarkimedes`, and no reported owner. Only this Bead is writable by this worker. Existing dirty documents and concurrent parent OpenSpec edits were left untouched.

Primary source links below identify immutable host files. Their cached bytes were checked against Git blob IDs in `/opt/data/cache/scratch/opencode-v2-test-gap-assessment/tree.json`. In particular, the cached `minimum/` copies of catalog/instructions match the exact 2.1.1 tree despite that directory's name. Existing installed-host decline evidence in [opencode-host-qualification-vuy2.md](opencode-host-qualification-vuy2.md) is prior evidence, not a host run performed here; its historical disposition may be reconciled by the parent.

Two isolated probes used installed dependencies and the cached baseline Bun 1.3.14. CLI, permission and session dependencies were fixtures. No host startup, external model/provider request, dependency installation, real fixture database write, operator change, source fix, staging, publication or closure occurred.

## Complete registration and result path

1. `src/host.ts` admits the supported host range and owns scoped registrations/cleanup. Ordinary setup **withholds** continuity tools; only the internal `continuityQualified` seam registers `createContinuityTools(...)` through `ctx.tool.transform(editor.add)`. Therefore this defect is not evidence of currently activated operator tools failing.
2. The [Promise tool interface](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/plugin/src/promise/tool.ts) carries `input`, optional `output`, options and Promise execution. The [Promise adapter](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/plugin/src/promise/adapter.ts#L477-L510) spreads the definition into the Effect editor, wraps execution with `Effect.tryPromise`, and supplies execution signal/progress. It does not infer output schemas from returned values or TypeScript interfaces.
3. The [host registry and snapshot](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/tool.ts#L156-L340) validates registrations, applies transforms and coarse permission visibility, and splits direct tools (`codemode: false`) from code-mode tools (default). These five definitions default to code mode. A whole `shell` deny can remove them because they declare `options.permission: "shell"`; this visibility filter does not replace invocation authorization. The snapshot exposes `execute` plus direct-tool definitions and a separate code-mode inventory.
4. [Code-mode construction](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/codemode/tool.ts#L236-L271) converts each host definition into a callable and uses its declared output schema, falling back to `string | null` when absent. Catalog and execution use the same immutable inventory. Native paths derive from `options.namespace` plus normalized name.
5. Each inner call goes back through host `execute.before`, the actual [tool executor](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/tool/runtime.ts#L21-L61), and applicable `execute.after`. The plugin checks actual session location, guard, external-directory permission where needed, exact canonical shell resource, abort and location again before spawning. Write actor comes from actual host session/agent identity, never model input; `--sandbox` suppresses auto-push and is not confinement. Beads owns routing/database semantics.
6. The host executor checks/encodes declared output **after** the implementation has run. Effect/Standard schemas validate their shape; raw JSON output schemas only trigger a JSON-value check, not branch validation. `src/continuity.ts` acknowledges writes and invalidates context inside the executor, once, before returning. An outer output-contract failure can therefore follow a real CLI mutation; it cannot justify retrying that mutation. The existing `host.ts` exclusion for outer `execute` and inner `beads_*` events correctly prevents duplicate write acknowledgement.
7. The [code-mode bridge](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/codemode/tool.ts#L89-L150) gives JavaScript declared structured `output` when present, otherwise joined text/null. It returns the program's selected result, warnings/logs, files and per-call trace information in the outer result. Direct tool consumers receive readable `content`; [model replay](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/session/runner/to-llm-message.ts#L121-L151) uses completed-tool content. Supplying only structured output and an unreadable direct rendering would underserve the direct path.

### Demonstrated defect and adjacent concrete gaps

All five definitions (`src/continuity.ts:138–223`) omit `output` and return `{ output: result, content: JSON.stringify(result) }`. The pinned executor dies with `Tool result declared output without an output schema`. Direct-definition tests in `tests/continuity.test.ts` bypass this boundary.

Re-ran `/opt/data/cache/scratch/opencode-codemode-shape-review/check-output-contract.ts`: exit 0; two harmless fixture reads; as-built definition **Failure** with that exact cause; diagnostic copied definition declaring `{type: "object"}` **Success**. The object-only control is not a production contract: it advertises `{}` and does not describe usable branches or payload fields.

The new catalog/result-bridge probe also demonstrates the misleading current signature: `tools.beads_show({id: string}): Promise<string | null>`. A diagnostic discriminated schema produces a discoverable object union and works through the pinned result executor. This is the same root defect in discovery as well as execution, not a second upstream bug. A further diagnostic copied definition returning an undeclared status branch is accepted under a raw JSON output schema: pinned `encodeOutput` checks only JSON-ness in that case, and the code-mode schema bridge treats raw JSON schemas as render-only. This is a concrete enforcement distinction, not a claim that the host promises full raw-schema validation. Our adapter must enforce the outcomes it advertises.

Other bounded improvements justified by source inspection:

- `ContinuityResult` is one permissive interface with optional payload fields. It allows impossible combinations and does not tell code which data exists after checking status. Use operation-specific discriminated unions and runtime output declarations.
- Input declarations advertise arbitrary strings while `inputFor` additionally enforces nonempty text, a 64,000-character cap, no NUL, and token syntax for IDs/keys. Reflect these constraints and useful field descriptions in schemas so discovery does not invite predictable rejected calls.
- A post-spawn uncertain write currently lacks `reference`, although its requested issue/key is known. Include that target as a recovery reference without claiming persistence. The host currently cannot retain that reference when the uncertain result omits it.
- If acknowledgement notification throws, line 221 replaces `detail`; retain the original failure/uncertainty detail and append the notification problem. This is a diagnostic-loss path visible in code, not a demonstrated normal production outage.

No additional upstream executor defect was established here. In particular, do not infer new routing/confinement failures or repair speculative CLI behavior.

## Contract and discovery shape

Use the host's existing namespace mechanism: definitions named `show`, `checkpoint`, etc. with `options.namespace: "beads"` and the existing shell permission option. This preserves effective host IDs such as `beads_show` while catalog paths become `tools.beads.show`. Register a short namespace description through `editor.namespace`. Do not retain duplicate flat catalog aliases or pin every large signature inline.

The pinned [catalog](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/codemode/catalog.ts) uses a default 2,000-unit inline budget based on a four-characters-per-token heuristic, keeps namespace summaries visible and selects signatures within the budget. This is not a tokenizer measurement. The [native search](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/codemode/src/tool-runtime.ts#L89-L107) is synchronous inside code mode:

```ts
search({ query?: string, namespace?: string, limit?: number, offset?: number })
// => { items: [{path, description, signature}], remaining, next: {offset} | null }
```

Default limit is 10; positive limits and nonnegative offsets are supported. Ranking uses paths, descriptions, namespace descriptions and input-property information; it is tool discovery, not Beads issue/memory search. [Instructions](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/codemode/instructions.ts) support partial catalogs and subsequent catalog changes. No new registry/search service is needed.

Keep the five input shapes, with proposed namespaced paths:

```ts
tools.beads.show({id: string})
tools.beads.checkpoint({id: string, text: string})
tools.beads.memories({search?: string})
tools.beads.recall({key: string})
tools.beads.remember({key: string, text: string})
```

These namespaced paths are **proposed**; current definitions are flat `tools.beads_show`, etc., and ordinary setup withholds them. The existing input shapes were verified from product source, not guessed from a future API. Each call takes one input object and returns a Promise. Always use paths/signatures actually supplied by catalog/search.

Declare result branches separately, retaining current persistence meanings:

| Operation | Structured branches and required information |
| --- | --- |
| show | `acknowledged` with operation, reference and issue data; `failed` with operation/detail. Do not reinterpret arbitrary CLI failure as missing. |
| memories | `acknowledged` with operation and string-value map; `failed` with detail. Empty map means successful no matches. |
| recall | `found` with reference/value, including `value: ""`; `missing` with reference; `failed` with detail. Only supported CLI evidence establishes missing. |
| checkpoint | `acknowledged` with target and acknowledged issue; `uncertain` with target/detail after an ambiguous execution. Appending is not idempotent. |
| remember | `acknowledged` with key and CLI acknowledgement; `landed-uncommitted` with key, commit qualification and CLI evidence; `uncertain` with target/detail. Replacing one key is not a transactional handoff. |

Use literal `operation` and `status` in each schema branch (`anyOf`/equivalent union), with required fields for that branch. Keep strict envelopes and compatible extra CLI fields under `data`; describe stable issue fields for projection, leaving absent fields absent. Do not force a complete upstream issue schema into every catalog signature. A TypeScript union alone does not declare host output. For the smallest delta, declare raw JSON output schemas and enforce their branch invariants in the existing acknowledgement/result construction and focused contract tests; do not assume the host validates raw output against those schemas or introduce a general validation framework. Return concise readable content from the same result, retaining status/reference/detail; code mode consumes the structured branch and need not parse that rendering.

Permission rejection, guard hold, invalid input, and cancellation before spawn remain thrown host failures/interruptions; do not fabricate an acknowledged or ordinary `denied` persistence result. Promise fulfillment, outer tool completion and trace `completed` each differ from durable success: an `uncertain` result can fulfill normally. Return evidence and inspect state before considering a further write; no automatic retry.

## Broad workflow coverage and the one added read operation

Five tools plus native shell are functionally sufficient: [native shell](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/src/tool/plugin/shell.ts#L31-L100) exposes `command`, optional `workdir`, `timeout`, `background`, and structured `output`, `exit`, `signal`, `truncated`, optional timeout/status/shell ID. Code can check completion and parse JSON outside model context. However, repeated shell-string construction, quoting, process-status checks and CLI JSON normalization are unnecessary model work for common read discovery. The five tools currently cover continuity well and leave broad work/graph discovery less convenient.

Propose one additional callable, not a command-per-tool mapping:

```ts
type QueryInput =
  | {view: "ready", assignee?: string, parent?: string, limit?: number}
  | {view: "list", status?: string, assignee?: string, parent?: string, limit?: number}
  | {view: "dependencies", id: string, direction?: "down" | "up", type?: string, limit?: number};
// tools.beads.query(input: QueryInput): Promise<QueryResult>
// Proposed QueryResult:
// {operation:"query", status:"acknowledged", view, records, complete:boolean}
// | {operation:"query", status:"failed", view, detail:string}
```

Use a default limit of 20 and a documented positive cap of 50; fixed argv, no arbitrary command/flags, no claims or automatic traversal. Ready/list records project ID, title, status, priority and available assignee; dependency records additionally retain input root, direction and CLI `dependency_type`. Preserve provenance relations such as `discovered-from` separately from scheduling blockers. Do not recompute readiness from an incomplete graph.

Map to supported `bd ready --json --limit ...`, `bd list --json --limit ...`, and `bd dep list <id> --direction ... --type ... --json` forms under the same guard/cwd/permission/cancellation boundary. `dep list` returns hydrated related issues with relation type (observed read-only for this investigation's Bead), not an invented `{from,to}` edge API. For dependencies cap the normalized return, mark incomplete when records were omitted, and offer narrower relation selection or normal CLI for the remainder. For list/ready do not claim exhaustive completeness merely because a limited response succeeded; a full cap is conservatively incomplete. Do not invent a cross-backend pagination cursor; current help limits `--offset` to proxied-server routes. Avoid depending on `--brief` until minimum-version support is checked; projection can occur after supported JSON reads.

| Product workflow | Recommended route and benefit |
| --- | --- |
| Ready work, assigned work, issue search | Query ready/list for concise candidates; exact assignment still wins. Native shell `bd search` and less common filters remain available. Catalog search does not search issue text. |
| Task hydration and dependency graph triage | Show only selected IDs; query direct dependencies/dependents with relation types. Compose bounded adjacency views; use native CLI for tree/whole-graph output. No graph cache or local scheduler. |
| Selective knowledge recovery | Search memories by relevant term, return candidate keys; recall only chosen keys. Do not eagerly hydrate every memory. A known key can be recalled alongside its task. |
| Checkpoint/handoff | Ordered checkpoint and optional justified memory update; return each outcome/reference. Assignment transfer uses a separately authorized atomic CLI update, not implicit tool composition. |
| Wider Beads product | Keep formula, admin, search, lifecycle and advanced CLI operations behind current permissions and current CLI help. Native commands invoke model workflows; callable tools provide structured primitives; the shared skill supplies judgment, authority and supporting resources. |

Retain all 29 workflow commands plus status in `src/workflows.ts`, their native precedence and the package-owned shared skill. A command executes `session.prompt`; it is not automatically a callable code-mode function. Keep upstream-derived guidance and its 16 explicit resource/ADR links. Add a small project-owned code-mode guidance layer instead of replacing that material with static CLI wrappers or duplicating all command syntax.

## Representative compositions

These are design sketches for a separately implemented/qualified namespaced contract, not calls run here. IDs, keys and write content must already be selected within authorized scope. Discovery itself is supported today inside code mode:

```js
// Current ungrouped catalog: search by term, not namespace "beads".
return search({query: "beads", limit: 6});
// After proposed grouping: search({namespace: "beads", query: "show", limit: 1})
// Read returned path/signature before calling it; follow next.offset when needed.
```

Known-task recovery with one relevant known memory can overlap independent reads. Do not return raw issue history or all memory values:

```js
const reads = await Promise.allSettled([
  tools.beads.show({id: "assigned-task"}),
  tools.beads.recall({key: "chosen-build-lesson"})
]);
return reads.map((r, i) => {
  if (r.status === "rejected")
    return {read: i, outcome: "rejected", detail: String(r.reason)};
  const x = r.value;
  if (x.operation === "show" && x.status === "acknowledged")
    return {read: i, status: x.status, reference: x.reference,
      task: {title: x.data.title, status: x.data.status,
        acceptance: x.data.acceptance_criteria, notes: x.data.notes}};
  if (x.operation === "recall" && x.status === "found")
    return {read: i, status: x.status, reference: x.reference, value: x.value};
  return {read: i, status: x.status, reference: x.reference, detail: x.detail};
});
```

Select notes/excerpts according to the recovery question; if notes are long, return an explicitly labelled excerpt and omitted-length indicator or relevant validated structure, then hydrate further as needed. Do not silently discard failed attempts or acceptance blockers. For unknown keys, first use `memories({search: "relevant term"})` and return `Object.keys(result.data)` only on `acknowledged`; let the model choose relevance before recall. This keeps search values out of the prompt even though this CLI operation returns them to the runtime.

Graph triage separates candidate discovery from judgment. A first `query({view:"ready",parent:"authorized-epic",limit:10})` returns candidate summaries/completeness; readiness supplies no dispatch authority. After choosing a candidate within existing authority, inspect it and its direct blockers concurrently:

```js
const reads = await Promise.allSettled([
  tools.beads.show({id: "chosen-task"}),
  tools.beads.query({view: "dependencies", id: "chosen-task",
    direction: "down", type: "blocks", limit: 20})
]);
return reads.map((r, i) => {
  if (r.status === "rejected") return {read: i, outcome: "rejected", detail: String(r.reason)};
  const x = r.value;
  if (x.operation === "query" && x.status === "acknowledged")
    return {read: i, status: x.status, view: x.view,
      complete: x.complete, records: x.records};
  if (x.operation === "show" && x.status === "acknowledged")
    return {read: i, status: x.status, reference: x.reference,
      acceptance: x.data.acceptance_criteria, notes: x.data.notes};
  return {read: i, status: x.status, detail: x.detail};
});
```

Do not turn an incomplete/failed dependency read into “unblocked.” Direct queries do not promise a graph snapshot across concurrent writers. Hydrate further only when needed; do not recursively dump the graph into logs.

Ordered persistence uses explicit status checks. This example assumes both writes were already authorized and the reusable finding already validated and reconciled against its existing key:

```js
const checkpoint = await tools.beads.checkpoint({
  id: "assigned-task", text: "Measured outcome; evidence path; blocker; next authorized action."
});
const first = {operation: checkpoint.operation, status: checkpoint.status,
  reference: checkpoint.reference, detail: checkpoint.detail};
if (checkpoint.status !== "acknowledged")
  return {checkpoint: first, memory: {status: "not-attempted"}};
const memory = await tools.beads.remember({
  key: "validated-lesson", text: "Validated reusable finding, scope and evidence."
});
return {checkpoint: first, memory: {operation: memory.operation,
  status: memory.status, reference: memory.reference,
  commitIndeterminate: memory.commitIndeterminate, detail: memory.detail}};
```

An exception interrupts this sketch before dependent work; do not catch it and manufacture success. A landed-uncommitted or uncertain memory retains its qualification even after a successful checkpoint. No rollback, exactly-once guarantee or automatic retry is implied. Many handoffs need only a checkpoint and concise return, with no reusable-memory write.

Atomicity belongs to the individual supported CLI operation. Authorized claiming still uses `bd update <id> --claim --actor <actual-executor-actor> --sandbox --json`, followed by separate assignee/status readback. Native `tools.shell({command, workdir, ...})` is the verified shell signature; inspect its exit/timeout/truncation before parsing JSON. Use command-scoped actor attribution on every shell write. The typed write adapter derives its actor from host identity; do not add a model-controlled actor argument to these tools. Parent review does not transfer ownership.

Batching reduces model round trips; it does not make two writes atomic or idempotent. Never put dependent writes in `Promise.all`. Limit concurrent work to bounded independent reads, await all calls whose completion matters, and inspect every settled result. The host warns that pending calls are interrupted when an execution ends.

The model still decides relevance, task scope, acceptance sufficiency and whether a finding is reusable. Those decisions cannot be encoded as “if ready, claim/close.” Permissions remain per operation, including later calls following a decline. On rejection, dependent work must stop; independently authorized work may continue under the accepted host limitation. Do not add a plugin decline translator, retry loop or claim that prompt guidance guarantees whole-turn termination. Explicit Stop/Cancel must prevent later dispatch/resumption through the separately measured cancellation path, including child/handoff and late-result behavior. No final checkpoint is promised after Stop, unload or compaction.

## Context efficiency and measured limits

The benefit is selective return: raw CLI JSON, unrelated graph nodes, full memory maps and intermediate joins can remain in runtime values instead of the next model request. Native shell JSON parsing can already do this; typed reads improve reliable use and discoverability rather than uniquely enabling it. Small one-off reads may cost more catalog/code than they save. No real token, latency, quality or intervention savings were established.

Scratch `/opt/data/cache/scratch/opencode-codemode-product-wgv/bridge-probe.ts` uses Git-blob-verified copies of the actual pinned catalog/result bridge (`tool-runtime`, schema rendering, tool, namespace, tool-error) and actual product show plus pinned host output executor. It exercises native search and eight independent fixture reads. A diagnostic union/namespace is a copied definition only. Results in `bridge-results.json`:

| Measurement | Result |
| --- | --- |
| As-built catalog return | `Promise<string | null>` |
| Diagnostic catalog/search return | Structured `acknowledged`/`failed` union at `tools.beads.show` |
| Eight verbose fixture results, summed compact JSON bytes | 18,432 |
| Eight projected summaries, compact JSON bytes | 905 |
| Bridge call records | 9: one search plus eight reads |
| Logs | 0 |
| Current primary / task-agent injected guidance bytes | 7,758 / 4,421, excluding prime and task-agent prompt |

These are synthetic UTF-8 byte counts, not tokens or product savings. The comparison excludes generated program text, catalog/signatures, outer formatting, permission interaction, trace storage and provider replay overhead; the fixture deliberately contains irrelevant long history. Projection runs in the scratch driver using the actual bridge, **not the confined interpreter or an installed host**. A full pinned interpreter comparison was not pursued: three required stdlib files were not available at matching blob IDs in the inspected caches. No dependencies were installed and no mismatched-source run was substituted.

Budget accounting must include:

- Catalog namespace summaries, selected signatures, search results, and generated code. Large unions cost context; keep fields and descriptions informative and bounded. Native catalog budget is heuristic, not a guaranteed provider token ceiling.
- Outer `execute` text includes returned value, warnings and **logs**. Returning raw results or logging them defeats projection. Files can also escape as collected result parts; do not use attachments as an accidental raw-dump path.
- Host `toolCalls` retains per-call name/status and nonempty input objects in progress/output metadata. The program itself and write text are model-authored input. Do not claim intermediates or sensitive input are never retained. Ordinary replay uses content rather than dumping every metadata field, but storage/traces and model-visible context are different budgets.
- `src/context.ts` injects full guarded prime plus shared guidance on eligible model requests. Caching avoids subprocess work and stabilizes repeated text; it does not remove that text from the request. Full prime can itself include memory content. Code-mode selection therefore does not eliminate the existing eager prime/memory budget.
- `src/host.ts` keeps bounded durable references and recovery cues, invalidates after writes/events, and contributes compaction references. A summary is not a persistence acknowledgement. Preserve these semantics and native replay metadata.

Do not change full-prime policy or cache freshness during this pre-release delta. Record current injected bytes separately in the existing acceptance exercise; reducing that policy needs its own evidence and owner decision.

## Smallest implementation handoff and acceptance additions

Priority is correctness first, then the single broad read improvement in the same separately authorized candidate. Avoid a new certification campaign or tracking graph.

| Priority | Named source/test/guidance delta | Acceptance evidence |
| --- | --- | --- |
| P0 | `src/continuity.ts`: real per-operation output schemas/unions; matching input constraints; preserve readable content, uncertain targets and original diagnostic detail. Keep existing guard, permission identity, actor, cancellation and sole acknowledgement boundary. | Deterministic status/payload/schema cases in `tests/continuity.test.ts`; execute real registered definitions through pinned host output validation in the existing host qualification harness. Include one write acknowledgement followed by result delivery: no duplicate write/notification or blind retry. Do not vendor an upstream executor into product tests or add a runtime host dependency merely to duplicate it. |
| P1 | `src/continuity.ts`: one bounded `query` definition using the same fixed-argv invocation boundary; no generic runner API, recursive graph manager or writes. `src/host.ts`: namespace metadata and existing gated registration for six tools; preserve effective IDs, lifecycle and outer-result exclusion. | Query view argv/normalization, relation direction/type, caps/incompleteness, read failure, guard/denial/abort cases in `tests/continuity.test.ts`; registration/disposal/visibility in `tests/host.test.ts`. Extend `scripts/bd-contract.ts` only for the newly used supported read shapes, in its disposable repositories and with explicit authority. Check minimum 1.3.0 flag support before depending on 1.3.1-only options. |
| P1 | `src/guidance.ts`: short discovery, structured-status, projection, independent-read/ordered-write guidance, and accurate accepted plain-decline limitation. `src/workflows.ts`: command common guidance can refer to actually registered tools, keeping shell/help fallback and all 30 commands. Keep shared `assets/oc-beads` skill/resources; reconcile any contradictory unconditional stop language precisely, without rewriting upstream-derived workflows. | Focused `tests/guidance.test.ts`, `tests/workflows.test.ts`, `tests/host.test.ts` assertions that preserve actor/authority, missing versus failed, uncertain writes and no retry. Guidance must not claim typed tools are available before registration or that decline guarantees whole-turn Stop. |

Reuse `.9` installed/model acceptance (task 6.2) for one representative ready/graph triage, selective recovery and ordered handoff using the actual installed catalog, signatures and host executor. Capture current versus selected return/context bytes with correctness and completeness observations, not an invented savings target. Reuse existing restricted-agent, permission, lifecycle/unload/reactivate cases to cover the added read tool and renamed catalog paths. This probe has not passed those gates.

Reuse `.6` cancellation/handoff work (task 4.2) for explicit Stop/Cancel during a nested permission wait and in-flight operation, no later dispatch or stopped-parent restart, and recovery from earlier acknowledged records. Reconcile the existing plain-decline case under the accepted limitation: rejected target absent, no plugin retry, later calls independently permissioned, original stronger case remains a historical failure. Keep provider/model/reasoning/install provenance and actual actor separate from author/owner/assignee evidence. Parent maps these additions into existing acceptance and decides when to resume; source readiness is not dispatch permission.

Defer write wrappers for claim/close/dependencies/admin, arbitrary CLI passthrough tools, bulk transactions/idempotency machinery, persistent graph caches, automatic semantic memory extraction, prime-policy reduction, general benchmarks, upstream patches and new multi-agent automation. Native shell plus the preserved skill/commands covers the wider Beads product without making those additions prerequisites.

**Decision needed:** parent acceptance of this six-tool, schema-first direction and a separately bounded implementation dispatch. The owner has already accepted plain-decline continuation; do not ask for that decision again. Activation, outstanding installed/model and Stop/Cancel qualification, release and tracker closure remain separately owned.

## Reproduction commands and disposition

Executed successfully using command-scoped baseline Bun PATH:

```sh
PATH=/opt/data/.npm/_npx/60c3515df86f25b1/node_modules/@oven/bun-linux-x64-baseline/bin:$PATH \
  bun /opt/data/cache/scratch/opencode-codemode-shape-review/check-output-contract.ts
PATH=/opt/data/.npm/_npx/60c3515df86f25b1/node_modules/@oven/bun-linux-x64-baseline/bin:$PATH \
  bun /opt/data/cache/scratch/opencode-codemode-product-wgv/bridge-probe.ts
```

Additional read-only checks: Git HEAD/status, local source inspection, blob-ID verification against the pinned tree, `bd --sandbox version --json`, current ready/list/dep help and this Bead's direct dependency response. Initial bridge execution failed on a missing scratch `tool-error` module; adding its blob-verified copy resolved it. The added raw-output control initially omitted the required fixture ID and was correctly rejected by input validation; supplying the ID resolved that driver error. The recorded final rerun exited 0. No product tests/typecheck/package checks were needed for this report-only change; the two focused probes supply its runtime evidence.

Exact repository file added: `docs/code-mode-product-investigation.md`. Exact new scratch entries under `/opt/data/cache/scratch/opencode-codemode-product-wgv/`: `bridge-probe.ts`, `bridge-results.json`, blob-verified source copies `tool-runtime.ts`, `tool-schema.ts`, `tool.ts`, `namespace.ts`, `tool-error.ts`, and `node_modules` symlink to the existing repository dependencies. No existing scratch/source evidence file was changed.

Evidence/report pointer is appended only to `opencode-beads-wgv`; leave it `in_progress` and assigned to `codex:oc-codemode` for parent review. No acceptance or closure is asserted.
