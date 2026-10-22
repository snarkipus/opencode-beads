# opencode-beads

[![CI](https://github.com/snarkipus/opencode-beads/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/snarkipus/opencode-beads/actions/workflows/ci.yml)
[![Release](https://github.com/snarkipus/opencode-beads/actions/workflows/release.yml/badge.svg)](https://github.com/snarkipus/opencode-beads/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/@snarkipus/opencode-beads)](https://www.npmjs.com/package/@snarkipus/opencode-beads)
[![zizmor](https://img.shields.io/badge/%F0%9F%8C%88-zizmor-white?labelColor=white)](https://zizmor.sh/)

[Beads](https://github.com/gastownhall/beads) issue tracker integration for [OpenCode](https://opencode.ai).

`@snarkipus/opencode-beads` is a maintained OpenCode adapter that gives OpenCode 2 the integration `bd setup claude` gives Claude Code: `bd prime` workflow context on every request, refreshed after compaction and when a session resumes, plus a bounded task agent. Published 1.0.2 completes one Bead per invocation; the published beta/next release follows the authorized scope. It does not replace Beads: the installed `bd` CLI remains authoritative for issues, project initialization, skills, migrations, backups, and Dolt synchronization.

This is an independent project maintained by Matt Jackson under the MIT license. It began as a fork of [Josh Thomas's `opencode-beads`](https://github.com/joshuadavidthomas/opencode-beads), and the original work remains credited to its author. 1.0 rebuilt the plugin for OpenCode 2, and development now continues here independently. It vendors nothing from upstream Beads; instead, every Beads release is checked against the `bd` behavior the plugin relies on (see [Tracking upstream Beads](#tracking-upstream-beads)).

This release is **1.1.0-beta.2**, an opt-in beta targeting npm dist-tag `next`; its integration diagnostic command is `oc-beads:diagnostics`. Beta.1 used `oc-beads:status`; the rename is documented below. The beta's normal public entrypoint enables the eleven qualified operations in the native `beads` code-mode namespace on supported hosts: find, get, edges, memories, recall, claim, note, selected-field update, close, create and remember. No wrapper, internal dependency injection, manual skill copy or activation setting is needed. The opt-in is selecting the beta artifact. The published stable 1.0.2 package is unchanged.

Beta.2 registers 29 `oc-beads:<stem>` workflows plus `oc-beads:diagnostics` through ordinary native command registration and owns its packaged `oc-beads` skill at the installed path, with all 15 corpus resources plus CODE_MODE and ADR (17 links). User configuration/file commands retain native precedence on load and rebuild; removing an override restores the package definition. Other plugin conflicts follow native ordering. Diagnostics reports observed registration and name/description mismatches; identical-description overrides and public owner identity remain unobservable.

Typed registration requires the host tool, permission and session interfaces. The integration diagnostic command reports unavailable interfaces honestly; actual request capabilities, catalog discovery and per-operation permissions determine which operations can run. Native shell remains direct-only and cannot be called inside execute. Structured results preserve partial, failed and uncertain outcomes, and writes retain the actual session-and-agent Beads actor. Read [CODE_MODE.md](assets/oc-beads/resources/CODE_MODE.md) for composition and recovery.

All 16 implementation tasks have parent acceptance on exact OpenCode 2.1.1 / Beads 1.3.1. The [final acceptance record](docs/code-mode-final-acceptance-vuy9.md) and [bounded installed/model evaluation](docs/opencode-installed-model-continuation-vuy9.md) retain their historical candidates and probes; the published beta adds the public entrypoint and release-channel wiring. **Known limitation:** plain decline of a nested permission request does not stop the entire composition; a later independent operation can ask again. Use explicit Stop/Cancel to stop the composition. No token-saving, cross-provider checkpoint portability or multi-hour reliability claim is made.

## Design

The published beta/next release uses scope-bounded task execution:

- The primary OpenCode thread retains planning context, decisions, and control.
- An exact assignment or explicit one-bead mode stops with that item; read-only graph requests never authorize claims or writes.
- An already-authorized batch or goal may continue within scope, with an atomic claim, append checkpoints, validation and acceptance evidence for each Bead. Discovery does not expand that authority.
- Direct work or normal blocking delegation is chosen for the task. The actual executor actor follows claims, updates and heartbeats; handoffs are deliberate. Parent-owned acceptance and closure remain with the parent.
- Denied authority, cancellation, permission waits, blockers and incomplete acceptance remain visible stops. Child results do not restart work. The [current bounded semantic evidence](docs/opencode-installed-model-continuation-vuy9.md) measures these outcomes, with failed validation and partial work preserved; broader model quality and multi-hour reliability remain unmeasured.

## Installation

The beta requires OpenCode `>=2.1.1 <2.2` and `bd` 1.3.1 or later. Exact OpenCode 2.1.1 has bounded native, Stop and installed/model evidence; other admitted 2.1 patches are not inferred qualified. The external `bd` CLI and project initialization remain prerequisites; the plugin does not install or upgrade them. Stable 1.0.2 remains separately qualified against OpenCode 2.0.26.
1. Install the [`bd` CLI](https://github.com/gastownhall/beads/blob/main/docs/getting-started/installation.md) once on the host, then initialize each project:

   ```bash
   git init # only when the directory is not already a Git worktree
   bd init
   ```

   `bd init` owns project initialization and creates the canonical shared Beads skill at `.agents/skills/beads`, which OpenCode discovers. It also writes a minimal Beads section to `AGENTS.md` that points to `bd prime`, the same pointer Beads gives Claude Code in `CLAUDE.md`. The published stable package relies on that shared skill. The beta additionally owns its packaged `oc-beads` skill; it does not write startup files or change `.agents/skills/beads/SKILL.md`.

2. Add the published, version-pinned plugin to `~/.config/opencode/opencode.json` for every project, or to a project's `.opencode/opencode.json`:

   ```json
   {
     "plugins": ["@snarkipus/opencode-beads@1.1.0-beta.2"]
   }
   ```

   To follow the published beta channel, use `"plugins": ["@snarkipus/opencode-beads@next"]` instead. To stay on stable, use `"plugins": ["@snarkipus/opencode-beads@latest"]` (currently 1.0.2); do not select the beta. Stable promotion requires separate approval.

   OpenCode loads configuration changes automatically. Update the pin explicitly when upgrading; an unpinned package entry is less reproducible. OpenCode 1.x plugins are not supported; use 0.10.x or earlier there.

3. Check the beta.2 install: `opencode debug agents` lists `beads-task-agent`; `/oc-beads:diagnostics` reports native registration and observed capabilities. Discover `beads` through execute on a host/agent with the required permissions. An installation still pinned to beta.1 continues to use `/oc-beads:status` until explicitly upgraded.

### Plugin options

Plugin options use the object form:

```json
{
  "plugins": [
    {
      "package": "@snarkipus/opencode-beads@1.1.0-beta.2",
      "options": { "luna": true, "autoMigrate": false }
    }
  ]
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `luna` | `false` | Also register the `beads-task-agent-luna` profile. |
| `stealth` | `false` | Add `--stealth` to `bd prime` (no git operations in the session-close protocol), like `bd setup claude --stealth`. `bd config set no-git-ops true` is the project-level equivalent. |
| `taskAgentSteps` | `100` | Interruption cap on task-agent steps per invocation. `0` removes the cap; neither value changes authorized scope or establishes completion. |
| `refreshAfterIdleMinutes` | `30` | Re-run `bd prime` when a session resumes after this much inactivity, as Claude Code does on resume. `0` disables idle refresh. |
| `autoMigrate` | `false` | Let automatic `bd prime` open a store that may need a schema migration. See [Schema migration guard](#schema-migration-guard). |

### Why not `bd setup opencode`

**Do not run `bd setup opencode`.** That recipe is for OpenCode without this plugin. Beads assumes OpenCode has no hooks, so it replaces `bd init`'s minimal pointer with the full command reference, about 2 kB more on every request. With this plugin, `bd prime` arrives through OpenCode's hooks instead, as it does for Claude Code. If you already ran it, `bd setup opencode --remove` deletes the Beads section from `AGENTS.md` (prime still arrives through the plugin), or simply leave it: while prime is attached, the plugin replaces it in the request with a one-line pointer.

### Parity with `bd setup claude`

Installing the plugin gives OpenCode the same integration that `bd setup claude` gives Claude Code:

| `bd setup claude` (Claude Code) | This plugin (OpenCode 2) |
| --- | --- |
| `SessionStart` hook runs `bd prime --hook-json`, also on resume and after compaction | The session context hook attaches `bd prime` to each request; it is refreshed after compaction and on resume after an idle gap |
| Minimal `CLAUDE.md` pointer to `bd prime` | `bd init`'s minimal `AGENTS.md` pointer; bd's full or Codex sections are reduced to a pointer while prime is attached |
| `--global` or project install | Global `~/.config/opencode/opencode.json` or project `.opencode/opencode.json` `plugins` entry |
| `--stealth` | `stealth` plugin option |
| `--remove` | Remove the `plugins` entry |
| `--check` | `opencode debug agents` lists `beads-task-agent`; a session's agent sees a `<beads-context>` block |

The [Claude Code parity matrix](docs/claude-code-parity.md) records every `bd setup claude` behavior, its OpenCode equivalent and live evidence, the OpenCode-only capabilities, and the deliberate divergences.

## Context injection

The plugin runs `bd prime --full` in the project directory and attaches its output to each model request through OpenCode's session context hook. Guarded prime is cached per session, while actual actor and request-capability guidance is rendered for each request. Prime runs once per session rather than per request. It runs again after compaction (automatic or manual), when a session resumes after `refreshAfterIdleMinutes` of inactivity, and when the plugin reloads, mirroring the `startup`, `resume`, `clear`, and `compact` sources of Claude Code's `SessionStart` hook. Steady work keeps the same text, which keeps provider prompt caches warm. Attached context is not stored in the conversation, so compaction cannot drop it. `--full` matters: without it, `bd` switches to brief MCP reminders whenever Claude Code's settings list a Beads MCP server, and OpenCode has no Beads MCP tool. Prime supplies the canonical current workflow, command guidance, and persistent memories; the plugin adds only compact OpenCode-specific safety and delegation guidance.

While prime is attached, two bd-managed `AGENTS.md` blocks only repeat it: the full-profile section `bd setup opencode` writes, and the Codex section `bd init` writes. The plugin replaces those marked blocks in the outgoing request with a one-line pointer, matching the minimal `CLAUDE.md` pointer Beads uses for Claude Code. `bd init`'s minimal section is left as is. Your `AGENTS.md` file and any text outside those markers are not changed, and nothing is replaced when prime is withheld or unavailable.

Known regular subagents remain excluded, including `explore` and `general`, while `beads-task-agent` and `beads-task-agent-luna` remain eligible. If agent lookup fails, context injection fails open to preserve compatibility with unknown custom primary agents.

If `bd` is unavailable or the project is uninitialized, nothing is added. If `bd prime` fails or times out, the agent gets a short `<beads-notice>` saying context is unavailable and to run `bd prime`, as Beads' Codex hooks report refresh failures. Either way the plugin retries after 30 seconds, and failures are also logged as `[opencode-beads]` warnings. The task agent retains standalone guidance for authorized scope, atomic claim, append checkpoints, validate before closure, and partial handoff under the caller's acceptance authority.

## Schema migration guard

Beads 1.3 migrates an embedded store in place, irreversibly, the first time any command opens it, and `bd --readonly` does not prevent that. Because this plugin runs `bd prime` automatically, it would otherwise be the unattended first command after you upgrade `bd`.

Before running prime, the plugin checks `bd version` and the configuration-only `bd context --json` probe, which do not open the store, and reads `.beads/.local_version`. If the installed `bd` is older than 1.3.1, or the store was last opened by an older `bd`, the plugin withholds prime and gives the agent a notice telling it not to run `bd` and to ask you to act. To proceed, back up the `.beads` directory and run `bd migrate schema`; the plugin picks up the change on its next retry. Setting the `autoMigrate` option skips the store-version check.

`bd prime` itself does not update `.beads/.local_version`. A store migrated only by prime keeps the old marker until you run `bd migrate schema` (or any ordinary `bd` command), which is safe and idempotent.

## Beads workflows

Published stable 1.0.2 registers no slash commands; `bd setup claude` installs none either. Ask the agent to work with Beads, have it load the canonical `beads` skill that `bd init` installs at `.agents/skills/beads` (OpenCode lists it and loads it with its `skill` tool), or use the `bd` CLI and the generated [Beads CLI reference](https://beads.gascity.com/cli-reference/index) directly. Versions before 1.0.0 shipped `/beads:*` commands adapted from upstream's Claude Code plugin; they duplicated `bd prime` and the skill.

The commands are workflow prompts, not exact CLI aliases. In particular, init guides human onboarding, prime reuses context or requests a guarded refresh, version reports installed versions and qualification limits, decision records rationale, template discovers formulas, and workflow guides authorized work and recovery. These purposes do not imply native `bd decision`, `bd template` or `bd workflow` commands.

**Unreleased source behavior:** an invocation itself requests the advertised bounded
operation, including bare `/oc-beads:sync`. With sufficient inputs the agent uses
permissioned tools and reports the actual outcome; `/oc-beads:sync explain`
explains without syncing, and missing required inputs prompt focused clarification.
Ordinary sync uses existing configuration and `--no-adopt`; a missing remote blocks
without setup/adoption. Host permissions, project restrictions, actor identity,
explicit modes and parent acceptance still apply. Guide/report commands produce
their advertised artifact. This correction is not in the published beta.2 archive;
the unchanged local package version does not identify that published artifact.

Starting with beta.2, the package-owned `oc-beads:status` is removed without an alias. Use `oc-beads:diagnostics` for integration health and `oc-beads:stats` for the issue-database overview via `bd status` (alias `bd stats`). User-defined old status overrides are untouched and are not migrated; the package does not edit configuration.

`oc-beads:compact` guides semantic issue compaction with `bd admin compact`; `bd compact` squashes Dolt history and is a different operation. Neither is conversation compaction. A bare invocation explains the workflow; a sufficiently specified semantic apply request supplies its bounded authority under actual permissions and policy. See the packaged [compact guidance](assets/oc-beads/resources/TROUBLESHOOTING.md) for mode/actor boundaries and upstream help uncertainty. `oc-beads:restore` retrieves pre-compaction issue content, displaying it by default; `--apply` requires explicit authority to write it back and does not mean database backup recovery. Quickstart uses installed help and authorized context; sync guides Dolt-remote synchronization, distinct from `bd federation sync`.

## Removal and customization

Remove the plugin's `plugins` entry to unload it. Cleanup aborts owned context/process work and its event observer, then awaits the scoped agent, skill, tool and hook disposers. It is idempotent and reports disposal failures. It never promises a final checkpoint after interruption. Reload starts with fresh session/location state. Package updates/removal belong to OpenCode's package lifecycle; this plugin has no installer or recursive asset watcher.

Existing `oc-beads` skill IDs or names are checked and diagnosed in each rebuilt candidate; removing a customization allows the packaged skill to return. There is no permanent setup-time skill gate. Ordinary user configuration/file commands retain their later native precedence; same-name other-plugin conflicts follow native order rather than universal collision prevention. Disposing a registration removes only the package's transform; it does not delete user command/skill bodies, shared Beads skills, project data, startup files or global settings. Do not delete those files as plugin cleanup. Installed resource reads still require normal host permissions; bounded native external-directory ask/deny and actual model-use evidence is recorded in the acceptance reports. Missing/unreadable packaged guidance is diagnosed and its skill is withheld.

## Agent configuration

Entries under `agents` in OpenCode configuration override the plugin's task-agent fields one by one, so a partial override (for example only `description`) keeps the bounded `system` prompt and subagent `mode`. Fields you set explicitly, such as `system`, `model`, or `permissions`, win. OpenCode V2 does not expose configuration-only agents to plugins, so the plugin cannot detect or warn about overrides.

## Task agent

The beta/next `beads-task-agent` supports read-only status and graph analysis or execution within an assigned task, batch or goal. Analysis requests never mutate Beads. Exact assignments stop without substitution. Authorized batches may continue only within scope, with an explicit executor actor, atomic claim/readback, append checkpoints and relevant validation for each Bead. Discoveries do not authorize their execution; unresolved acceptance remains incomplete, and parent-owned closure stays with the parent.

Its prompt and description are owned by this project. Direct work and normal blocking delegation depend on the task, without a command-count threshold. The worker returns scope, actor/session, attempts, rationale, validation, durable references, blockers and next action. The caller reconciles acceptance; NO_TEXT, failure, cancellation, late results and step-cap interruption do not establish completion or authorize a restart.

OpenCode lets the plugin enforce parts of that contract, beyond what Claude Code's hooks can do:

- **No automatic commit, push, or sync.** The task agents' permissions require approval (`ask`) for `git commit`, `git push`, `bd dolt push`, `bd dolt pull`, and `bd sync`, on top of OpenCode's defaults. Global options before the subcommand (`git -C dir push`, `bd --json dolt push`) are covered too, and compound commands are checked per command. This is a guardrail against routine sync, not a sandbox: scripts and aliases can still run these commands. A non-interactive run rejects them. Set the agent's `permissions` in OpenCode configuration to replace these rules.
- **Step cap.** `taskAgentSteps` (default 100) limits a worker invocation; on its final step OpenCode removes tools and asks for a summary.
- **Context in the worker.** The worker runs in its own child session and receives `bd prime` there too; Claude Code's `SessionStart` hooks do not reach subagents.
- **Beads state across compaction.** Compaction requests in sessions with Beads context ask the summarizer to keep bead IDs, claim and status changes, discovered follow-ups, blockers, and pending validation.

### Opt-in Luna Max profile

The default `beads-task-agent` leaves its model unset, so a subagent inherits the parent session's model. Set the plugin option `"luna": true` to also register `beads-task-agent-luna`, which uses `openai/gpt-6-luna#max` with exactly the same prompt, subagent mode, step cap, and permissions. Per-agent overrides remain independent: customizations to `beads-task-agent` are not copied to Luna. Both profiles receive full prime context and use the same scope and acceptance boundaries, including explicit one-bead mode when assigned. The profile makes no model-quality guarantee.

Ask the primary agent to delegate to `beads-task-agent-luna` by name through the `subagent` tool. Default delegation guidance still names `beads-task-agent`; enabling Luna does not reroute existing calls or change the primary agent's model. Remove the option to unregister the profile.

Luna requires access to `openai/gpt-6-luna` and its `max` variant in your OpenCode provider setup. The plugin does not install models, configure authentication, or silently fall back to another model.

## Tracking upstream Beads

The package vendors nothing from upstream. It depends on the installed `bd` CLI at runtime: `bd prime` supplies the current workflow, and the schema migration guard enforces the supported `bd` range.

[`scripts/bd-contract.ts`](scripts/bd-contract.ts) checks a real `bd` against everything the plugin relies on: version parsing, `bd where --json`, the `.beads/.local_version` behavior the guard depends on (written by `bd init`, untouched by `bd prime`, refreshed by `bd migrate schema`), that `bd prime --full` keeps the full workflow when Claude Code has a Beads MCP server, and every command the task-agent prompt names. CI runs it against the validated release from `package.json` (`beads.validated`). The scheduled `beads-contract` workflow runs it daily against the latest stable Beads release, and fails if that release breaks the contract or is newer than the validated one. When a new release appears, review its upgrade notes, then update `beads.validated` and the compatibility table. The [artifact policy](docs/beads-artifact-policy.md) records why upstream artifacts are not vendored.

## Compatibility

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode (beta/next candidate) | `>=2.1.1 <2.2` | 2.1.1 (bounded accepted evidence) |
| OpenCode (stable 1.0.2 historical) | 2.0.26 | 2.0.26 |
| `bd` CLI | 1.3.1 through 1.x | 1.3.1 |
| Bun (OpenCode host runtime) | >=1.3.14 | 1.4.2 |

The beta/next candidate type-checks against `@opencode/plugin` 2.1.1 and declares an optional peer range of `>=2.1.1 <2.2`. It checks `ctx.app.version` at startup and reports an unsupported-host diagnostic before registering Beads agents or hooks. This source guard does not qualify the entire host range; exact 2.1.1 has bounded accepted evidence, and future 2.1 patches are admitted candidates rather than tested versions. The stable 1.0.2 qualification on 2.0.26 is historical. See the [OpenCode V2 contract](docs/opencode-sdk-contract.md). The `bd` baseline was reviewed against Beads v1.3.1 (commit `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`).

## Troubleshooting

- **No Beads context:** Run `bd prime`. Install `bd` if missing or run `bd init` if the project has no Beads workspace.
- **Agent reports that `bd prime` failed or timed out:** Run `bd prime` in the project to see the error; the plugin retries every 30 seconds.
- **Agent reports a Beads notice instead of context:** The schema migration guard withheld prime. Back up `.beads`, run `bd migrate schema`, and continue; or upgrade `bd` if the notice says it is older than 1.3.1.
- **Canonical skill missing:** For a new workspace, run `bd init`. For an existing workspace, follow current upstream Beads guidance; this plugin does not install or repair skills.
- **Task agent asks before committing or pushing:** This is intentional; see [Task agent](#task-agent). Approve the command, or set the agent's `permissions` in OpenCode configuration.
- **Unexpected definition:** Check OpenCode configuration for a colliding `beads-task-agent` definition. Explicit configuration wins.
- **Regular subagent has no context:** This is intentional. Delegate Beads work to `beads-task-agent` or run the required `bd` command explicitly.
- **Behavior changed after upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then inspect [Beads releases](https://github.com/gastownhall/beads/releases) and this project's changelog.

## Earlier releases

### 0.9.3 recovery notice

Version 0.9.3 contained command guidance from the withdrawn upstream Beads v1.2.1 release. This plugin did not bundle the `bd` binary or implement database migrations, but it could invoke a consumer-installed v1.2.1 binary through `bd prime`. Even one v1.2.1 execution could migrate the database. Upgrade the plugin package to 0.9.4 or later; if v1.2.1 was installed and may have run, also follow the [upstream database recovery guidance](https://github.com/gastownhall/beads/blob/v1.2.2/docs/RECOVERY-1.2.1.md).

## License

opencode-beads is licensed under the MIT license. See [`LICENSE`](LICENSE).

opencode-beads is not built by or affiliated with the OpenCode team. OpenCode is ©2025 Anomaly.
