# opencode-beads

[Beads](https://github.com/gastownhall/beads) issue tracker integration for [OpenCode](https://opencode.ai).

This maintained fork provides the OpenCode-facing product layer around Beads: full `bd prime` context injection, vendored workflows, an autonomous task agent, project-scoped runtime integration, and an explicit managed companion skill lifecycle. It is deliberately an adapter rather than a second issue tracker: the `bd` CLI remains authoritative for issues, Dolt synchronization, migrations, and general Beads behavior.

The project originated as [Josh Thomas's `opencode-beads`](https://github.com/joshuadavidthomas/opencode-beads) and continues under the MIT license. This fork is maintained by Matt Jackson and tracks reviewed upstream Beads releases while adapting their plugin artifacts to OpenCode's CLI-only execution model.

## Installation

Install the beads CLI:

```bash
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
```

See the [Beads installation guide](https://github.com/gastownhall/beads/blob/main/docs/getting-started/installation.md) for alternative methods (Homebrew, Windows, AUR, etc.).

Add the version-pinned plugin to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["@snarkipus/opencode-beads@0.8.0"]
}
```

Restart OpenCode. OpenCode caches pinned plugins, so update this version explicitly when upgrading. An unpinned `@snarkipus/opencode-beads` entry follows npm updates on startup but is less reproducible.

In a project without a Beads database, run `/beads:init` or `bd init` before using issue commands. This initializes Beads data only; it does not install the companion OpenCode skill.

### Optional skill

Install the companion OpenCode skill for durable Beads guidance in the current Git worktree:

```bash
bunx @snarkipus/opencode-beads@0.8.0 init
```

The project target is `<worktree>/.opencode/skills/beads`, even when the command runs from a nested directory. Use `init --global` for `$XDG_CONFIG_HOME/opencode/skills/beads` when `XDG_CONFIG_HOME` is absolute, otherwise `~/.config/opencode/skills/beads`.

The package CLI is the canonical lifecycle because OpenCode does not guarantee that plugin npm bins are on `PATH`:

```bash
bunx @snarkipus/opencode-beads@0.8.0 init [--global]
bunx @snarkipus/opencode-beads@0.8.0 check [--global]
bunx @snarkipus/opencode-beads@0.8.0 update [--global]
bunx @snarkipus/opencode-beads@0.8.0 remove [--global]
```

Every command supports `--dry-run` for an exact non-mutating plan and `--json` for one deterministic result object. Add `--global` to select the global scope. `/beads:setup` prints commands for the running package version; it does not write files. `/beads:init` remains DB-only.

Lifecycle states are:

| State | Meaning |
| --- | --- |
| `missing` | The selected target does not exist. |
| `current` | The ownership manifest, package metadata, inventory, and file hashes match. |
| `stale` | The target is recognized and unmodified, but its managed package or provenance metadata differs from the running package. |
| `modified` | The target has a recognized manifest, but a managed file, hash, symlink, or inventory differs. |
| `conflicting` | The target is unmanaged or differently managed, another discovered Beads skill blocks the operation, or stale transaction residue exists. |

`init` installs a missing target or safely refreshes a recognized stale target. `update` changes only a recognized stale target whose old managed hashes still match. `init` and `update` are no-ops for current targets. `remove` deletes only a recognized, unmodified current or stale target. Modified and conflicting targets are never overwritten or removed, and there is no force option.

Before `init` or `update`, discovery checks `.opencode/skills/beads`, `.agents/skills/beads`, and `.claude/skills/beads` from the current directory through the Git worktree root, plus their global equivalents. Unrelated discovered skills block writes. `remove` may remove the selected verified-owned target despite an unrelated skill elsewhere, but stale transaction residue still blocks it.

The lifecycle is fully offline from immutable package artifacts. Updates use sibling staging, backup, and recovery directories so caught filesystem errors restore the prior installation; this does not claim crash-proof atomicity across multiple renames. OpenCode does not discover skills inside npm packages, so passive npm discovery is unsupported. Plugin startup is read-only and never installs, updates, or removes skill files automatically.

CLI exit codes are stable:

| Exit | Meaning |
| --- | --- |
| `0` | Lifecycle command succeeded, or `check` found the current managed skill. |
| `1` | `check` found a missing, stale, modified, or conflicting skill. |
| `2` | Invalid usage, lifecycle refusal, package validation failure, git discovery failure, or operational error. |

With `--json`, every exit writes exactly one JSON object plus a trailing newline to stdout and writes nothing to stderr. The stable `code` and `message` fields classify success, non-current checks, refusals, usage errors, discovery failures, package failures, and other operational failures.

## Features

- **Context injection** - Loads the canonical Beads workflow and persistent memories on session start and after compaction
- **Commands** - Vendored Beads workflows plus native `/beads:setup`, available under the `/beads:*` namespace
- **Task agent** - Autonomous issue completion via `beads-task-agent` subagent

## Usage

This plugin is a thin OpenCode adapter. For Beads workflows, CLI commands, Dolt operations, migrations, backups, and issue-tracking concepts, use the [upstream documentation](https://github.com/gastownhall/beads) or run `bd prime`.

### Context behavior

The plugin runs full `bd prime` when a primary-agent session first receives a message and after compaction, matching the canonical workflow pattern used by the upstream Claude Code and Codex integrations. The prime output supplies the current workflow, command guidance, and persistent memories; a compact shared layer adds only OpenCode-specific CLI safety and primary-agent delegation. Regular task subagents such as `explore` and `general` are deliberately skipped, while the included `beads-task-agent` remains explicitly eligible.

If `bd` is unavailable, the project is not initialized, or prime fails or returns no content, context injection is silently skipped and remains retryable. Vendored commands remain visible, the runtime does not initialize Beads or write startup files, and the task agent retains a bounded standalone quick reference for `ready`, `show`, atomic claim, discovered follow-up, and close. That fallback tells the agent to run `bd prime` when injected context is missing or stale; it does not duplicate the full live workflow.

## Commands

Commands are available as `/beads:<name>`, for example `/beads:ready`, `/beads:create`, and `/beads:show`. The plugin vendors every command template published by the upstream Beads plugin; it does not generate an OpenCode command for every `bd` subcommand. Use the `bd` CLI for the complete command surface and consult the generated [CLI reference](https://beads.gascity.com/cli-reference/index).

Explicit command and agent definitions in your OpenCode configuration take precedence over plugin-provided definitions with the same name. The plugin emits a grouped, rate-limited warning for exact `beads:*` or `beads-task-agent` collisions while continuing to register every non-conflicting definition.

This configuration precedence is separate from skill-file collision safety. User-defined commands and agents win without blocking plugin startup; unmanaged, differently managed, or modified skill files instead cause the explicit companion CLI operation to refuse without mutation.

## Agent

### beads-task-agent

A subagent for read-only status and graph analysis or one-bead task completion. Analysis requests never mutate beads; completion requests inspect and process one caller-selected or highest-priority ready bead, quarantine work created during that invocation, and return after closing or blocking the selected bead. Its configured prompt is role-specific; session injection supplies the shared CLI and lifecycle safety rules once.

## Compatibility

The compatibility ranges and validated baselines for this release are:

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode | 1.18.3 through 1.x | 1.18.4 |
| `bd` CLI | 1.0.5 through 1.x | 1.1.0 |
| Bun | >=1.3.14 | 1.3.14 |

The OpenCode adapter builds against the exact paired `@opencode-ai/plugin` and `@opencode-ai/sdk` `1.18.4` releases and declares compatible optional peers from `1.18.3` through the stable `1.x` line. Both imports are type-only; the package does not install a second OpenCode runtime. The command, agent, and managed-skill provenance is currently synced from Beads v1.1.0. Newer compatible releases may work but are not guaranteed until validated; when diagnosing a regression, reproduce it with the baselines above.

## Vendored Content

Files under `vendor/` are copied from the upstream Beads plugin by [`scripts/sync-beads.sh`](scripts/sync-beads.sh). The current inventory includes the complete upstream command-template directory and task agent, rather than a duplicate of the much larger `bd` CLI. [`vendor/manifest.json`](vendor/manifest.json) records the stable upstream tag and commit, source paths, sorted inventory, byte lengths, and SHA-256 checksums. A deterministic adaptation layer translates known MCP- or Claude-specific instructions to OpenCode's CLI-only model when prompts load; sync fails if provenance, checksums, inventory, or reviewed transformations differ. Do not edit vendored files directly: the next sync replaces them. Adapter behavior lives in `src/`, while general Beads behavior and documentation remain upstream.

The vendor manifest, task agent, and every recorded command file are required package content. The separately reviewed skill fork records exact upstream source paths and hashes mapped to each adapted output in `dist/init/manifest.json`; these mappings, the output inventory, and output hashes are all strict package inputs. Initialization fails with the artifact path and validation reason if required content is missing or malformed. Command frontmatter supports `description`, `argument-hint`, `agent`, `model`, and `subtask`; task-agent frontmatter supports `description`, `mode: subagent`, `model`, `temperature`, `top_p`, `disable`, `color`, and `maxSteps`. Unsupported fields or shapes fail validation so upstream changes receive explicit review. Reinstall the package or rerun the sync script from a source checkout rather than repairing generated files by hand.

## Troubleshooting

- **No Beads context:** Run `bd prime` in the project. Install `bd` if the command is missing, or run `bd init` if the project has no Beads workspace.
- **Managed skill is missing:** Run `bunx @snarkipus/opencode-beads@0.8.0 init [--global]`. Use the same scope for later lifecycle commands.
- **Managed skill is stale:** Run `bunx @snarkipus/opencode-beads@0.8.0 update [--global]`. The command proceeds only if every old managed hash still matches.
- **Managed skill is modified:** Preserve or revert local edits before retrying. To discard an installation deliberately, move the entire target out of every OpenCode discovery root, then run `init`; no force mode exists.
- **Managed skill is conflicting:** Run `check --json` with the intended scope and inspect `target` and `collisions`. Move or remove unmanaged or differently managed Beads skills deliberately, then retry. Do not treat another discovery root as the selected target.
- **Stale transaction residue:** Preserve and inspect sibling `.beads.opencode-beads-stage-*`, `-backup-*`, or `-recovery-*` directories before manual recovery. The CLI refuses to guess which residue is authoritative.
- **Global target is unexpected:** Use an absolute `XDG_CONFIG_HOME` for `$XDG_CONFIG_HOME/opencode/skills/beads`; relative or absent values intentionally fall back to `~/.config/opencode/skills/beads`. Global `.agents` and `.claude` roots remain under the home directory.
- **Lifecycle reports package validation failure:** Reinstall the exact scoped package version. The CLI will not install from missing, unexpected, or checksum-invalid packaged artifacts.
- **Lifecycle cannot discover Git:** Run the command inside the intended Git worktree. Project and global lifecycle operations both require a worktree boundary for collision discovery.
- **Vendor artifact initialization error:** Reinstall the package. If using a source checkout, rerun the vendor sync and validation scripts; the error names the missing or malformed manifest, command, or task-agent file.
- **Unexpected command or agent definition:** Check the OpenCode configuration for a colliding `beads:*` or `beads-task-agent` entry. Your explicit configuration wins on an exact name collision; OpenCode logs a rate-limited warning naming the collision.
- **A regular subagent has no Beads context:** This is intentional. Delegate Beads work to `beads-task-agent`, or run the required `bd` command explicitly.
- **Behavior changed after an upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then check the [Beads releases](https://github.com/gastownhall/beads/releases) and this project's changelog.

## License

opencode-beads is licensed under the MIT license. See the [`LICENSE`](LICENSE) file for more information.

---

opencode-beads is not built by, or affiliated with, the OpenCode team.

OpenCode is ©2025 Anomaly.
