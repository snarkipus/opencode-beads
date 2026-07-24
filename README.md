# opencode-beads

[Beads](https://github.com/gastownhall/beads) issue tracker integration for [OpenCode](https://opencode.ai).

This maintained fork provides the OpenCode-facing product layer around Beads: full `bd prime` context injection, vendored workflows, an autonomous task agent, and project-scoped runtime integration. It is deliberately an adapter rather than a second issue tracker: the `bd` CLI remains authoritative for issues, project initialization, skills, Dolt synchronization, migrations, and general Beads behavior.

The project originated as [Josh Thomas's `opencode-beads`](https://github.com/joshuadavidthomas/opencode-beads) and continues under the MIT license. This fork is maintained by Matt Jackson and tracks reviewed upstream Beads releases while adapting their plugin artifacts to OpenCode's CLI-only execution model.

## Installation

Install the `bd` CLI once on the host:

```bash
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
```

See the [Beads installation guide](https://github.com/gastownhall/beads/blob/main/docs/getting-started/installation.md) for alternative methods (Homebrew, Windows, AUR, etc.).

Add the version-pinned plugin to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["@snarkipus/opencode-beads@0.9.0"]
}
```

Restart OpenCode. OpenCode caches pinned plugins, so update this version explicitly when upgrading. An unpinned `@snarkipus/opencode-beads` entry follows npm updates on startup but is less reproducible.

Initialize every new project separately. Create a Git worktree first if necessary, then run `bd init`:

```bash
git init
bd init
```

Skip `git init` when the project is already a Git worktree. `bd init` performs the per-project Beads initialization and its automatic Codex project integration creates the canonical shared skill at `.agents/skills/beads`, which OpenCode also discovers. `/beads:init` invokes the same project initialization workflow; this plugin has no separate skill lifecycle or companion CLI.

### Upgrading from 0.8.0

Version 0.8.0 installed a fork-managed skill under `.opencode/skills/beads`. Remove that old managed skill with the version-pinned 0.8.0 CLI before changing the plugin pin to 0.9.0:

```bash
bunx @snarkipus/opencode-beads@0.8.0 remove
```

If the old skill was installed globally, append `--global` to that exact command. After removal, run `bd init` in each project that has not yet received the canonical shared skill. Do not substitute 0.9.0 in the removal command: the companion CLI no longer exists in 0.9.0.

## Features

- **Context injection** - Loads the canonical Beads workflow and persistent memories on session start and after compaction
- **Commands** - Vendored Beads workflows available under the `/beads:*` namespace
- **Task agent** - Autonomous issue completion via `beads-task-agent` subagent

## Usage

This plugin is a thin OpenCode adapter. For Beads workflows, CLI commands, Dolt operations, migrations, backups, and issue-tracking concepts, use the [upstream documentation](https://github.com/gastownhall/beads) or run `bd prime`.

### Context behavior

The plugin runs full `bd prime` when a primary-agent session first receives a message and after compaction, matching the canonical workflow pattern used by the upstream Claude Code and Codex integrations. The prime output supplies the current workflow, command guidance, and persistent memories; a compact shared layer adds only OpenCode-specific CLI safety and primary-agent delegation. Regular task subagents such as `explore` and `general` are deliberately skipped, while the included `beads-task-agent` remains explicitly eligible.

If `bd` is unavailable, the project is not initialized, or prime fails or returns no content, context injection is silently skipped and remains retryable. Vendored commands remain visible, the runtime does not initialize Beads or write startup files, and the task agent retains a bounded standalone quick reference for `ready`, `show`, atomic claim, discovered follow-up, and close. That fallback tells the agent to run `bd prime` when injected context is missing or stale; it does not duplicate the full live workflow.

## Commands

Commands are available as `/beads:<name>`, for example `/beads:ready`, `/beads:create`, and `/beads:show`. The plugin vendors every command template published by the upstream Beads plugin; it does not generate an OpenCode command for every `bd` subcommand. Use the `bd` CLI for the complete command surface and consult the generated [CLI reference](https://beads.gascity.com/cli-reference/index).

Explicit command and agent definitions in your OpenCode configuration take precedence over plugin-provided definitions with the same name. The plugin emits a grouped, rate-limited warning for exact `beads:*` or `beads-task-agent` collisions while continuing to register every non-conflicting definition.

## Agent

### beads-task-agent

A subagent for read-only status and graph analysis or one-bead task completion. Analysis requests never mutate beads; completion requests inspect and process one caller-selected or highest-priority ready bead, quarantine work created during that invocation, validate before closure, and return after closing or blocking the selected bead. Its configured prompt is role-specific; session injection supplies compact OpenCode-specific CLI, validation, delegation, and conservative commit/push/sync policy without duplicating `bd prime`.

## Compatibility

The compatibility ranges and validated baselines for this release are:

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode | 1.18.3 through 1.x | 1.18.4 |
| `bd` CLI | 1.0.5 through 1.x | 1.1.0 |
| Bun | >=1.3.14 | 1.3.14 |

The OpenCode adapter builds against the exact paired `@opencode-ai/plugin` and `@opencode-ai/sdk` `1.18.4` releases and declares compatible optional peers from `1.18.3` through the stable `1.x` line. Both imports are type-only; the package does not install a second OpenCode runtime. Command and agent provenance is currently synced from Beads v1.1.0. Newer compatible releases may work but are not guaranteed until validated; when diagnosing a regression, reproduce it with the baselines above.

## Vendored Content

Files under `vendor/` are copied from the upstream Beads plugin by [`scripts/sync-beads.sh`](scripts/sync-beads.sh). The current inventory includes the complete upstream command-template directory and task agent, rather than a duplicate of the much larger `bd` CLI. [`vendor/manifest.json`](vendor/manifest.json) records the stable upstream tag and commit, source paths, sorted inventory, byte lengths, and SHA-256 checksums. A deterministic adaptation layer translates known MCP- or Claude-specific instructions to OpenCode's CLI-only model when prompts load; sync fails if provenance, checksums, inventory, or reviewed transformations differ. Do not edit vendored files directly: the next sync replaces them. Adapter behavior lives in `src/`, while general Beads behavior and documentation remain upstream.

The vendor manifest, task agent, and every recorded command file are required package content. Their exact upstream source paths, inventory, byte lengths, and hashes are strict package inputs. Plugin loading fails with the artifact path and validation reason if required content is missing or malformed. Command frontmatter supports `description`, `argument-hint`, `agent`, `model`, and `subtask`; task-agent frontmatter supports `description`, `mode: subagent`, `model`, `temperature`, `top_p`, `disable`, `color`, and `maxSteps`. Unsupported fields or shapes fail validation so upstream changes receive explicit review. Reinstall the package or rerun the sync script from a source checkout rather than repairing generated files by hand.

## Troubleshooting

- **No Beads context:** Run `bd prime` in the project. Install `bd` if the command is missing, or run `bd init` if the project has no Beads workspace.
- **Canonical skill is missing:** Confirm the project is a Git worktree, then run `bd init`. The automatic Codex project integration creates `.agents/skills/beads`.
- **Upgrading from 0.8.0:** Run the exact version-pinned removal command in the upgrade section before updating the plugin pin, then use `bd init` for canonical per-project setup.
- **Vendor artifact initialization error:** Reinstall the package. If using a source checkout, rerun the vendor sync and validation scripts; the error names the missing or malformed manifest, command, or task-agent file.
- **Unexpected command or agent definition:** Check the OpenCode configuration for a colliding `beads:*` or `beads-task-agent` entry. Your explicit configuration wins on an exact name collision; OpenCode logs a rate-limited warning naming the collision.
- **A regular subagent has no Beads context:** This is intentional. Delegate Beads work to `beads-task-agent`, or run the required `bd` command explicitly.
- **Behavior changed after an upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then check the [Beads releases](https://github.com/gastownhall/beads/releases) and this project's changelog.

## License

opencode-beads is licensed under the MIT license. See the [`LICENSE`](LICENSE) file for more information.

---

opencode-beads is not built by, or affiliated with, the OpenCode team.

OpenCode is ©2025 Anomaly.
