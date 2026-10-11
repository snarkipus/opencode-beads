# Claude Code Parity

Status: parity with Beads' Claude Code integration established by epic `opencode-beads-unh`. Validated on **OpenCode 2.0.26** with **bd 1.3.1**.

## Target

The target is the integration `bd setup claude` installs, which `bd init` also installs by default (`cmd/bd/setup/claude.go` at Beads v1.3.1):

- A `SessionStart` hook that runs `bd prime --hook-json`. `SessionStart` fires on `startup`, `resume`, `clear`, and `compact`, which is why upstream removed its `PreCompact` hook.
- A minimal `CLAUDE.md` section that points to `bd prime`. The hooks do the heavy lifting.

The separate Beads Claude Code marketplace plugin (a rich skill, 29 slash commands, and the autonomous `@task-agent`) is **not** the target; see [Deliberate divergences](#deliberate-divergences).

Installing this plugin after a plain `bd init`, and never running `bd setup opencode`, gives OpenCode the same shape. The `bd` contract (`scripts/bd-contract.ts`) checks that premise in CI and daily.

## `bd setup claude` behaviors

| Claude Code (`bd setup claude`) | OpenCode equivalent in this plugin | Evidence on OpenCode 2.0.26 |
| --- | --- | --- |
| `SessionStart` (`startup`) runs `bd prime` | The session context hook attaches `bd prime` to the first and every later request, cached per session | New sessions primed once each (#16) |
| `SessionStart` (`resume`) | A session that returns after `refreshAfterIdleMinutes` (default 30) re-runs prime | Resume within the window reused the cache; resume after the window re-primed (#16) |
| `SessionStart` (`clear`) | A new session gets its own prime | Same path as startup (#16) |
| `SessionStart` (`compact`) | `session.compaction.ended` invalidates the cache, so the next request re-primes | Manual compaction (with idle refresh excluded) and automatic compaction both re-primed (#16) |
| Minimal `CLAUDE.md` pointer to `bd prime` | `bd init` writes the minimal `AGENTS.md` pointer. While prime is attached, bd's full-profile and Codex blocks are replaced in the request with a one-line pointer | Instructions part 22,866 → 16,816 chars; contract checks the markers (#14, #15) |
| `--stealth` (`bd prime --stealth`) | `stealth` plugin option | Prime ran with `--stealth` and reached the agent (#18) |
| `--global` or project install | Global or project `plugins` entry | Project `plugins` loading and options verified in the V2 spike; global configuration uses the same mechanism and was not separately exercised |
| `--remove` | Remove the `plugins` entry | Configuration only |
| `--check` | `opencode debug agents` lists `beads-task-agent`; the agent sees `<beads-context>` | Used throughout validation |
| Hook errors are visible to the user | `bd prime` failure or timeout gives the agent a `<beads-notice>` (as Beads' Codex hooks report refresh failures) | Simulated failure: the agent reported the notice (#18) |
| Migrates legacy hook files | Not applicable: the plugin writes no project files | — |

## Beyond Claude Code

OpenCode V2 exposes surfaces that Claude Code's hooks cannot use. The plugin uses them deliberately:

| Capability | How | Evidence on OpenCode 2.0.26 |
| --- | --- | --- |
| Prime in subagents | The `beads-task-agent` child session passes through the same context hook | The worker reported `<beads-context>` in its own session (#16) |
| Context survives compaction | Prime is a per-request system part, never stored in history | Spike `opencode-beads-2zs.1` |
| Enforced no-push policy | Task-agent permissions `ask` for `git commit`, `git push`, `bd dolt push`, `bd dolt pull`, `bd sync` | A delegated `git commit` was rejected in a non-interactive run (#17) |
| Worker step cap | `taskAgentSteps` (default 100) sets the agent's `steps` | Resolved by `opencode debug agents` (#17) |
| Beads state across compaction | The compaction hook asks the summarizer to keep bead IDs, statuses, follow-ups, and blockers | The summary kept both bead IDs, their state, and the blocker (#17) |
| Schema migration guard | `bd version`, `bd where --json`, and `.beads/.local_version` checks before automatic prime; `autoMigrate` opts out | A v1.2.2-created store got a notice and stayed unmigrated (1.0.0) |

## Deliberate divergences

- **Task agent.** `bd setup claude` installs no agent; the marketplace plugin ships an autonomous multi-task `@task-agent`. This plugin ships a bounded `beads-task-agent` that handles exactly one bead per invocation, by design. See the [artifact policy](beads-artifact-policy.md).
- **Slash commands.** None, as with `bd setup claude`. The marketplace plugin's commands were retired (`opencode-beads-2zs.4`).
- **Skill.** `bd init` installs the slim `.agents/skills/beads` skill, which OpenCode discovers. `bd setup claude` gives Claude Code no skill, and Codex gets the same slim skill. The marketplace plugin's resource documents are not vendored.
- **Hook JSON envelope.** `--hook-json` is specific to Claude Code's hook protocol. OpenCode receives prime as a system part instead.

## Not exercised

- Restarting the OpenCode service was not exercised live because it would disrupt running sessions. The prime cache is in memory, so a restart behaves like a plugin reload, which re-primes (#16).
