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
  "plugin": ["@snarkipus/opencode-beads"]
}
```

Restart OpenCode. In a project that does not have a Beads workspace yet, run `/beads:init` or `bd init` before using issue commands.

### Optional skill

Install the companion OpenCode skill for durable Beads guidance in the current worktree:

```bash
bunx @snarkipus/opencode-beads@0.7.0 init
```

Use `--global` to target `$XDG_CONFIG_HOME/opencode/skills/beads` when `XDG_CONFIG_HOME` is absolute, otherwise `~/.config/opencode/skills/beads`. The same scope flag applies to every lifecycle command:

```bash
bunx @snarkipus/opencode-beads@0.7.0 check [--global]
bunx @snarkipus/opencode-beads@0.7.0 update [--global]
bunx @snarkipus/opencode-beads@0.7.0 remove [--global]
```

All commands support `--dry-run` and `--json`. Installation is offline from immutable package artifacts, refuses unmanaged or locally modified content and other discovered `beads` skills, and never runs during plugin startup. A verified owned target may still be removed when another skill exists, allowing removal to resolve a duplicate installation; stale transaction residue continues to block removal. Updates are assembled in a sibling staging directory and swapped with a validated backup so ordinary filesystem errors restore the prior installation; this is rollback safety, not a claim of crash-proof multi-rename atomicity. The package CLI is the canonical setup lifecycle. `/beads:setup` provides the version-matched commands, while `/beads:init` is DB-only and initializes the Beads database rather than the OpenCode skill.

CLI exit codes are stable:

| Exit | Meaning |
| --- | --- |
| `0` | Lifecycle command succeeded, or `check` found the current managed skill. |
| `1` | `check` found a missing, stale, modified, or conflicting skill. |
| `2` | Invalid usage, lifecycle refusal, package validation failure, git discovery failure, or operational error. |

With `--json`, every exit writes exactly one JSON object plus a trailing newline to stdout and writes nothing to stderr. The stable `code` and `message` fields classify success, non-current checks, refusals, usage errors, discovery failures, package failures, and other operational failures.

Optionally, pin to a specific version for stability:

```json
{
  "plugin": ["@snarkipus/opencode-beads@0.7.0"]
}
```

OpenCode fetches unpinned plugins from npm on each startup; pinned versions are cached and require a manual version bump to update.

## Features

- **Context injection** - Loads persistent Beads memories on session start and after compaction without duplicating the full workflow reference
- **Commands** - Vendored Beads workflows plus native `/beads:setup`, available under the `/beads:*` namespace
- **Task agent** - Autonomous issue completion via `beads-task-agent` subagent

## Usage

This plugin is a thin OpenCode adapter. For Beads workflows, CLI commands, Dolt operations, migrations, backups, and issue-tracking concepts, use the [upstream documentation](https://github.com/gastownhall/beads) or run `bd prime`.

The plugin runs `bd prime --memories-only` when a primary-agent session first receives a message and after compaction. A compact shared layer supplies OpenCode-specific CLI and workflow safety, while `bd <command> --help` remains authoritative for current syntax. Regular task subagents such as `explore` and `general` are deliberately skipped; the included `beads-task-agent` receives memories and shared safety without primary-agent delegation prose.

Older compatible `bd` versions that reject `--memories-only` fall back once to full `bd prime`; other failures do not trigger a second process. If `bd` is unavailable, the project is not initialized, or prime fails or returns no content, context injection is silently skipped and remains retryable. Vendored commands remain visible, and the task agent retains a minimal role prompt instructing it to run `bd` through `bash`.

## Commands

Commands are available as `/beads:<name>`, for example `/beads:ready`, `/beads:create`, and `/beads:show`. The plugin vendors every command template published by the upstream Beads plugin; it does not generate an OpenCode command for every `bd` subcommand. Use the `bd` CLI for the complete command surface and consult the generated [CLI reference](https://beads.gascity.com/cli-reference/index).

Explicit command and agent definitions in your OpenCode configuration take precedence over plugin-provided definitions with the same name. The plugin emits a grouped, rate-limited warning for exact `beads:*` or `beads-task-agent` collisions while continuing to register every non-conflicting definition.

## Agent

### beads-task-agent

A subagent for autonomous issue completion and concise status summaries. Its configured prompt is role-specific; session injection supplies the shared CLI and lifecycle safety rules once.

## Compatibility

The compatibility ranges and validated baselines for this release are:

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode | 1.18.3 through 1.x | 1.18.4 |
| `bd` CLI | 1.0.5 through 1.x | 1.1.0 |
| Bun | >=1.3.14 | 1.3.14 |

The OpenCode adapter builds against the exact paired `@opencode-ai/plugin` and `@opencode-ai/sdk` `1.18.4` releases and declares compatible optional peers from `1.18.3` through the stable `1.x` line. Both imports are type-only; the package does not install a second OpenCode runtime. The command and agent content is currently synced from Beads v1.0.5. Newer compatible releases may work but are not guaranteed until validated; when diagnosing a regression, reproduce it with the baselines above.

## Vendored Content

Files under `vendor/` are copied from the upstream Beads plugin by [`scripts/sync-beads.sh`](scripts/sync-beads.sh). The current inventory includes the complete upstream command-template directory and task agent, rather than a duplicate of the much larger `bd` CLI. [`vendor/manifest.json`](vendor/manifest.json) records the stable upstream tag and commit, source paths, sorted inventory, byte lengths, and SHA-256 checksums. A deterministic adaptation layer translates known MCP- or Claude-specific instructions to OpenCode's CLI-only model when prompts load; sync fails if provenance, checksums, inventory, or reviewed transformations differ. Do not edit vendored files directly: the next sync replaces them. Adapter behavior lives in `src/`, while general Beads behavior and documentation remain upstream.

The vendor manifest, task agent, and every recorded command file are required package content. The separately reviewed skill fork records exact upstream source paths and hashes mapped to each adapted output in `dist/init/manifest.json`; these mappings, the output inventory, and output hashes are all strict package inputs. Initialization fails with the artifact path and validation reason if required content is missing or malformed. Command frontmatter supports `description`, `argument-hint`, `agent`, `model`, and `subtask`; task-agent frontmatter supports `description`, `mode: subagent`, `model`, `temperature`, `top_p`, `disable`, `color`, and `maxSteps`. Unsupported fields or shapes fail validation so upstream changes receive explicit review. Reinstall the package or rerun the sync script from a source checkout rather than repairing generated files by hand.

## Troubleshooting

- **No Beads context:** Run `bd prime --memories-only` in the project. Install `bd` if the command is missing, or run `bd init` if the project has no Beads workspace. Older versions may use full `bd prime`.
- **Vendor artifact initialization error:** Reinstall the package. If using a source checkout, rerun the vendor sync and validation scripts; the error names the missing or malformed manifest, command, or task-agent file.
- **Unexpected command or agent definition:** Check the OpenCode configuration for a colliding `beads:*` or `beads-task-agent` entry. Your explicit configuration wins on an exact name collision; OpenCode logs a rate-limited warning naming the collision.
- **A regular subagent has no Beads context:** This is intentional. Delegate Beads work to `beads-task-agent`, or run the required `bd` command explicitly.
- **Behavior changed after an upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then check the [Beads releases](https://github.com/gastownhall/beads/releases) and this project's changelog.

## License

opencode-beads is licensed under the MIT license. See the [`LICENSE`](LICENSE) file for more information.

---

opencode-beads is not built by, or affiliated with, the OpenCode team.

OpenCode is ©2025 Anomaly.
