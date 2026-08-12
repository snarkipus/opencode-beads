# opencode-beads

[Beads](https://github.com/gastownhall/beads) issue tracker integration for [OpenCode](https://opencode.ai).

`@snarkipus/opencode-beads` is a maintained OpenCode adapter that provides full `bd prime` context injection, vendored `/beads:*` workflows, and a bounded task agent. It does not replace Beads: the installed `bd` CLI remains authoritative for issues, project initialization, skills, migrations, backups, and Dolt synchronization.

The project originated as [Josh Thomas's `opencode-beads`](https://github.com/joshuadavidthomas/opencode-beads) and continues under the MIT license. This fork is maintained by Matt Jackson and tracks reviewed upstream Beads releases while adapting their plugin artifacts to OpenCode's CLI-only execution model.

## Design

The plugin's primary design is **context-preserving atomic delegation**:

- The primary OpenCode thread retains planning context, decisions, and control.
- `beads-task-agent` processes exactly one Bead per invocation, then closes, blocks, or returns.
- Without an external orchestrator, this intentionally trades broad autonomy for Bead atomicity and context preservation.
- An orchestrator may repeat `select → delegate one Bead → verify → select next`, but should not weaken the worker boundary.

## Installation

Install the [`bd` CLI](https://github.com/gastownhall/beads/blob/main/docs/getting-started/installation.md) once on the host, then initialize each project:

```bash
git init # only when the directory is not already a Git worktree
bd init
```

`bd init` owns project initialization and creates the canonical shared Beads skill at `.agents/skills/beads`, which OpenCode discovers. This plugin has no separate skill lifecycle and does not write startup files.

Add the version-pinned plugin to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@snarkipus/opencode-beads@0.9.3"]
}
```

Restart OpenCode. Update the pin explicitly when upgrading; an unpinned package entry is less reproducible.

## Context injection

The plugin runs full `bd prime` when a primary-agent session first receives a message and after compaction. Prime supplies the canonical current workflow, command guidance, and persistent memories; the plugin adds only compact OpenCode-specific safety and delegation guidance.

Known regular subagents remain excluded, including `explore` and `general`, while `beads-task-agent` remains eligible. If agent lookup fails, context injection fails open to preserve compatibility with unknown custom primary agents.

If `bd` is unavailable, the project is uninitialized, or prime fails or returns no content, injection is silently skipped and remains retryable. Vendored commands stay available, and the task agent retains a bounded standalone quick reference for `ready`, `show`, atomic claim, discovered follow-up, validate before closure, and close.

## Commands

Vendored workflows are registered under `/beads:*`, including `/beads:ready`, `/beads:create`, and `/beads:show`. The plugin does not generate a command for every `bd` subcommand; use the CLI and the generated [Beads CLI reference](https://beads.gascity.com/cli-reference/index) for the complete surface.

Explicit command and agent definitions in OpenCode configuration take precedence over plugin definitions with the same name. Exact `beads:*` or `beads-task-agent` collisions produce a grouped, rate-limited warning without preventing non-conflicting definitions from loading.

## Task agent

`beads-task-agent` supports read-only status and graph analysis or one-Bead completion. Analysis requests never mutate Beads. Completion requests inspect and process one caller-selected or highest-priority ready Bead, quarantine work discovered during that invocation, validate before closure, and return after closing or blocking the selected Bead.

Its runtime prompt is a fork-owned bounded OpenCode adaptation. The vendored upstream task-agent artifact supplies metadata, provenance, and compatibility validation; it is not executed as upstream's autonomous multi-task loop.

## Vendored content

[`scripts/sync-beads.sh`](scripts/sync-beads.sh) copies the reviewed upstream command templates and task-agent artifact into `vendor/`. [`vendor/manifest.json`](vendor/manifest.json) pins the upstream tag and commit and records source paths, sorted inventory, byte lengths, and SHA-256 checksums. A deterministic adaptation layer translates reviewed host-specific instructions to OpenCode's CLI-only model.

Do not edit vendored files directly. Sync and package validation reject provenance, checksum, inventory, schema, or reviewed-transformation drift. Adapter behavior lives in `src/`; general Beads behavior and documentation remain upstream.

## Compatibility

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode | 1.18.3 through 1.x | 1.18.15 |
| `bd` CLI | 1.0.5 through 1.x | 1.1.2 |
| Bun | >=1.3.14 | 1.3.14 |

The adapter builds against paired `@opencode-ai/plugin` and `@opencode-ai/sdk` 1.18.15 releases and declares compatible optional peers from 1.18.3 through stable 1.x. Command and agent provenance is synced from Beads v1.2.1.

## Troubleshooting

- **No Beads context:** Run `bd prime`. Install `bd` if missing or run `bd init` if the project has no Beads workspace.
- **Canonical skill missing:** For a new workspace, run `bd init`. For an existing workspace, follow current upstream Beads guidance; this plugin does not install or repair skills.
- **Vendor initialization error:** Reinstall the package. In a source checkout, rerun vendor sync and validation; the error identifies the malformed or missing artifact.
- **Unexpected definition:** Check OpenCode configuration for a colliding `beads:*` command or `beads-task-agent` definition. Explicit configuration wins.
- **Regular subagent has no context:** This is intentional. Delegate Beads work to `beads-task-agent` or run the required `bd` command explicitly.
- **Behavior changed after upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then inspect [Beads releases](https://github.com/gastownhall/beads/releases) and this project's changelog.

## License

opencode-beads is licensed under the MIT license. See [`LICENSE`](LICENSE).

opencode-beads is not built by or affiliated with the OpenCode team. OpenCode is ©2025 Anomaly.
