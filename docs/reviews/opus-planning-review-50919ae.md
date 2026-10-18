# Independent review of planning candidate `50919ae` (branch `openspec/improve-beads-workflow-parity`)

Attribution: supplied independent Claude review of `50919ae0f6b192bb8c2773398685c550fdaad22f`; trace model `claude-opus-5-5`. The parent reports an explicit medium invocation; effort was not introspectable by the reviewer. Original verdict and review substance are retained below, including its source interpretation; the planning agent’s corrections are recorded separately in [reconciliation](../../openspec/changes/improve-beads-workflow-parity/reconciliation.md). Only the unrelated connector-advertisement footer is omitted.

## Verdict: **REVISE**

There is one small blocking finding. It affects task ordering and a missing prerequisite, not the design. Everything else is ready to map. Once tasks 1.1 and 1.2 are re-sequenced and the host prerequisite is stated, I would accept the package for epic mapping without another full review.

HEAD is `50919ae0f6b192bb8c2773398685c550fdaad22f`. I left the `AGENTS.md` change, `.codex/` and `.claude/settings.local.json` alone and did not count them as part of the candidate. I made no edits, ran no `bd` commands, wrote no plan file, ran no product tests and started no host or model.

## Blocking finding

### B1 — Medium-high: task 1.1, the first gate, can't run as ordered, and it needs a host that isn't installed

**Evidence**
- **The gate order:**
  - `tasks.md:7` (1.1) qualifies the 2.0.32 permission surfaces using fixtures in `tests/continuity.test.ts`. It runs "before adapter activation".
  - `tasks.md:8` (1.2) changes the dependency to `>=2.0.32 <3` and only runs "After 1.1".
  - `design.md:39` says 1.1 "must precede N1 activation".
- **The pinned typings don't have the API 1.1 tests:**
  - `package.json` pins `devDependencies["@opencode/plugin"]` to `2.0.26` (the lockfile matches).
  - `permission.assert` exists in `npm32/package/dist/promise/permission.d.ts:28` but not in the 2.0.26 typings.
  - So 1.1's fixtures can't typecheck until 1.2 lands, and 1.2 is ordered after 1.1.
- **1.1 duplicates 3.1:** the adapter 1.1 would exercise is written in 3.1 (`tasks.md:17`, "After 1.1–1.2"). The two tasks list the same checks: invocation agent, allow/ask/reject, held access and cancellation after approval.
- **Fake-host fixtures can't prove host behavior:** the existing tests fake only a small slice of the host context (`docs/opencode-sdk-contract.md:38`). They can show the plugin sets `options.permission`. They can't show that the host's `Tool.snapshot` filters on it (`core/src/tool.ts:231`), and they can't check whether the host accepts `oc-beads:ready`.
- **The installed runtime is below the selected minimum:**
  - The OpenCode on PATH is `@opencode/cli` **2.0.29** (`/opt/hermes/image-toolchain/npm/node_modules/@opencode/cli/package.json`). I read that file and did not run the binary.
  - Live-host checks in 1.1, 4.2 ("installed-host checks") and 6.2 all need a host at 2.0.32 or later.
  - `owner-decisions.md:25` keeps runtime upgrades separately gated, and no artifact declares this prerequisite.

**Failure if mapped as-is**
- The epic's first ready bead would be blocked by its own successor.
- The 1.1 and 3.1 beads would duplicate each other.
- Every installed-host gate would hit an undeclared need for runtime-upgrade authority partway through execution.

**Smallest correction (edit `tasks.md`; mirror it in the `reconciliation.md` requirement table)**
1. Make 1.2's dependency/typing edit the first step, or merge it into the start of 1.1. It still needs dependency-edit authority.
2. Restate 1.1 as host-contract qualification only. Use a minimal throwaway probe tool and command on an OpenCode 2.0.32+ host, and record the results in `docs/opencode-sdk-contract.md`.
3. Move the adapter-specific fixture items into 3.1.
4. Add an explicit prerequisite to 1.1, 4.2 and 6.2. Either provide an isolated, disposable OpenCode 2.0.32+ install that leaves the operator's 2.0.29 runtime untouched, or get explicit authority to upgrade the runtime. If neither exists, stop and report it.

## Nonblocking recommendations

1. **Command collisions — the gate is likely to trip; plan the fallback the spec already allows.**
   - In the released supervisor, package plugins activate after the config plugins (`core/src/plugin/supervisor.ts:29,37`). The command editor only has `add`, which is a plain `Map.set` (`core/src/command.ts`).
   - So a user command with the same name, present at load, can be detected through `ctx.command.list()` and skipped. One added later is overwritten when commands are rebuilt, and the package can't see that happen.
   - `design.md:31` and `tasks.md:13` say "stop registration". The spec (`workflow-access/spec.md:57-59`) also allows "documented override behavior".
   - Recommendation: scope the stop to the colliding name only. Document that rebuilds shadow later-added same-name overrides, and have `oc-beads:status` report it.
   - Skills don't have this problem: the skill editor has `get` and `list`, so the `oc-beads` skill can be checked during every rebuild.

2. **Skill resources: link all 16 files explicitly from `SKILL.md`.**
   - `Skill.prepare` lists only the first 10 sorted files (`core/src/skill.ts:55-62`). With the ADR plus 15 resources, the sorted cutoff drops `PATTERNS`, `RESUMABILITY`, `STATIC_DATA`, `TROUBLESHOOTING`, `WORKFLOWS` and `WORKTREES`.
   - The resources sit in the npm cache, outside the project. They are readable by default (`permissions.mdx:142-145`), but a user rule such as `external_directory: ask` or `deny` would prompt or block.
   - Add one fixture and an acceptance case to 2.2 and 6.2 that reports an unreachable resource honestly.

3. **Saved approvals for the typed tool: state the intended outcome in 1.1.**
   - With `save: []`, an "always" reply works only once (`core/src/permission.ts:299-305`). Users with an `ask` rule will be prompted on every checkpoint.
   - The built-in shell tool saves `bd *` for any `bd` command, because `bd` has no arity entry (`core/src/shell/parse.ts:375-380`).
   - Saved rules apply to the whole project and are checked after deny rules (`permission.ts:176`). So an existing shell `bd *` grant will also authorize the typed operations. That matches what the shell does, and is not a broader grant.
   - The plan's narrower choice is defensible. 1.1 should list these as expected results, and the guidance should say that "always" on a typed prompt is not saved.

4. **Drift alerts need to fail the check.** GitHub notifies people about failed scheduled runs, not successful ones. Task 5.1 should say that unreviewed drift fails a separate job or step, the same way the existing review step does (`beads-contract.yml:57-65`). Drift and retrieval failure should produce distinct `::error::` messages. Otherwise "visible in check output" means nobody sees it.

5. **Drop the 5.1 → 1.1 dependency.** The drift script doesn't depend on N1 qualification. Removing the edge lets 5.1 run in parallel.

6. **Release branch strategy.** Stable releases are cut from `main` through PRs. Before 1.2 merges (raising the peer range to 2.0.32+), the epic should note where stable 1.0.x fixes will come from. This is a release decision, not a planning defect.

## Prior findings F1–F5

| Finding | Status | What I checked |
| --- | --- | --- |
| F1 | **Resolved** | See detail below. |
| F2 | **Resolved in design** | `options.permission` is part of the released `Tool.Options`; `ToolContext` carries `agent`, `signal`, `messageID` and the call `id`; `configured` resolves `agentID ?? session.agent`; external access can be checked with the public `permission.assert({action: "external_directory"})`, which matches `file-access.ts:125-141`. One nuance remains, recommendation 3. |
| F3 | **Resolved** | Compaction is reference-only (`design.md:49`, `work-continuity/spec.md:76-80`, task 3.2 verifies no writes, waits or recursion). Some scenario wording still says "prepared", which is harmless. |
| F4 | **Resolved** | The alert reuses the existing `contents: read` check, with no issues and no issue-write permission. The upstream-review spec, `design.md:63`, task 5.1 and the artifact policy all agree. See recommendation 4. |
| F5 | **Resolved** | The analysis says "all three capability deltas" (line 181), its command and skill doc links use `843a6c5`, and no freeze-marker or tracker history remains in the tasks. |

**F1 detail**
- The installed cache matches marketplace-main `4a67d0d` byte for byte, apart from a `.in_use` marker file.
- Release `c1c4b64` → main differs by exactly 16 edited files and 1 added file (`plugins/beads/BUILD.bazel`), with no deletions. That one addition is the whole 73 → 74 difference.
- Five guidance files now use `--append-notes` instead of `--notes`: skill `README.md`, `WORKFLOWS`, `PATTERNS`, `INTEGRATION_PATTERNS` and `ISSUE_CREATION`.
- `WORKFLOWS.md:368` still says "overwrite previous notes, not append". The inventory mapping flags this for the adaptation.
- On drift, the reviewed baseline is `marketplace_main.commit`, and only an explicit human disposition advances it.

## Coverage and proportionality

- **Requirements:** all 17 normative requirements (6 work-continuity, 8 workflow-access, 3 upstream-review) match the reconciliation table by title. I checked this by hand, not just through the validator.
- **Tasks:** 13 unique tasks.
- **Corpus:** all 74 marketplace-main members have a disposition, a group, a target and task IDs. The 29 commands map to `oc-beads:<stem>`, plus `oc-beads:status`. The 15 resources and the ADR map to `assets/oc-beads/`. The shared `beads` skill is preserved, and host-specific and support files are reference-only.
- **Native API claims:** these hold against released 2.0.32 source — tool filtering, invocation identity, the assertion schema, colon names in the command schema, absolute skill paths, and hooks awaited with no timeout.
- **Stop, compaction and late-child behavior:** no recursive same-session runner, no queue, no restarts from plugin events, no false persistence claims. Partial or late child results count as incomplete.
- **Implementation seams exist:**
  - `src/host.ts` already uses context and compaction hooks plus an abortable event subscription.
  - `runBd` in `src/prime.ts` is a bounded runner without abort support yet; 3.1 adds that.
  - `src/guard.ts` already probes safely with `bd where --json`.
- **Proportionality:** good. There are no new services, stores, pollers or tracker work. Fixtures (6.1) are kept separate from model qualification (6.2).
- **Verdict on tasks:** apart from B1, coverage is complete and proportionate.

## Validations I ran

- `openspec validate improve-beads-workflow-parity --strict --no-interactive`: valid.
- `openspec validate --all --strict --no-interactive`: 1 passed, 0 failed.
- `python3 -I docs/validate-parity-planning.py /opt/data/cache/scratch/parity-sources`: all 6 PASS lines.
- `git diff --check`: clean.
- Read-only `diff`/`cmp` of the installed cache, marketplace-main and the release tree; inventory inspection with `python3 -I`; `grep`/`sed` reads of the pinned 2.0.32 source.

## What was not tested

- No OpenCode host was started, and no plugin was loaded at either 2.0.29 or 2.0.32.
- No slash-command dispatch, permission prompts, saved grants, compaction, child-stop races or fresh-session recovery were exercised.
- No `bd` or store access, no npm pack or install, no model sessions.

All N1, namespace, collision, resource-reachability and behavioral claims above rest on pinned source reading only. They remain future acceptance gates. My model is Opus 5.5; I can't see the reasoning-effort setting, so "medium" is unverified.
