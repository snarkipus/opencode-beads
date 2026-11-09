# Agent Guidelines

## Commands
- **Typecheck**: `bun run typecheck`
- **Tests**: `bun test`
- **Package smoke test**: `bun run test:package`
- **bd contract check** (needs `bd` on PATH): `bun run test:bd-contract`; install a pinned release with `./scripts/install-bd.sh <version> <dir>`
- **Install deps**: `bun install`

## Where truth lives

Start with [`docs/README.md`](docs/README.md). It indexes current documents and their distinct responsibilities. You do not need to read `docs/reviews/` or dated records to learn current behavior.

- **Intended behavior** lives in the canonical specs `openspec/specs/*/spec.md`. Requirements and scenarios change only through an owner-approved OpenSpec change. Editorial fixes to a spec's Purpose are allowed.
- **Packaged guidance** in `assets/oc-beads/` ships to users and is behavioral, so edit it like source, not like docs.
- **User docs** are `README.md` (concise onboarding) and `docs/user-guide.md` (details). **Reference facts** about pinned OpenCode interfaces and sources go in `docs/opencode-sdk-contract.md`, and Beads artifact policy goes in `docs/beads-artifact-policy.md`. Neither restates product rules; link the spec requirement instead.
- **Design rationale** lives in `openspec/changes/archive/`. **Historical evidence** lives in `docs/reviews/`, dated qualification/evaluation/acceptance records in `docs/`, and `docs/history/`. It is frozen: never edit it to sound current, and add new evidence as a new record. **Live execution status** (claims, progress, acceptance, closure) lives in Beads; do not duplicate mutable status in specs or guides. Dated acceptance records remain evidence.
- **Disagreements:** specs define intended behavior, not observed upstream facts or execution permission. Correct inaccurate explanatory prose within scope; never rewrite evidence or invent an API to match a spec. If code, SDK facts or test results conflict with the intended behavior, report the precise gap and stop the affected change for disposition. Do not silently change the accepted contract or infer dispatch, publication or activation authority from it.

## Code Style
- TypeScript strict mode with ESM modules
- Use `import type` for type-only imports (verbatimModuleSyntax)
- Node.js imports use `node:` prefix (e.g., `node:fs/promises`)
- Handle undefined from indexed access (noUncheckedIndexedAccess enabled)
- camelCase for functions/variables, PascalCase for types/interfaces
- JSDoc comments for function documentation
- Async/await for async operations

## Proportional engineering

- Before adding complexity for a speculative or vanishingly unlikely race or
  security edge case, explain the concrete failure mode, likelihood, and
  complexity cost to the user and get their buy-in. Do not silently expand scope
  for theoretical robustness.
- Validate external inputs at the boundary that owns them; trust values already
  guaranteed by supported schemas or internal contracts. Preserve integration
  responsibilities without duplicating upstream internals or speculative repairs.
- Add helpers, wrappers or abstractions only for actual reuse, a genuinely complex
  boundary, or a meaningful concept that improves readability. Do not extract
  single-use helpers or introduce frameworks preemptively.
- Test the actual changed implementation and dispatch path, not a duplicate of its
  logic in the test. Prefer small realistic fixtures; mock external effects when
  isolation is useful, without replacing the behavior being verified.

Adapted selectively from [OpenCode's guidance](https://github.com/anomalyco/opencode/blob/84578e123ffd31e31a174457e7350961da4fabbc/AGENTS.md);
its repository-specific tools, architecture and style rules do not apply here.

## Project Structure
- `src/plugin.ts` - OpenCode V2 plugin entry point (default export `{ id, setup }`)
- `src/host.ts` - Host admission plus wiring for hooks, session events, and agent/command/skill/tool registration
- `src/context.ts` - Per-session `bd prime` context cache, actor and capability guidance
- `src/continuity.ts` - The eleven permissioned typed operations in the `beads` namespace
- `src/workflows.ts` - The 30 `oc-beads:*` commands and durable workflow snapshots
- `src/instructions.ts` - Request-only reduction of duplicated bd-managed `AGENTS.md` blocks
- `src/guard.ts` - Beads version and schema-migration guard
- `src/agents.ts`, `src/guidance.ts` - Project-owned task agents, prompt, and shared guidance
- `src/prime.ts` - Bounded `bd` process runner
- `assets/oc-beads/` - Packaged skill, resources and ADR (shipped, behavioral)

## Notes
- This is an OpenCode V2 plugin integrating the beads issue tracker
- Nothing is vendored from upstream Beads; see `docs/beads-artifact-policy.md`. Review each Beads release's upgrade notes against the surfaces listed there

## Upstream responsibility boundary

The installed Beads CLI owns its database, routing and consistency semantics. This plugin integrates normal supported CLI behavior; it does not repair, emulate or defensively compensate for speculative or broken upstream behavior. Do not introduce local upstream patches, routing/confinement frameworks or acceptance blockers for hypothetical upstream failures. Preserve our actual responsibilities: correct invocation/project context, OpenCode permissions, executor attribution, cancellation and honest outcomes. Normal permissioned CLI equivalence does not promise absolute filesystem confinement. Report demonstrated upstream defects with evidence and supported remedies; any downstream patch or stronger protective policy needs explicit scope.

## Beads execution identity and planning ownership

This project-owned policy applies to commands in generated integration blocks too.

- Supply explicit command-scoped `BEADS_ACTOR` or `--actor` for every agent-authored write, claim and heartbeat. Never inherit the human Git identity or set a shared user-global actor. Hermes uses `snarkimedes`; delegated executors use readable identities such as `codex:9c2e1` or `claude:7edcc`, with short unambiguous session suffixes when needed. Keep full session IDs in evidence, not actor names; model names alone are not executor identities.
- Carry the actual executor actor into delegated instructions and commands. The executing worker claims explicitly authorized work atomically and keeps that actor through updates/heartbeats. Parent coordination/review does not transfer ownership; record deliberate handoffs.
- Leave new work unassigned unless assignment is intentional; assign Matt only for explicitly human-owned work. Read back `created_by` (audit author), `owner` (record/account ownership) and `assignee` (executor) separately. Actor attribution is not authentication or permission. Preserve historical authorship, including unknown values; record provenance corrections in notes rather than rewriting audit history.
- A quick OpenSpec draft does not require its own ticket. Substantial multi-session/delegated planning does: use one bounded planning Bead, separate from the implementation epic, with artifact revisions, decisions and pending acceptance. Use the planning Bead named in your assignment; do not reuse an earlier effort's Bead.
- Give a substantive independently owned review one bounded review Bead linked to its planning work and exact candidate. Reuse it through correction/recheck cycles; do not create a ticket per document, invocation, transient retry or minor nit. Record the actual reviewer actor/session, verdict, findings and evidence. Do not invent retroactive claims or timestamps for reviews already performed.
- Ownership of behavior, rationale/evidence and execution status follows [Where truth lives](#where-truth-lives). Close planning/review from their own evidence and owner acceptance, not from implementation completion. Their closure does not authorize implementation, release or deployment. Readiness alone is never dispatch permission.

## Releasing a New Version

**Triggers**: User says "bump the version", "cut a new release", "release a new version", "let's do a release", or similar.

### Determining the Version

If the user specifies a version number (e.g., "bump to 0.4.0") or bump type (major/minor/patch), use that. Otherwise:

1. Find the current version in `package.json`
2. Fetch tags from remote: `git fetch origin --tags`
3. Get commits since last release: `git log v<current>..HEAD --oneline`
4. **Read the actual diffs** - don't rely solely on commit messages:
   - `git diff v<current>..HEAD -- src/ assets/` for source and packaged-guidance changes
5. Apply semver:
   - **patch** (0.0.x): Bug fixes, dependency updates, and compatibility updates with no breaking changes
   - **minor** (0.x.0): New features, new commands, non-breaking enhancements
   - **major** (x.0.0): Breaking changes to plugin API or behavior

### Files to Update

1. **`package.json`** - Update `"version"` field
2. **`CHANGELOG.md`**:
   - Move content from `## [Unreleased]` to new version section
   - Add new version heading: `## [X.Y.Z]`
   - Update `[unreleased]` compare link at bottom to compare from new version
   - Add new version release link at the end of the reference links list
3. **`README.md`** - Update version in the installation example JSON (also the options example in `docs/user-guide.md`)

### Commit Convention

Use this exact format:
```
:bookmark: bump version X.Y.Z -> A.B.C
```

### Checklist

- [ ] All three files updated with consistent version
- [ ] CHANGELOG has actual changes listed (not empty)
- [ ] CHANGELOG links point to correct versions
- [ ] Single commit with all version bump changes
- [ ] User will cut the GitHub release after merge

<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:bacef91e -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Quality
- Use `--acceptance` and `--design` fields when creating issues
- Use `--validate` to check description completeness

### Lifecycle
- `bd defer <id>` / `bd supersede <id>` for issue management
- `bd stale` / `bd orphans` / `bd lint` for hygiene
- `bd human <id>` to flag for human decisions
- `bd formula list` / `bd mol pour <name>` for structured workflows

### Sync

bd stores issue history in Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- Do not treat `.beads/issues.jsonl` as the sync protocol

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and https://github.com/gastownhall/beads/blob/main/docs/getting-started/quickstart.md.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.

<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
