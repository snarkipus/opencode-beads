# Agent Guidelines

## Commands
- **Typecheck**: `bun run typecheck`
- **Tests**: `bun test`
- **Package smoke test**: `bun run test:package`
- **bd contract check** (needs `bd` on PATH): `bun run test:bd-contract`; install a pinned release with `./scripts/install-bd.sh <version> <dir>`
- **Install deps**: `bun install`

## Code Style
- TypeScript strict mode with ESM modules
- Use `import type` for type-only imports (verbatimModuleSyntax)
- Node.js imports use `node:` prefix (e.g., `node:fs/promises`)
- Handle undefined from indexed access (noUncheckedIndexedAccess enabled)
- camelCase for functions/variables, PascalCase for types/interfaces
- JSDoc comments for function documentation
- Async/await for async operations

## Project Structure
- `src/plugin.ts` - OpenCode V2 plugin entry point (default export `{ id, setup }`)
- `src/host.ts` - Wires the context hook, session events, and agent registration
- `src/context.ts` - Per-session `bd prime` context cache and audience selection
- `src/guard.ts` - Beads version and schema-migration guard
- `src/agents.ts`, `src/guidance.ts` - Project-owned task agents, prompt, and shared guidance
- `src/prime.ts` - Bounded `bd` process runner

## Notes
- This is an OpenCode V2 plugin integrating the beads issue tracker
- Nothing is vendored from upstream Beads; see `docs/beads-artifact-policy.md`. Review each Beads release's upgrade notes against the surfaces listed there

## Beads execution identity and planning ownership

This project-owned policy applies to commands in generated integration blocks too.

- Supply explicit command-scoped `BEADS_ACTOR` or `--actor` for every agent-authored write, claim and heartbeat. Never inherit the human Git identity or set a shared user-global actor. Hermes uses `snarkimedes`; delegated executors use readable identities such as `codex:9c2e1` or `claude:7edcc`, with short unambiguous session suffixes when needed. Keep full session IDs in evidence, not actor names; model names alone are not executor identities.
- Carry the actual executor actor into delegated instructions and commands. The executing worker claims explicitly authorized work atomically and keeps that actor through updates/heartbeats. Parent coordination/review does not transfer ownership; record deliberate handoffs.
- Leave new work unassigned unless assignment is intentional; assign Matt only for explicitly human-owned work. Read back `created_by` (audit author), `owner` (record/account ownership) and `assignee` (executor) separately. Actor attribution is not authentication or permission. Preserve historical authorship, including unknown values; record provenance corrections in notes rather than rewriting audit history.
- A quick OpenSpec draft does not require its own ticket. Substantial multi-session/delegated planning does: use one bounded planning Bead, separate from the implementation epic, with artifact revisions, decisions and pending acceptance. This effort uses `opencode-beads-d9n`.
- Give a substantive independently owned review one bounded review Bead linked to its planning work and exact candidate. Reuse it through correction/recheck cycles; do not create a ticket per document, invocation, transient retry or minor nit. Record the actual reviewer actor/session, verdict, findings and evidence. Do not invent retroactive claims or timestamps for reviews already performed.
- OpenSpec owns intended behavior; committed docs own detailed rationale/evidence; Beads owns execution, assignment and acceptance status. Close planning/review from their own evidence and owner acceptance, not from implementation completion. Their closure does not authorize implementation, release or deployment. Readiness alone is never dispatch permission.

## Releasing a New Version

**Triggers**: User says "bump the version", "cut a new release", "release a new version", "let's do a release", or similar.

### Determining the Version

If the user specifies a version number (e.g., "bump to 0.4.0") or bump type (major/minor/patch), use that. Otherwise:

1. Find the current version in `package.json`
2. Fetch tags from remote: `git fetch origin --tags`
3. Get commits since last release: `git log v<current>..HEAD --oneline`
4. **Read the actual diffs** - don't rely solely on commit messages:
   - `git diff v<current>..HEAD -- src/` for source changes
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
3. **`README.md`** - Update version in the installation example JSON

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
