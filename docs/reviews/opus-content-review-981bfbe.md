# Independent guidance content review

Candidate: `981bfbecad58347d4af2fb4cf3c8625ddd56774c`; review Bead `opencode-beads-8rl`; actor `claude:oc-content`; session `77b30a82-e681-4cf8-a138-95199707f49a`. Actual model `claude-opus-5-5`, medium effort explicitly requested. Completed without permission denials. Findings are not represented as corrected.

# Content-quality review: `oc-beads` guidance corpus at `981bfbe`

**Reviewer:** claude:oc-content · **Bead:** opencode-beads-8rl · **Verdict: REVISE**

The corpus mostly keeps the useful depth of the Claude reference rather than shrinking it to filenames and generic warnings. Four content-only problems stand in the way of READY. Two of them are in the material agents will actually copy, and one is in the project's own core attribution rule.

## Material issues (smallest fix for each)

**M1. The actor examples will misattribute OpenCode work, and several aren't shell-safe.**
- **Where:**
  - `SKILL.md:40,41,64,84`, `WORKFLOWS.md:26` and `ISSUE_CREATION.md:40` use `--actor=codex:<short-session>` with no quotes.
  - `MOLECULES.md:32,42,49` use the literal `--actor=codex:9c2e1`.
  - `ASYNC_GATES.md`, `DEPENDENCIES.md` and `INTEGRATION_PATTERNS.md` quote the same actor. So the quoting is inconsistent, and every example uses the `codex:` prefix.
- **What goes wrong:**
  - This is an OpenCode skill. An OpenCode executor that copies the central example records itself as `codex:…`. That is exactly the misattribution `AGENTS.md` forbids.
  - `codex:9c2e1` is the sample ID from this project's own policy. Copied literally, it attributes work to an actor that looks real.
  - Without quotes, bash reads `<short-session>` as a redirection. The command fails on a missing file, or, if a file named `short-session` exists, it creates or truncates a file named `--sandbox`. Either way it doesn't run as intended.
- **Fix:** Use one quoted, host-neutral placeholder everywhere, e.g. `--actor='<executor-actor>'`. Add one sentence to `SKILL.md`: "use the actor named in your assignment (e.g. `opencode:<suffix>`); if none was given, ask rather than invent one or copy an example." Replace `codex:9c2e1` with that placeholder.

**M2. Dependency direction is explained only for `bd create --deps`. Nothing covers adding edges afterwards or checking the result.**
- **Where:**
  - `DEPENDENCIES.md:5-8` defers to `bd dep --help`, and lines 55-56/64 say "read the graph back" without saying how.
  - No asset mentions `dep add`, `bd blocked`, `dep tree` or `dep list` (searched the whole corpus).
  - Upstream has the material this replaces: `DEPENDENCIES.md:126-131` and 613-631 (`bd dep add <dependent> <prerequisite>`, a wrong/right example and a mnemonic), and `WORKFLOWS.md:147-256` (the "Phase 1 before Phase 2" inversion trap, walking backward from the goal, and checking with `bd blocked`).
  - 1.3.1 source confirms the semantics: `dep.go:254,264` is `add [issue-id] [depends-on-id]`, and `ready.go:298` has `blocked`.
- **What goes wrong:** Inverting edges is the most common Beads graph mistake. An agent wiring up an existing epic has no worked mechanics and no way to check, so `bd ready` ends up offering dependents before their prerequisites. The parent's earlier rejection named "worked graph examples"; only the diamond and the create-time example came back.
- **Fix:** About 10–12 lines in `DEPENDENCIES.md`:
  - "X needs Y → `bd dep add X Y`", with one wrong/right pair.
  - The two-line phase trap.
  - A check step: `bd blocked` / `bd dep list <id>` should show each task blocked by its prerequisites, never by its dependents.
  - The backward goal walk can stay a 5-line sketch.

**M3. The resume and recovery path never shows how to find the active work.**
- **Where:**
  - `RESUMABILITY.md:59-64` says "Read the active issue and its recent notes", and `PATTERNS.md:18-23` is similar.
  - No asset contains `in_progress`, `bd list`, `bd show`, `bd ready` or `bd close`.
  - Upstream `SKILL.md:84` ("Recover after compaction: `bd list --status in_progress` → `bd show <id> --long`") and `PATTERNS.md:213-235` keep this even under their own ADR-0001.
- **What goes wrong:** After compaction or a cold start, which is exactly when an agent opens this skill, it has the checkpoint format but no entry point. It may then guess, re-run `bd ready` and claim new work instead of resuming its own.
- **Fix:** Add a 3–4 line recovery sequence to `RESUMABILITY.md`:
  - List in-progress work, filtered to your actor or assignee where help supports it.
  - `bd show <id>`.
  - Read the latest appended checkpoint.
  - Re-check state before acting.

  Optionally add one line pairing closure with `--reason` and a `RESOLUTION:` note in `PATTERNS.md`. Three core verb forms are not the broad flag catalog that ADR-0001 excludes.

**M4. OpenSpec is presented as a universal Beads requirement in a public plugin.**
- **Where:** `SKILL.md:17-18` (stated outright), the `BOUNDARIES.md:17` row, the `INTEGRATION_PATTERNS.md:10` table, and the planning/review Bead model at lines 21-35.
- **What goes wrong:** Users without OpenSpec are told their intended behavior "is" OpenSpec, and may conclude they need it or create planning and review Beads by default. The inventory's INTEGRATION_PATTERNS mapping does say "map planning to OpenSpec", but the settled goal is to avoid presenting that as universal.
- **Fix:** Make it conditional, e.g. "the project's specification system (for example OpenSpec, when used)". Label the planning/review Bead pattern as one project policy example, not a Beads rule.

## Missing guidance vs intentional adaptation

**Intentional adaptations I accept** (they are not omissions):
- `TodoWrite` becomes an optional, host-owned, experimental todo.
- MCP tool examples are removed.
- Upstream's "overwrite notes" rule is replaced by append-only checkpoints, explicitly attributed at `WORKFLOWS.md:3`.
- The approve-every-handoff loops are removed.
- Stale v0.15 and Dolt-server repair recipes are dropped.
- The `.beads-wisp/` storage table and the static CLI catalog are dropped.
- The "epic if 5+ tasks" heuristic is dropped.
- Agent/slot: verified that 1.3.1 `cmd/bd` has no `agent` or `slot` command. `AGENTS.md:18-35` explains the limit honestly and offers no false equivalent.

**Missing important guidance:** only M2 and M3.

## Accuracy checks against the 1.3.1 source (all passed)

- `--actor` and `--sandbox` are global flags (`main.go:875,879`). `--sandbox` only disables Dolt auto-push.
- `--append-notes` exists (`flags.go:34`).
- `bd heartbeat` runs as the current actor, and only the owner may heartbeat (`heartbeat.go`).
- Memory commands: `memories`, `recall` and `remember --key` exist; an existing key is updated in place (`memory.go:487`).
- The `--deps` direction text matches `create.go:936`.
- Gates:
  - `create` accepts human, timer, `gh:run` and `gh:pr`, not `bead` (`gate.go:1283`). `check` accepts `bead` (`gate.go:1276`). So `ASYNC_GATES.md:21-26` is accurate.
  - `resolve --reason` exists.
- Molecules: `bd mol wisp create --var` is valid (wisp is registered under `mol`, `wisp.go:1022`), as are `mol squash --summary`, `mol burn` and `mol show`.

## Nonblocking improvements

- **`--sandbox`:** Every example includes it, but `SKILL.md:90` says it applies only where auto-push is prohibited. Say once that the examples assume that policy.
- **Memory keys:** Add "recall before reusing a key; same key replaces in place". This protects other agents' knowledge.
- **2-week test:** Bring back upstream's one-line "Could I resume this after 2 weeks away?" heuristic in `BOUNDARIES.md`. It is a sharper decision aid than the table alone.
- **Human gate example:** In `ASYNC_GATES.md:43-44`, say that the human runs the resolve command; an agent must never type a human's actor.
- **Wisp cleanup:** Add one line: leftover wisps can be found with `bd mol wisp list` and should not pile up (upstream `CHEMISTRY_PATTERNS.md:192`).
- **TROUBLESHOOTING:**
  - Name what the human can run, without running it. For example, a missing store means the owner may run `bd init`; `bd doctor` is a diagnostic, but whether it is read-only without a fix flag is unverified.
  - Keep the cloud-synced-folder I/O hint.
  - As written, "ask the owner" doesn't help the agent tell the owner what to do.
- **Ask first or create directly:** Within authority, keep the heuristic: fuzzy or strategic work → ask; possible duplicate → `bd search` first.
- **Repetition:** The authority, actor and no-automation caveats are restated in almost every file. That's tolerable for files loaded on demand, but `MOLECULES.md:57-66` repeats itself within the same file.

## Completeness and quality by file group

- **Main skill:** Lean, with strong policy: scope, atomic claims, `created_by`/`owner`/`assignee`, handoff and stop rules. It separates notes from memory well. The examples defect (M1) is the main problem.
- **Core resources:**
  - `RESUMABILITY.md` (before/after example and template), `ISSUE_CREATION.md` (parser design-vs-acceptance example) and `BOUNDARIES.md` (transition example) carry real decision aids.
  - `PATTERNS.md` keeps failed approaches and the rejected-hypothesis rationale.
  - `DEPENDENCIES.md` keeps the meaning of each relation but lacks the mechanics and the check step (M2).
  - `WORKFLOWS.md` has good checkpoint triggers but lost epic planning and unblocking.
  - `TROUBLESHOOTING.md` is honest but thin.
  - `CLI_REFERENCE.md` is appropriately minimal under the ADR.
- **Advanced resources:**
  - `ASYNC_GATES.md` is the strongest file and accurate.
  - `MOLECULES.md` and `CHEMISTRY_PATTERNS.md` are adequate, with a decision matrix and squash/burn lifecycle.
  - `AGENTS.md` is honest.
  - `STATIC_DATA.md` and `WORKTREES.md` are short but enough.
- **Attribution:** Every file has a commit-pinned upstream link, and TROUBLESHOOTING is correctly labelled a replacement.

## Evidence limits

- **Static review only:** read-only, no live `bd` help, no host or runtime run, no model-behavior evidence.
- **Source identity:** I checked CLI syntax against `/opt/data/cache/scratch/parity-sources/beads/cmd/bd`, whose CHANGELOG top entry is 1.3.1. I did not confirm it is the exact tagged commit or the installed binary.
- **Asset claims of "installed help confirms…"** were checked against that source, not re-run.
- **No delivery claim:** Nothing here shows the files are discoverable at runtime or improve agent behavior.
- **Tracking:** I made no `bd` calls and wrote no files. Tracking updates on opencode-beads-8rl are left to the parent.
