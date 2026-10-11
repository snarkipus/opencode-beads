# opencode-beads

[Beads](https://github.com/gastownhall/beads) issue tracker integration for [OpenCode](https://opencode.ai).

`@snarkipus/opencode-beads` is a maintained OpenCode adapter that provides full `bd prime` context injection and a bounded task agent. It does not replace Beads: the installed `bd` CLI remains authoritative for issues, project initialization, skills, migrations, backups, and Dolt synchronization.

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

This plugin requires OpenCode 2 and `bd` 1.3.0 or later. Add the version-pinned plugin to `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["@snarkipus/opencode-beads@1.0.0"]
}
```

Plugin options use the object form:

```json
{
  "plugins": [
    {
      "package": "@snarkipus/opencode-beads@1.0.0",
      "options": { "luna": true, "autoMigrate": false }
    }
  ]
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `luna` | `false` | Also register the `beads-task-agent-luna` profile. |
| `autoMigrate` | `false` | Let automatic `bd prime` open a store that may need a schema migration. See [Schema migration guard](#schema-migration-guard). |

OpenCode loads configuration changes automatically. Update the pin explicitly when upgrading; an unpinned package entry is less reproducible. OpenCode 1.x plugins are not supported; use 0.10.x or earlier there.

### 0.9.3 recovery notice

Version 0.9.3 contained command guidance from the withdrawn upstream Beads v1.2.1 release. This plugin did not bundle the `bd` binary or implement database migrations, but it could invoke a consumer-installed v1.2.1 binary through `bd prime`. Even one v1.2.1 execution could migrate the database. Upgrade the plugin package to 0.9.4 or later; if v1.2.1 was installed and may have run, also follow the [upstream database recovery guidance](https://github.com/gastownhall/beads/blob/v1.2.2/docs/RECOVERY-1.2.1.md).

## Context injection

The plugin runs full `bd prime` in the project directory and attaches its output to each model request through OpenCode's session context hook. The output is cached per session, so prime runs once per session rather than per request, and the cache is refreshed after compaction so persistent memories stay current. Attached context is not stored in the conversation, so compaction cannot drop it. Prime supplies the canonical current workflow, command guidance, and persistent memories; the plugin adds only compact OpenCode-specific safety and delegation guidance.

Known regular subagents remain excluded, including `explore` and `general`, while `beads-task-agent` and `beads-task-agent-luna` remain eligible. If agent lookup fails, context injection fails open to preserve compatibility with unknown custom primary agents.

If `bd` is unavailable, the project is uninitialized, or prime fails or returns no content, injection is skipped and retried after 30 seconds. Failures are logged as `[opencode-beads]` warnings. The task agent retains a bounded standalone quick reference for `ready`, `show`, atomic claim, discovered follow-up, validate before closure, and close.

## Schema migration guard

Beads 1.3 migrates an embedded store in place, irreversibly, the first time any command opens it, and `bd --readonly` does not prevent that. Because this plugin runs `bd prime` automatically, it would otherwise be the unattended first command after you upgrade `bd`.

Before running prime, the plugin checks `bd version` and `bd where --json`, which never open the store, and reads `.beads/.local_version`. If the installed `bd` is older than 1.3.0, or the store was last opened by an older `bd`, the plugin withholds prime and gives the agent a notice telling it not to run `bd` and to ask you to act. To proceed, back up the `.beads` directory and run `bd migrate schema`; the plugin picks up the change on its next retry. Setting the `autoMigrate` option skips the store-version check.

`bd prime` itself does not update `.beads/.local_version`. A store migrated only by prime keeps the old marker until you run `bd migrate schema` (or any ordinary `bd` command), which is safe and idempotent.

## Beads workflows

The plugin registers no `/beads:*` commands. Earlier versions vendored upstream's Claude Code command templates; they duplicated `bd prime` and the canonical Beads skill that `bd init` installs at `.agents/skills/beads`, which OpenCode discovers natively. Ask the agent to work with Beads, load the skill with `@beads`, or use the `bd` CLI and the generated [Beads CLI reference](https://beads.gascity.com/cli-reference/index) directly.

## Agent configuration

Entries under `agents` in OpenCode configuration override the plugin's task-agent fields one by one, so a partial override (for example only `description`) keeps the bounded `system` prompt and subagent `mode`. Fields you set explicitly, such as `system`, `model`, or `permissions`, win. OpenCode V2 does not expose configuration-only agents to plugins, so the plugin no longer warns about overrides.

## Task agent

`beads-task-agent` supports read-only status and graph analysis or one-Bead completion. Analysis requests never mutate Beads. Completion requests inspect and process one caller-selected or highest-priority ready Bead, quarantine work discovered during that invocation, validate before closure, and return after closing or blocking the selected Bead.

Its runtime prompt is a fork-owned bounded OpenCode adaptation. The vendored upstream task-agent artifact supplies metadata, provenance, and compatibility validation; it is not executed as upstream's autonomous multi-task loop.

### Opt-in Luna Max profile

The default `beads-task-agent` leaves its model unset, so a subagent inherits the parent session's model. Set the plugin option `"luna": true` to also register `beads-task-agent-luna`, which uses `openai/gpt-6-luna#max` with exactly the same prompt, subagent mode, and default permissions. Per-agent overrides remain independent: customizations to `beads-task-agent` are not copied to Luna. Both profiles receive full prime context and retain the same exact-one-Bead workflow.

Ask the primary agent to delegate to `beads-task-agent-luna` by name through the `subagent` tool. Default delegation guidance still names `beads-task-agent`; enabling Luna does not reroute existing calls or change the primary agent's model. Remove the option to unregister the profile.

Luna requires access to `openai/gpt-6-luna` and its `max` variant in your OpenCode provider setup. The plugin does not install models, configure authentication, or silently fall back to another model.

## Vendored content

[`scripts/sync-beads.sh`](scripts/sync-beads.sh) copies the reviewed upstream task-agent artifact into `vendor/`. [`vendor/manifest.json`](vendor/manifest.json) pins the upstream tag and commit and records source paths, sorted inventory, byte lengths, and SHA-256 checksums. A deterministic adaptation layer translates reviewed host-specific instructions to OpenCode's CLI-only model.

Do not edit vendored files directly. Sync and package validation reject provenance, checksum, inventory, schema, or reviewed-transformation drift. Adapter behavior lives in `src/`; general Beads behavior and documentation remain upstream.

## Compatibility

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode | 2.0.26 through 2.x | 2.0.26 |
| `bd` CLI | 1.3.0 through 1.x | 1.3.1 |
| Bun (OpenCode host runtime) | >=1.3.14 | 1.4.2 |

The adapter type-checks against `@opencode/plugin` 2.0.26 and declares it as an optional peer from 2.0.26 through 2.x; the import is type-only, so OpenCode's own runtime is used. See the [OpenCode V2 contract](docs/opencode-sdk-contract.md). Task-agent provenance is synced from Beads v1.3.1 at commit `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`.

## Troubleshooting

- **No Beads context:** Run `bd prime`. Install `bd` if missing or run `bd init` if the project has no Beads workspace.
- **Agent reports a Beads notice instead of context:** The schema migration guard withheld prime. Back up `.beads`, run `bd migrate schema`, and continue; or upgrade `bd` if the notice says it is older than 1.3.0.
- **Canonical skill missing:** For a new workspace, run `bd init`. For an existing workspace, follow current upstream Beads guidance; this plugin does not install or repair skills.
- **Vendor initialization error:** Reinstall the package. In a source checkout, rerun vendor sync and validation; the error identifies the malformed or missing artifact.
- **Unexpected definition:** Check OpenCode configuration for a colliding `beads-task-agent` definition. Explicit configuration wins.
- **Regular subagent has no context:** This is intentional. Delegate Beads work to `beads-task-agent` or run the required `bd` command explicitly.
- **Behavior changed after upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then inspect [Beads releases](https://github.com/gastownhall/beads/releases) and this project's changelog.

## License

opencode-beads is licensed under the MIT license. See [`LICENSE`](LICENSE).

opencode-beads is not built by or affiliated with the OpenCode team. OpenCode is ©2025 Anomaly.
