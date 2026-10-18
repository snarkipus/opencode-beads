# Independent planning review: candidate `e74b507` on `openspec/improve-beads-workflow-parity`

HEAD is `e74b507fca555b42558ddd6307ce488b30c0e3a6`. The local `AGENTS.md`, `.claude/` and `.codex/` changes are not part of the candidate, and I left them alone. I made no edits, ran no `bd` commands, made no commits and installed nothing.

## 1. Verdict: **REVISE** (one small, targeted revision; this is not an implementation authorization)

The architecture analysis is sound and its key API claims match the pinned release source. One finding changes what the owner is actually comparing against. It needs a short evidence correction and a choice of upstream-review baseline before the packet goes to Matt. Everything else is material advice that doesn't block the decision.

## 2. Findings, in priority order

### F1 — Blocks owner review: the installed Claude plugin already differs from the pinned baseline on note-taking, which is the behavior that motivated this work

- **Where:** `docs/claude-code-local-reference.md:28` only says "Other files differ". `docs/claude-code-integration-analysis.md:48,82` presents "WORKFLOWS … tells agents to overwrite notes" as an unresolved adaptation tension. `specs/upstream-review/spec.md:7` and `design.md:86` compare only against a "candidate stable release".
- **Evidence:**
  - The installed marketplace checkout is `4a67d0d…`, committed 2026-10-17 on upstream main. It is newer than the v1.3.1 tag `c1c4b64…` (published 2026-09-30). Its `plugin.json` still says `1.3.0`.
  - Diffing the installed files against `parity-sources/beads/plugins/beads`: the installed `WORKFLOWS.md`, `PATTERNS.md`, `INTEGRATION_PATTERNS.md`, `ISSUE_CREATION.md` and skill `README.md` all use `bd update … --append-notes`. The pinned release uses `--notes`, which overwrites. For example, `WORKFLOWS.md` lines 69, 79, 345 and 407.
  - `--append-notes` already exists in the pinned CLI (`cmd/bd/cli_fast_test.go:469`).
  - None of the candidate docs, specs or sources mention `append-notes`.
- **Consequences:**
  1. Matt's observation that Claude takes better notes was formed against guidance the packet never analyzed. Upstream has already resolved the overwrite tension in favor of appending.
  2. Claude marketplace installs follow upstream main, not releases. A drift monitor that only looks at stable releases misses exactly this kind of behavior change for weeks.
  3. The 73-file release inventory is still correct for its own pin, but it is the wrong reference for any "parity with what I see in Claude" comparison.
- **Smallest fix:**
  - Add a short, characterized installed-vs-pinned diff to the local-reference doc: list the files, and record that the note write mode changed from replace to append.
  - Update the WORKFLOWS/PATTERNS rows to recommend append-style checkpoints.
  - Add one gate item: the parity reference is either the release or the marketplace main head.
  - Let `upstream-review` optionally track the marketplace default-branch head as a second, informational baseline, or state explicitly that this is a known blind spot.
  - No new inventory campaign is needed.

### F2 — Material, nonblocking: the typed tool's visibility to agents isn't covered, so authorization equivalence is incomplete

- **Where:** `design.md:33` and `docs/opencode-native-parity-assessment.md:86` only discuss call-time `permission.assert`.
- **Evidence:**
  - Released `packages/core/src/tool.ts:231` hides a tool from an agent when `whollyDisabled(tool.options?.permission ?? name, rules)`. So a new `beads_*` tool is visible to any agent that wholly denies `shell`, unless the tool sets `options.permission`.
  - `core/src/permission.ts:157-162` (`configured`) resolves `agent ?? session.agent`. The shell tool passes `agent: context.agent` and calls `access.authorizeExternal` before asserting (`core/src/tool/plugin/shell.ts:132-145`).
  - The `save` field can turn an "always" reply into a broader saved rule.
- **Consequence:** a read-only or shell-denied agent could still get a write-capable Beads tool. Saved approvals could also become wider than intended.
- **Fix:** add these to the N1 mapping as required qualification items:
  - set `options.permission` to the shell action;
  - assert `action: "shell"` with canonical `bd …` resource strings and pass `context.agent`;
  - narrow or omit `save`;
  - check the guard hold before running.

  The plan's principle ("not default-allow") already implies this. It needs to be written down concretely.

### F3 — Material, nonblocking: the "prepared checkpoint at compaction" state is effectively unreachable under N1's own design

- **Where:** `design.md:33` (synchronous writes, no queue) versus `design.md:53`, `specs/work-continuity/spec.md:81-85` and `tasks.md:29` ("prepared-write compaction ordering").
- **Evidence:** the hook dispatcher awaits callbacks one after another with no timeout (`core/src/plugin/hooks.ts:88-95`). The assessment itself says "usually the compaction hook only carries acknowledged references" (`assessment.md:84`).
- **Consequence:** the spec scenario and the test task invite someone to build a pending-write state just so it can be tested. That is the deferred queue the design rejects.
- **Fix:** restate M03 as "compaction adds acknowledged durable references and flags known unsaved state; no writes in the hook unless qualification shows an in-flight overlap". Drop "prepared-write" from 4.2 or make it conditional.

### F4 — Material, nonblocking: the upstream-review alert sink conflicts with the repo's tracking rule

- **Where:** `design.md:86` says "deduplicated GitHub review issue". The committed `AGENTS.md:166` says "Do NOT use external issue trackers".
- **Context:** the existing `beads-contract.yml` alerts by failing the check, with `permissions: contents: read`.
- **Consequence:** this adds `issues: write` to a scheduled workflow, which is a new security surface for the zizmor ruleset. It also creates a second tracking surface.
- **Fix:** either state that the GitHub issue is a notification only and a maintainer files the Beads work on disposition, or reuse the existing failing-check pattern with deduplication keyed by candidate commit. This is an engineering choice once the conflict is acknowledged.

### F5 — Cosmetic

- `analysis.md:177` says "both proposed capability deltas"; there are three.
- `analysis.md` lines 126 and 139 cite the development pin `8f7b012` for the command and skill docs, even though the assessment corrects provenance to `843a6c5`.
- `tasks.md:2.4` and `analysis.md:173` repeat history about the freeze marker and tracker that isn't needed.
- `design.md` Decision 4 contains the N2 and X-dispositions paragraph, which belongs elsewhere.

### Checked and confirmed (no findings)

| Claim | Source checked |
| --- | --- |
| `permission.assert` exists only in 2.0.32 | `npm32` `dist/promise/permission.d.ts:28`; absent from `npm26` and `minimum/` |
| Hooks are awaited in sequence with no timeout | `core/src/plugin/hooks.ts:88-95` |
| Command `add` is a map set, so a collision overwrites; `list` exists | `core/src/command.ts:61,79` |
| Code-mode and direct tool paths both go through `beforeExecute` | `core/src/tool.ts:240-243` |
| Upstream task agent repeats the ready cycle | `agents/task-agent.md:36-38` |
| 29 commands, 15 resources, `SessionStart`/`PreCompact` run plain `bd prime` | pinned `plugin.json` |

The planning validator passes. No requirement silently fixes one-bead scope or a default command set.

## 3. N1 versus the alternatives, and proportionality

- **What the custom tool really buys:**
  - safe argument passing for multi-line notes, avoiding shell quoting failures;
  - a named tool in the model's tool list, which may be a stronger prompt to checkpoint than prose;
  - precise cache invalidation.

  The "typed acknowledgement" over a shell exit code is modest, since the model already sees CLI success or failure.
- **What it costs:**
  - raising the minimum host to 2.0.32, which was published two days before this review;
  - permission-equivalence engineering (F2);
  - a second surface that must track `bd` flags. `--append-notes` shows those flags carry meaning.
- **Is authorization equivalence achievable?** Probably, for a fixed and narrow set of operations, if F2 is done. It is not automatic. The plan correctly makes falling back to N0 the default if equivalence can't be demonstrated.
- **Proportionality:** there is no second datastore, daemon, reviewer fleet or automatic memory capture. The design is proportionate.
- **Framing bias:** the user-reported gap is unexplained, and F1 suggests a cheap guidance-level cause. Most of the plausible improvement comes from the resources and skill, recovery reads and append-style checkpoints. All of that works on N0. The packet presents N0 only as a "compatibility fallback".
- **Recommendation:** offer a staged option, **N0 now with an N1 seam**. The typed tool is adopted only if evaluation shows tool-call salience or quoting failures that guidance can't fix. This is advice for the owner's choice, not a defect.

## 4. Owner decisions that are genuinely consequential

These need Matt:

1. The parity reference: pinned release or marketplace main (new, from F1).
2. The minimum host: 2.0.32 with N1, 2.0.26 with N0, or N0 now with an N1 seam.
3. Invocation-scope policy (E01/E05/N2), and whether batch continuation is the default.
4. Ownership and naming of the supplemental skill and commands, including whether to ever override the shared `beads` skill.
5. Corpus dispositions as groups, especially the deferred resources and admin commands.
6. The upstream alert sink, because of the AGENTS.md conflict (F4).

These can be engineering decisions:

- the M01–M10 mechanism mapping;
- X01, X02, X04, X05, X07, X08 and X09 (the plan already recommends against or defers them);
- collision and precedence handling;
- the exact permission mapping in F2, provided it is equivalent or falls back to N0;
- how the compaction hook is simplified (F3).

X03 (nested delegation depth) and N2 background continuation stay with the owner only if selected.

## 5. Checks run, limitations and disclosures

**Checks run (all read-only):**
- `git rev-parse` / `git status`, and the diff stat from base `c5c29f2`.
- Read every candidate artifact, the analysis doc in full, and inventory summaries via `python3 -I`.
- Source call sites in `parity-sources/{released,minimum,npm26,npm32,beads}`, as listed in the findings.
- `diff -rq` of the installed plugin cache against the pinned plugin tree, plus `git log` on the shallow marketplace checkout.
- `python3 -I docs/validate-parity-planning.py …`: all 4 checks PASS.
- `openspec validate improve-beads-workflow-parity --strict`: valid. The OpenSpec CLI printed a notice that it collects anonymous usage stats, so the run may have sent telemetry.
- Read `beads-contract.yml`, `src/host.ts` and `src/agents.ts`.

**Not done:**
- No product tests, since the candidate is docs-only.
- No runtime or host probes.
- I could not check commit ancestry in the shallow clone; the ordering in F1 rests on commit dates.

**Installed Claude plugin context in this session:**
- It appeared. The SessionStart `bd prime` hook output was injected, including 4 persistent memories.
- The skill list showed the `beads:beads` skill and all 29 `beads:*` command entries.
- No compaction happened, so `PreCompact` was not observed.
- I had no agent tool, so `task-agent` registration couldn't be checked.

**Model:** the session reports `claude-opus-5-5` (Opus 5.5). The reasoning-effort setting isn't visible to me, so "medium" is unverified. Nothing was substituted.

**Tools and authorization:** no tools were soft-denied. Plan mode was active and I wrote no plan file. Exit status 0 from the validators is not proof the review is complete.

**Unavailable connectors:** the claude.ai Excalidraw, Gmail, Google Calendar and Google Drive connectors need authorization in claude.ai connector settings. They weren't needed here.

I've stopped here, as requested. The planning bead is not marked complete.