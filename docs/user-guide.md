# opencode-beads user guide

Details behind the [README](../README.md) for the current 2.x line. Normative
behavior is defined by the canonical specs listed in the
[documentation index](README.md); this guide explains it for users.

- [Installation details](#installation-details)
- [Plugin options](#plugin-options)
- [Upgrading](#upgrading)
- [Why not `bd setup opencode`](#why-not-bd-setup-opencode)
- [Context injection](#context-injection)
- [Native Beads store behavior](#native-beads-store-behavior)
- [Workflows and commands](#workflows-and-commands)
- [Typed operations and permissions](#typed-operations-and-permissions)
- [Task agent](#task-agent)
- [Customization and removal](#customization-and-removal)
- [Compatibility](#compatibility)
- [Tracking upstream Beads](#tracking-upstream-beads)
- [Troubleshooting](#troubleshooting)
- [Earlier releases](#earlier-releases)

## Installation details

Install the [`bd` CLI](https://github.com/gastownhall/beads/blob/main/docs/getting-started/installation.md) once on the host, then run `git init` (only when the directory is not already a Git worktree) and `bd init` in each project. `bd init` owns project initialization and creates the canonical shared Beads skill at `.agents/skills/beads`, which OpenCode discovers. It also writes a minimal Beads section to `AGENTS.md` that points to `bd prime`, the same pointer Beads gives Claude Code in `CLAUDE.md`. The plugin additionally owns its packaged `oc-beads` skill; it does not write startup files or change `.agents/skills/beads/SKILL.md`. The plugin does not install or upgrade `bd`.

An exact version pin such as `"plugins": ["@snarkipus/opencode-beads@2.2.0"]` is recommended. To follow stable releases, use `"plugins": ["@snarkipus/opencode-beads@latest"]` and check the resolved version before upgrading. `"plugins": ["@snarkipus/opencode-beads@next"]` is a separate historical beta channel, not a promise of a newer or compatible release. Update the pin explicitly when upgrading; an unpinned entry is less reproducible. OpenCode 1.x plugins are not supported; use 0.10.x or earlier there.

After installing, `opencode debug agents` lists `beads-task-agent`, and `/oc-beads:diagnostics` reports the loaded package and host versions, native registration and observed capabilities. Discover `beads` through `execute` on a host and agent with the required permissions.

## Plugin options

Plugin options use the object form:

```json
{
  "plugins": [
    {
      "package": "@snarkipus/opencode-beads@2.2.0",
      "options": { "luna": true }
    }
  ]
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `luna` | `false` | Also register the `beads-task-agent-luna` profile. |
| `terra` | `false` | Also register the `beads-task-agent-terra` profile. |
| `stealth` | `false` | Add `--stealth` to `bd prime` (no git operations in the session-close protocol), like `bd setup claude --stealth`. `bd config set no-git-ops true` is the project-level equivalent. |
| `taskAgentSteps` | `100` | Interruption cap on task-agent steps per invocation. `0` removes the cap; neither value changes authorized scope or establishes completion. |
| `refreshAfterIdleMinutes` | `30` | Re-run `bd prime` when a session resumes after this much inactivity, as Claude Code does on resume. `0` disables idle refresh. |
| `autoMigrate` | ignored | Deprecated compatibility option. Both `true` and `false` are accepted and ignored without warnings; native Beads owns store behavior. |

## Upgrading

Upgrade OpenCode first: 2.2.0 requires `>=2.3.0 <2.4`. Then replace the existing plugin entry instead of stacking a second version, and check `/oc-beads:diagnostics`. OpenCode upgrades and plugin installation remain operator-owned actions; existing exact pins are never upgraded automatically.

- **Staying on OpenCode 2.2:** keep the released exact `2.1.0` pin, which retains `>=2.2.6 <2.3` support. Version 2.2.0 drops OpenCode 2.2 admission.
- **Staying on OpenCode 2.1:** keep the exact beta.5 pin rather than following `latest`; beta.5 retains its historical `>=2.1.1 <2.2` range. Stable 1.0.2 remains a historical option for its separately qualified host.
- **From stable 1.0.2:** task execution now follows the explicitly authorized scope instead of imposing one Bead per invocation. Exact assignments still stop with their item; discovery never grants authority.
- **Diagnostics rename:** Beta.1 used `oc-beads:status`; 2.0.0 uses `oc-beads:diagnostics`. Existing user overrides are not silently renamed, and an installation still pinned to beta.1 keeps `/oc-beads:status` until explicitly upgraded.
- **Snapshot limitation:** upgrading does not reconstruct workflow guidance made inaccessible by the [known model-switch limitation](../README.md#known-limitations).

## Why not `bd setup opencode`

**Do not run `bd setup opencode`.** That recipe is for OpenCode without this plugin. Beads assumes OpenCode has no hooks, so it replaces `bd init`'s minimal pointer with the full command reference, about 2 kB more on every request. With this plugin, `bd prime` arrives through OpenCode's hooks instead, as it does for Claude Code. If you already ran it, `bd setup opencode --remove` deletes the Beads section from `AGENTS.md` (prime still arrives through the plugin), or simply leave it: while prime is attached, the plugin replaces it in the request with a one-line pointer.

Installing the plugin gives OpenCode the same integration that `bd setup claude` gives Claude Code:

| `bd setup claude` (Claude Code) | This plugin (OpenCode 2) |
| --- | --- |
| `SessionStart` hook runs `bd prime --hook-json`, also on resume and after compaction | The session context hook attaches `bd prime` to each request; it is refreshed after compaction and on resume after an idle gap |
| Minimal `CLAUDE.md` pointer to `bd prime` | `bd init`'s minimal `AGENTS.md` pointer; bd's full or Codex sections are reduced to a pointer while prime is attached |
| `--global` or project install | Global `~/.config/opencode/opencode.json` or project `.opencode/opencode.json` `plugins` entry |
| `--stealth` | `stealth` plugin option |
| `--remove` | Remove the `plugins` entry |
| `--check` | `opencode debug agents` lists `beads-task-agent`; a session's agent sees a `<beads-context>` block |

The [Claude Code parity matrix](claude-code-parity.md) is the historical setup-lifecycle record with live evidence and deliberate divergences.

## Context injection

The plugin runs `bd prime --full` in the project directory and attaches its output to each model request through OpenCode's session context hook. Guarded prime is cached per session, while actor and request-capability guidance is rendered for each request. Prime runs again after compaction, when a session resumes after `refreshAfterIdleMinutes` of inactivity, and when the plugin reloads. Steady work keeps the same text, which keeps provider prompt caches warm. Attached context is not stored in the conversation, so compaction cannot drop it. `--full` matters: without it, `bd` switches to brief MCP reminders whenever Claude Code's settings list a Beads MCP server, and OpenCode has no Beads MCP tool.

While prime is attached, two bd-managed `AGENTS.md` blocks only repeat it: the full-profile section `bd setup opencode` writes and the Codex section `bd init` writes. The plugin replaces those marked blocks in the outgoing request with a one-line pointer. Your `AGENTS.md` file and any text outside those markers are not changed, and nothing is replaced when prime is withheld or unavailable.

Known regular subagents remain excluded, including `explore` and `general`, while `beads-task-agent`, `beads-task-agent-luna` and `beads-task-agent-terra` remain eligible. If agent lookup fails, context injection fails open to preserve compatibility with unknown custom primary agents.

If `bd` is unavailable or the project is uninitialized, nothing is added. If `bd prime` fails or times out, the agent gets a short `<beads-notice>` saying context is unavailable and to run `bd prime`. The plugin retries after 30 seconds and logs `[opencode-beads]` warnings. The task agent retains standalone guidance for authorized scope, atomic claim, append checkpoints, validate before closure, and partial handoff under the caller's acceptance authority.

## Native Beads store behavior

Before prime and typed operations, the plugin checks `bd version` against minimum 1.3.1 and uses the configuration-only `bd context --json` workspace probe. These checks do not open the store. A missing workspace differs from a failed or unsupported probe; the latter is reported without substituting a store-opening command.

The plugin no longer reads `.beads/.local_version` or infers pending SQL migrations from CLI witnesses. Native Beads owns schema bounds, store opening, migrations and upgrade/adoption semantics. Ordinary `bd prime --full` includes native persistent memories and may open or migrate a local store according to native behavior. The plugin does not guarantee migration-free context. An OpenCode session can be the first native store open after a `bd` upgrade; follow the native backup-before-upgrade procedure linked below. A successful prime can include a native partial-availability notice; its output is preserved and success does not certify complete memory delivery or store health.

Follow the [Beads 1.3.4 upgrade procedure](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/docs/getting-started/upgrading.md), including backup with the old binary before upgrading and coordination for shared stores. The plugin does not run automatic migration, repair, bootstrap, update or synchronization commands. Agent-initiated administration still requires an explicit applicable request and normal permissions. Native open semantics do not grant extra administrative authority.

The old `autoMigrate` feature is obsolete: existing true/false values are ignored without warnings and can be removed from configuration. Diagnostics reports version/workspace/protocol and cached integration observations without opening a store; it does not certify Beads SQL health.

## Workflows and commands

The plugin registers 29 `oc-beads:<stem>` workflows plus `oc-beads:diagnostics` through ordinary native command registration. The commands are workflow prompts, not exact CLI aliases: init guides human onboarding, prime reuses context or requests a guarded refresh, version reports installed versions and qualification limits, decision records rationale, template discovers formulas, and workflow guides authorized work and recovery. These purposes do not imply native `bd decision`, `bd template` or `bd workflow` commands. You can also load the canonical `beads` skill or use the `bd` CLI and its [CLI reference](https://beads.gascity.com/cli-reference/index) directly.

**Command invocation:** an invocation itself requests the advertised bounded operation, including bare `/oc-beads:sync`. With sufficient inputs the agent uses permissioned tools and reports the actual outcome; `/oc-beads:sync explain` explains without syncing, and missing required inputs prompt focused clarification. Ordinary sync uses existing configuration and `--no-adopt`; a missing remote blocks without setup/adoption. Host permissions, project restrictions, actor identity, explicit modes and parent acceptance still apply. Guide/report commands produce their advertised artifact. This action-contract correction starts with beta.3; earlier beta artifacts do not contain this correction.

Invocations stay compact in history: single-line text follows the command, multiline text goes below it, and the full static instructions live in durable message metadata expanded by the primary and compaction hooks. Diagnostics captures its observed report once the same way, including the loaded plugin name/version alongside the observed host version. Summaries retain semantic context, not verbatim snapshots, and this is not a token-savings claim. See the [workflow evaluation](workflow-native-context-evaluation.md) for history.

Starting with beta.2, the package-owned `oc-beads:status` is removed without an alias. Use `oc-beads:diagnostics` for integration health and `oc-beads:stats` for the issue-database overview via `bd status` (alias `bd stats`). User-defined old status overrides are untouched and are not migrated.

`oc-beads:compact` guides semantic issue compaction with `bd admin compact`; `bd compact` squashes Dolt history and is a different operation. Neither is conversation compaction. A bare invocation explains; a sufficiently specified apply request supplies its bounded authority. See the packaged [compact guidance](../assets/oc-beads/resources/TROUBLESHOOTING.md). `oc-beads:restore` displays pre-compaction issue content by default; `--apply` requires explicit authority to write it back and does not mean database backup recovery. Sync guides Dolt-remote synchronization, distinct from `bd federation sync`.

## Typed operations and permissions

The normal public entrypoint enables the eleven qualified operations in the native `beads` code-mode namespace. No wrapper, activation setting or manual skill copy is needed. Registration requires the host tool, permission and session interfaces; diagnostics reports unavailable interfaces honestly. Actual request capabilities, catalog discovery and per-operation permissions decide what can run: composed `execute`, directly exposed `beads_*` tools, or direct shell when separately available. Native shell is never callable inside `execute`.

Each operation asks for its exact `bd` command with `save: []`, so "always" adds no new saved grant and you may be asked again. Existing shell `bd *` grants can authorize equivalent operations; configured denies still win. Results preserve partial, failed and uncertain outcomes rather than retrying. A rejected nested operation does not run, but later operations keep their own checks. Use explicit Stop/Cancel to end the composition. Read [CODE_MODE.md](../assets/oc-beads/resources/CODE_MODE.md) for composition and recovery.

## Task agent

The 2.0 integration uses scope-bounded task execution:

- The primary OpenCode thread retains planning context, decisions, and control.
- An exact assignment or explicit one-bead mode stops with that item; read-only graph requests never authorize claims or writes.
- An already-authorized batch or goal may continue within scope, with an atomic claim, append checkpoints, validation and acceptance evidence for each Bead. Discovery does not expand that authority.
- The actual executor actor follows claims, updates and heartbeats; handoffs are deliberate. Parent-owned acceptance and closure remain with the parent.
- Denied authority, cancellation, permission waits, blockers and incomplete acceptance remain visible stops. Child results do not restart work.

The worker returns scope, actor/session, attempts, rationale, validation, durable references, blockers and next action. NO_TEXT, failure, cancellation, late results and step-cap interruption do not establish completion or authorize a restart.

OpenCode lets the plugin enforce parts of that contract:

- **No automatic commit, push, or sync.** Task-agent permissions require approval (`ask`) for `git commit`, `git push`, `bd dolt push`, `bd dolt pull`, and `bd sync`, including forms with global options before the subcommand; compound commands are checked per command. This is a guardrail, not a sandbox: scripts and aliases can still run these commands. A non-interactive run rejects them.
- **Step cap.** `taskAgentSteps` limits a worker invocation; on its final step OpenCode removes tools and asks for a summary.
- **Context in the worker.** The worker runs in its own child session and receives `bd prime` there too.
- **Beads state across compaction.** Compaction in sessions with Beads context asks the summarizer to keep bead IDs, claims and status changes, follow-ups, blockers and pending validation.

### Opt-in fixed profiles

Set `"luna": true` to also register `beads-task-agent-luna`, which uses `openai/gpt-6-luna#max` with the same prompt, mode, step cap and permissions. The default `beads-task-agent` leaves its model unset and inherits the parent's model. Customizations to `beads-task-agent` are not copied to Luna. Ask the primary agent to delegate to `beads-task-agent-luna` by name; enabling Luna does not reroute existing calls. Luna requires access to that model in your provider setup; the plugin does not install models, configure authentication or silently fall back. The profile makes no model-quality guarantee.

Terra is introduced in `2.1.0`; published `2.0.0` does not include it.

Set `"terra": true` to also register `beads-task-agent-terra` with `openai/gpt-6.1-terra#medium`. It has the same prompt, mode, step cap and permissions, and can be enabled independently or together with Luna. Ask for Terra by name; it does not change the parent route. Terra likewise requires provider access, has no silent fallback, and does not grant authority to execute work. Native overrides apply per agent; default-agent customizations are not copied to Terra.

## Customization and removal

Entries under `agents` in OpenCode configuration override the task-agent fields one by one, so a partial override keeps the bounded `system` prompt and subagent `mode`. OpenCode V2 does not expose configuration-only agents to plugins, so the plugin cannot warn about overrides.

User configuration/file commands retain native precedence on load and rebuild; removing an override restores the package definition. Other plugin conflicts follow native ordering. Diagnostics reports observed registration and name/description mismatches; identical-description overrides and public owner identity remain unobservable. Existing `oc-beads` skill IDs or names are checked on each rebuild, and missing or unreadable packaged guidance is diagnosed with the skill withheld.

Remove the `plugins` entry to unload the plugin. Cleanup aborts owned context/process work and its event observer, then awaits the scoped agent, skill, tool and hook disposers. It is idempotent, reports disposal failures and never promises a final checkpoint after interruption. Disposal never deletes user command/skill bodies, shared Beads skills, project data, startup files or global settings; do not delete those as plugin cleanup.

## Compatibility

| Component | Expected range | Validated baseline |
| --- | --- | --- |
| OpenCode (historical beta.5) | `>=2.1.1 <2.2` | 2.1.1 (bounded accepted evidence) |
| OpenCode (2.0.0) | `>=2.2.6 <2.3` | 2.2.6 (accepted native and genuine-model qualification) |
| OpenCode (2.1.0 released) | `>=2.2.6 <2.3` | 2.2.6 with one read-only Terra dispatch |
| OpenCode (2.2.0) | `>=2.3.0 <2.4` | Exact 2.3.0 bounded native qualification |
| OpenCode (stable 1.0.2 historical) | 2.0.26 | 2.0.26 |
| `bd` CLI | 1.3.1 through 1.x | 1.3.4 |
| Bun (OpenCode host runtime) | >=1.3.14 | 1.4.2 |

Version 2.2.0 type-checks against `@opencode/plugin` 2.3.0 and admits `>=2.3.0 <2.4`. Its [bounded native qualification](opencode-23-qualification-xwq.md) covers real launch, report freshness, stop and Code Mode reads on exact 2.3.0; repeated idle reports with outstanding work and cancellation during real bd execution were deferred and remain unexecuted. Admission does not qualify later patches. Earlier [2.2.6 qualification](opencode-22-qualification-5rj2.md) and [Terra qualification](opencode-terra-qualification-ug9.md) apply to their recorded candidates, not this 2.3 candidate. See the [OpenCode integration reference](opencode-sdk-contract.md). The supported Beads minimum is 1.3.1; the current CLI baseline was reviewed against Beads v1.3.4; see the [release review](beads-1.3.4-review-2026-11-09.md). The historical integration comparison remains Beads v1.3.1 (commit `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`), separately from CLI validation and the reviewed marketplace-main inventory.

## Tracking upstream Beads

The package includes attributed MIT-licensed excerpts in project-owned guidance; it redistributes no upstream executable, host integration or sync-managed vendor tree. See the [notice](../assets/oc-beads/THIRD_PARTY_NOTICES.md). It depends on the installed `bd` CLI at runtime: `bd prime` supplies the current workflow, and CLI compatibility checks enforce the supported `bd` minimum.

[`scripts/bd-contract.ts`](../scripts/bd-contract.ts) checks a real `bd` against everything the plugin relies on. CI runs it against the validated release from `package.json` (`beads.validated`). The scheduled `beads-contract` workflow runs it daily against the latest stable Beads release and fails if that release breaks the contract or is newer than the validated one. When a new release appears, review its upgrade notes, then update `beads.validated` and the compatibility table. The [artifact policy](beads-artifact-policy.md) describes the project-owned adaptations and retired vendor tree.

The daily/manual `beads-contract` workflow also has an independent source-comparison job using `scripts/check-beads-integration.ts`. Its step summary contains the collector JSON and exit status: immutable reviewed baseline/candidate commits, selected paths and source/diff links. Completed changed and unchanged comparisons succeed informationally; unavailable retrieval/comparison fails that job and is never reported as unchanged. Neither job depends on the other, and these maintenance checks are not product/release prerequisites. No GitHub issues, automatic adoption or baseline advancement occur. A maintainer must explicitly disposition changes before updating the reviewed inventory. Schedules use the default branch; an authorized manual run can select a published branch with `--ref` when the workflow exists on default.

## Troubleshooting

- **No Beads context:** Run `bd prime`. Install `bd` if missing or run `bd init` if the project has no Beads workspace.
- **`bd prime` failed or timed out:** Run `bd prime` in the project to see the error; the plugin retries every 30 seconds.
- **A Beads notice instead of context:** Follow the reported CLI minimum or workspace-probe failure. A probe failure is not evidence of a missing store or pending migration; report the actual error without bypassing the check.
- **Canonical skill missing:** For a new workspace, run `bd init`. For an existing workspace, follow current upstream Beads guidance; this plugin does not install or repair skills.
- **Task agent asks before committing or pushing:** Intentional; see [Task agent](#task-agent). Approve the command, or set the agent's `permissions` in OpenCode configuration.
- **Nothing registered:** Check the `[opencode-beads]` warning; the host may be outside `>=2.3.0 <2.4`.
- **Regular subagent has no context:** Intentional. Delegate Beads work to `beads-task-agent` or run the required `bd` command explicitly.
- **Behavior changed after upgrade:** Compare `opencode --version`, `bd version`, and `bun --version` with the compatibility table, then inspect [Beads releases](https://github.com/gastownhall/beads/releases) and the [changelog](../CHANGELOG.md).

## Earlier releases

### 0.9.3 recovery notice

Version 0.9.3 contained command guidance from the withdrawn upstream Beads v1.2.1 release. This plugin did not bundle the `bd` binary or implement database migrations, but it could invoke a consumer-installed v1.2.1 binary through `bd prime`. Even one v1.2.1 execution could migrate the database. Upgrade the plugin package to 0.9.4 or later; if v1.2.1 was installed and may have run, also follow the [upstream database recovery guidance](https://github.com/gastownhall/beads/blob/v1.2.2/docs/RECOVERY-1.2.1.md).
