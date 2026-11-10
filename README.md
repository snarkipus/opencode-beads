# opencode-beads

[![CI](https://github.com/snarkipus/opencode-beads/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/snarkipus/opencode-beads/actions/workflows/ci.yml)
[![Release](https://github.com/snarkipus/opencode-beads/actions/workflows/release.yml/badge.svg)](https://github.com/snarkipus/opencode-beads/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/@snarkipus/opencode-beads)](https://www.npmjs.com/package/@snarkipus/opencode-beads)
[![zizmor](https://img.shields.io/badge/%F0%9F%8C%88-zizmor-white?labelColor=white)](https://zizmor.sh/)

[Beads](https://github.com/gastownhall/beads) issue tracker integration for [OpenCode](https://opencode.ai).

`@snarkipus/opencode-beads` is a maintained OpenCode adapter. It gives an OpenCode session what `bd setup claude` gives Claude Code, plus native OpenCode surfaces:

- **Context:** guarded `bd prime` workflow context on every eligible request, refreshed after compaction and idle resume.
- **Typed operations:** eleven permissioned operations in the native `beads` code-mode namespace: find, get, edges, memories, recall, claim, note, selected-field update, close, create and remember. Every write carries the actual session-and-agent Beads actor.
- **Workflows:** 29 `oc-beads:<stem>` workflows plus `oc-beads:diagnostics`, and a packaged `oc-beads` skill.
- **Task agent:** a scope-bounded `beads-task-agent`. Exact assignments stop with their item; an already-authorized batch may continue within its bounds.

The installed `bd` CLI stays authoritative for issues, project initialization, shared skills, migrations and Dolt synchronization. The plugin does not replace it.

## Supported versions

Version **2.1.0** targets the stable line.

| Component | Supported | Evidence |
| --- | --- | --- |
| OpenCode | `>=2.2.6 <2.3` | Base integration: exact 2.2.6 native-host qualification plus one genuine model workflow; one read-only Terra Medium child dispatch on 2.2.6 |
| `bd` CLI | 1.3.1 through 1.x | 1.3.4 contract baseline |

A compatible range is admission, not proof that every future patch was tested. The plugin refuses to register on hosts outside the range. Older hosts: see [Compatibility](docs/user-guide.md#compatibility).

## Installation

1. Install the [`bd` CLI](https://github.com/gastownhall/beads/blob/main/docs/getting-started/installation.md) once, then initialize each project:

   ```bash
   git init # only when the directory is not already a Git worktree
   bd init
   ```

   `bd init` owns project initialization and creates the canonical shared Beads skill at `.agents/skills/beads`, plus a minimal `AGENTS.md` pointer to `bd prime`. The plugin additionally owns its packaged `oc-beads` skill; it does not write startup files or change the shared skill.

   **Do not run `bd setup opencode`.** That recipe is for OpenCode *without* this plugin and adds redundant instructions to every request. See [why, and how to undo it](docs/user-guide.md#why-not-bd-setup-opencode).

2. Add the version-pinned plugin to `~/.config/opencode/opencode.json` (all projects) or a project's `.opencode/opencode.json`:

   ```json
   {
     "plugins": ["@snarkipus/opencode-beads@2.1.0"]
   }
   ```

   OpenCode reloads configuration automatically. Update the pin explicitly when upgrading. Options such as `luna`, `terra`, `stealth` and `autoMigrate` use the [object form](docs/user-guide.md#plugin-options).

3. Check the install: `opencode debug agents` lists `beads-task-agent`, and `/oc-beads:diagnostics` reports native registration and observed capabilities.

### Upgrading to 2.1.0

Upgrade OpenCode before changing the plugin pin: 2.0.0 requires `>=2.2.6 <2.3` and has no 2.1 compatibility layer. Then replace the existing plugin entry, not add a second one, and check `/oc-beads:diagnostics`. Existing exact 1.x and beta pins remain available; installations are not upgraded automatically. Staying on OpenCode 2.1? Keep the exact `1.1.0-beta.5` pin, which retains its `>=2.1.1 <2.2` range. Other migration notes are in the [user guide](docs/user-guide.md#upgrading).

From plugin 2.0.0, the host range and existing options are unchanged. To add the optional `beads-task-agent-terra` profile, enable `terra: true` in the object form. It uses `openai/gpt-6.1-terra#medium`; the default agent still inherits its model, Luna Max remains available, and both optional profiles can coexist. Enabling a profile does not authorize work or change the parent route.

## First use

In an initialized project:

```text
/oc-beads:diagnostics
/oc-beads:ready
```

Diagnostics confirms what loaded and which capabilities this request actually has. `ready` lists actionable work; listing alone never claims anything. Then ask in plain language, for example:

```text
Claim bd-a1b2 and work it to its acceptance criteria. Checkpoint what you learn.
```

The agent claims the issue atomically and appends checkpoints under the actual session-and-agent actor. It validates against acceptance, then stops with that item instead of picking up other work. Each typed operation is checked against your OpenCode permission rules. To delegate, ask the agent to hand the issue to `beads-task-agent`.

## Known limitations

- **Workflow guidance after a model switch.** This is an unresolved deficiency. After native conversation compaction on model A, switching to model B that cannot replay A's native context can make earlier workflow instruction snapshots and captured diagnostics unavailable. The plugin reports that guidance as unavailable and continues with the ordinary request; it does not reconstruct it. The limitation affects prompt guidance only: it does not change or repair the Beads issue database or its stored data. It is tracked upstream as [upstream issue #57424](https://github.com/anomalyco/opencode/issues/57424) and locally as `opencode-beads-o66`.
- **Rejecting a permission is not Stop.** If you reject one nested operation, it does not run and is not retried. However, that does not promise to end the rest of the composition, because each later operation gets its own permission check. Use explicit Stop/Cancel to stop the composition.
- **Bounded evidence.** Qualification covers exact OpenCode 2.2.6 and one genuine OpenAI workflow. It is not a model-reliability, token-saving, cross-provider checkpoint or multi-hour claim.

## Documentation

- [User guide](docs/user-guide.md): options, upgrading, context injection, migration guard, workflows, task agent, customization, compatibility and troubleshooting.
- [Code-mode guidance](assets/oc-beads/resources/CODE_MODE.md): composing typed operations and recovering from partial or uncertain outcomes.
- [Documentation index](docs/README.md): where behavior, rationale, reference facts and historical evidence live.
- [OpenCode integration reference](docs/opencode-sdk-contract.md) and [Beads artifact policy](docs/beads-artifact-policy.md).
- [Changelog](CHANGELOG.md) and [security policy](SECURITY.md).

## Authorship and license

This is an independent project maintained by Matt Jackson. It began as a fork of [Josh Thomas's `opencode-beads`](https://github.com/joshuadavidthomas/opencode-beads), and the original work remains credited to its author. Its project-owned guidance includes attributed MIT-licensed excerpts; it redistributes no upstream executable, host integration or sync-managed vendor tree. See the [notice](assets/oc-beads/THIRD_PARTY_NOTICES.md). The daily/manual maintenance workflow checks tagged CLI compatibility and independently compares reviewed upstream integration sources with current MAIN. Completed source changes are informational; adoption remains a human decision.

opencode-beads is licensed under the MIT license. See [`LICENSE`](LICENSE).

opencode-beads is not built by or affiliated with the OpenCode team. OpenCode is ©2025 Anomaly.
