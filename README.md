# opencode-beads

[Beads](https://github.com/gastownhall/beads) issue tracker integration for [OpenCode](https://opencode.ai).

> [!NOTE]
> This plugin is intentionally small in scope. The [beads](https://github.com/gastownhall/beads) project is moving quickly and is a moving target; any additional layers on top of it add churn.
>
> To minimize maintenance, this plugin defers to beads and limits its scope to bug fixes and syncing upstream vendor plugin content. Feature requests and additional customization are generally out of scope.
>
> If you want to customize behavior, the plugin surface area is small; forking or copying it locally is encouraged.

## Installation

Install the beads CLI:

```bash
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
```

See the [Beads installation guide](https://github.com/gastownhall/beads/blob/main/docs/getting-started/installation.md) for alternative methods (Homebrew, Windows, AUR, etc.).

Add to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["opencode-beads"]
}
```

Restart OpenCode. In a project that does not have a Beads workspace yet, run `/beads:init` or `bd init` before using issue commands.

Optionally, pin to a specific version for stability:

```json
{
  "plugin": ["opencode-beads@0.7.0"]
}
```

OpenCode fetches unpinned plugins from npm on each startup; pinned versions are cached and require a manual version bump to update.

## Features

- **Context injection** - Automatically runs `bd prime` on session start and after compaction, keeping your agent aware of current issues
- **Commands** - Vendored Beads workflows available under the `/beads:*` namespace
- **Task agent** - Autonomous issue completion via `beads-task-agent` subagent

## Usage

This plugin is a thin OpenCode adapter. For Beads workflows, CLI commands, Dolt operations, migrations, backups, and issue-tracking concepts, use the [upstream documentation](https://github.com/gastownhall/beads) or run `bd prime`.

The plugin injects the output of `bd prime` when a primary-agent session first receives a message and after compaction. Regular task subagents such as `explore` and `general` are deliberately skipped to avoid irrelevant context and side effects. The included `beads-task-agent` always receives Beads context.

If `bd` is unavailable, the project is not initialized, or `bd prime` fails or returns no content, context injection is silently skipped. The OpenCode session continues normally. Vendored commands remain visible, but commands that invoke `bd` will report the underlying CLI error.

## Commands

Commands are available as `/beads:<name>`, for example `/beads:ready`, `/beads:create`, and `/beads:show`. The plugin vendors every command template published by the upstream Beads plugin; it does not generate an OpenCode command for every `bd` subcommand. Use the `bd` CLI for the complete command surface and consult the generated [CLI reference](https://beads.gascity.com/cli-reference/index).

Plugin-provided command and agent definitions take precedence when the OpenCode configuration already contains the same `beads:*` command name or the `beads-task-agent` name. Rename or remove the colliding local definition if that override is not desired.

## Agent

### beads-task-agent

A subagent for autonomous issue completion. Designed to work through issues independently, updating status and handling dependencies.

## Compatibility

The compatibility ranges and validated baselines for this release are:

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode | 1.x | 1.18.3 |
| `bd` CLI | 1.0.5 through 1.x | 1.1.0 |
| Bun | >=1.0.0 | 1.3.14 |

The OpenCode adapter builds against `@opencode-ai/plugin` and `@opencode-ai/sdk` `^1.0.143`. The command and agent content is currently synced from Beads v1.0.5. Newer compatible releases may work but are not guaranteed until validated; when diagnosing a regression, reproduce it with the baselines above.

## Vendored Content

Files under `vendor/` are copied from the upstream Beads plugin by [`scripts/sync-beads.sh`](scripts/sync-beads.sh). The current inventory includes the complete upstream command-template directory and task agent, rather than a duplicate of the much larger `bd` CLI. Do not edit these files directly: the next sync replaces the command and agent directories. Adapter behavior lives in `src/`, while general Beads behavior and documentation remain upstream.

If vendored files are absent or malformed, the plugin still loads but omits the affected commands or `beads-task-agent`. Reinstall the package or rerun the sync script from a source checkout rather than repairing generated files by hand.

## Troubleshooting

- **No Beads context:** Run `bd prime` in the project. Install `bd` if the command is missing, or run `bd init` if the project has no Beads workspace.
- **No `/beads:*` commands or task agent:** Restart OpenCode after installing the plugin. If using a source checkout, confirm `vendor/commands/` and `vendor/agents/task-agent.md` exist.
- **Unexpected command or agent definition:** Check the OpenCode configuration for a colliding `beads:*` or `beads-task-agent` entry. The plugin definition wins on an exact name collision.
- **A regular subagent has no Beads context:** This is intentional. Delegate Beads work to `beads-task-agent`, or run the required `bd` command explicitly.
- **Behavior changed after an upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then check the [Beads releases](https://github.com/gastownhall/beads/releases) and this project's changelog.

## License

opencode-beads is licensed under the MIT license. See the [`LICENSE`](LICENSE) file for more information.

---

opencode-beads is not built by, or affiliated with, the OpenCode team.

OpenCode is ©2025 Anomaly.
