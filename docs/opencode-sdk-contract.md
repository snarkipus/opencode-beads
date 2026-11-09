# OpenCode integration reference

Reference facts for the current 2.x source line: which pinned OpenCode plugin
interfaces the adapter uses, where, and from which sources. This page is **not a
behavioral contract**. Product rules live in the canonical OpenSpec requirements
linked below. Incorrect explanatory prose should be corrected; a genuine mismatch
between upstream capabilities and required behavior must be reported, not hidden
by rewriting facts (see the [documentation index](README.md)). The dated ledger that used
to live at this path is preserved as
[historical evidence](history/opencode-sdk-contract-ledger.md).

## Versions and sources

- Package declarations: optional peer `@opencode/plugin` `>=2.2.6 <2.3`, and
  `2.2.6` for development typing only. The only import is
  `import type { Plugin } from "@opencode/plugin"`, so the package installs
  nothing from OpenCode and runs on the host's runtime.
- Pinned host source for 2.2.6: `anomalyco/opencode`
  [`dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06`](https://github.com/anomalyco/opencode/tree/dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06).
  The 2.1→2.2 adaptation rationale is in the archived
  [design](../openspec/changes/archive/2026-11-09-adapt-opencode-2-2/design.md).
- Upstream documentation: [plugin guide](https://opencode.ai/v2/docs/build/plugins/),
  [plugin configuration](https://opencode.ai/v2/docs/plugins/),
  [commands](https://opencode.ai/v2/docs/commands/),
  [skills](https://opencode.ai/v2/docs/skills/) and the published OpenAPI
  document (`https://opencode.ai/v2/openapi.json`).
- Beads: supported minimum `bd` 1.3.1 (`package.json` `beads.minimum`, enforced
  by `src/guard.ts`); the CLI facts the plugin depends on are exercised by
  [`scripts/bd-contract.ts`](../scripts/bd-contract.ts). See the
  [artifact policy](beads-artifact-policy.md).
- Measured evidence: exact OpenCode 2.2.6 native-host qualification plus one
  genuine model workflow is recorded in the
  [2.2.6 qualification](opencode-22-qualification-5rj2.md). That record is
  frozen; the published 2.0.0 package carries the same runtime files and
  packaged guidance with updated version metadata.

## Loading and host admission

The package default-exports `{ id: "opencode-beads", setup }` (the shape
`Plugin.define` returns, without a runtime import). OpenCode resolves a package
plugin as `<name>/server`, then `<name>`; the package exports both to
`src/plugin.ts`, and the package smoke test checks both.

`setup` reads `ctx.app.version` and registers nothing outside `>=2.2.6 <2.3`,
emitting one `[opencode-beads]` warning instead (`src/host.ts`). Governing rule:
[Explicit native availability and fallback](../openspec/specs/workflow-access/spec.md#requirement-explicit-native-availability-and-fallback).

## Interface map

| Host interface | Use | Implementation | Governing requirement |
| --- | --- | --- | --- |
| `ctx.location.directory` | Scopes every `bd` process. The host's `process.cwd()` is not the project, so `bd` always gets an explicit `cwd`. | `src/host.ts`, `src/prime.ts` | [Restricted-agent typed operation boundary](../openspec/specs/workflow-access/spec.md#requirement-restricted-agent-typed-operation-boundary) |
| `ctx.options` | Object-form plugin options; booleans are strict and numbers non-negative, otherwise defaults apply. | `src/host.ts` | [User guide options](user-guide.md#plugin-options) |
| `ctx.agent.transform` / `ctx.agent.get` | `editor.update(id, fn)` creates or updates the task agents from OpenCode defaults; user `agents` config overrides fields one by one. `get` supplies `mode` to exclude regular subagents (lookup failure fails open). | `src/agents.ts`, `src/host.ts` | [Scope-preserving execution](../openspec/specs/workflow-access/spec.md#requirement-scope-preserving-execution-and-visible-failure) |
| Agent `permissions`, `steps` | Ordered rules, last match wins; task agents append `ask` rules for commit, push, Dolt push/pull and sync (with global-option forms). `steps` is an interruption cap. | `src/agents.ts` | [Authorized continuation](../openspec/specs/workflow-access/spec.md#requirement-authorized-continuation-without-scope-expansion) |
| `ctx.session.hook("context")` | Pushes guarded `bd prime`, actor and capability guidance as request-only system parts; reads `event.tools` to tell composed `execute`, direct `beads_*` leaves and direct shell apart. | `src/host.ts`, `src/context.ts` | [Capability-aware actor and context guidance](../openspec/specs/workflow-access/spec.md#requirement-capability-aware-actor-and-context-guidance) |
| `ctx.session.context({ sessionID })` | One request-local read of the native latest-compaction context; durable user records are matched to request user-message IDs to expand `ocBeadsWorkflow` (and legacy `ocBeadsSync`) snapshots. Unresolvable snapshots are reported unavailable. | `src/host.ts`, `src/workflows.ts` | [Compact workflow history](../openspec/specs/workflow-access/spec.md#requirement-compact-workflow-history-with-effective-instructions) |
| `ctx.session.hook("compaction")` | Adds Beads state-preservation guidance and known references/gaps; never replaces host summary or native results. | `src/host.ts` | [Native trigger and semantic responsibility separation](../openspec/specs/work-continuity/spec.md#requirement-native-trigger-and-semantic-responsibility-separation) |
| `ctx.session.get` | Confirms the session's current location before supplying context or snapshots. | `src/host.ts` | [Explicit native availability](../openspec/specs/workflow-access/spec.md#scenario-plugin-reloads-or-a-session-changes-location) |
| `ctx.command.transform`, `ctx.command.list`, `ctx.session.prompt` | Registers 29 `oc-beads:<stem>` workflows plus `oc-beads:diagnostics`; each body submits one ordinary prompt with compact visible text and a durable snapshot. Configuration/file commands replay later and keep precedence. | `src/workflows.ts`, `src/host.ts` | [Discoverable selected workflows](../openspec/specs/workflow-access/spec.md#requirement-discoverable-selected-workflows), [Read-only native diagnostics](../openspec/specs/workflow-access/spec.md#requirement-read-only-native-diagnostics) |
| `ctx.skill.transform`, `ctx.skill.list` | Registers the packaged `oc-beads` skill by path, checking collisions on every rebuild. | `src/host.ts`, `assets/oc-beads/` | [Owned installation and user customization](../openspec/specs/workflow-access/spec.md#requirement-owned-installation-and-user-customization) |
| `ctx.tool.transform` | Registers eleven operations in the `beads` namespace with `{ namespace: "beads", permission: "shell", codemode: true }`. Native shell is never callable inside `execute`. | `src/continuity.ts` | [Typed daily-loop composition](../openspec/specs/work-continuity/spec.md#requirement-typed-daily-loop-composition) |
| `ctx.permission.assert` | Each typed operation asserts its exact `bd` argv with the actual invocation session/agent/message/call and `save: []`. | `src/continuity.ts` | [Restricted-agent typed operation boundary](../openspec/specs/workflow-access/spec.md#requirement-restricted-agent-typed-operation-boundary) |
| `ctx.tool.hook("execute.after")` | Adds a reconciliation cue after a `subagent` result; outer `execute` results add nothing. | `src/host.ts` | [Delegated knowledge and closure evidence](../openspec/specs/work-continuity/spec.md#requirement-delegated-knowledge-and-closure-evidence) |
| `ctx.event.subscribe({ signal })` | `session.deleted`, `session.moved`, `session.forked` drop session state; `session.compaction.started`/`session.compaction.ended`/`session.compaction.failed`, execution start/interrupt/fail and model/agent selection invalidate cached prime. | `src/host.ts` | [Recovery from durable state](../openspec/specs/work-continuity/spec.md#requirement-recovery-from-durable-state) |
| Diagnostics output | V2 has no plugin log API; rate-limited `console.warn` lines prefixed `[opencode-beads]`. | `src/host.ts` | — |
| Process execution | No `$` helper in V2. `Bun.spawn(["bd", ...args], { cwd, ... })` through the shared `runBd` runner, with timeout and process-group cleanup. | `src/prime.ts` | — |

Typed write actors are derived from the invocation as
`opencode:<readable-agent>:<12-hex-digest>` (`executorActor` in
`src/continuity.ts`); permission checks use the actual `context.agent`, and
attribution grants no permission.

## Known host-dependent limitations

These are stated normatively in the specs and summarized for users in the
[README](../README.md#known-limitations); they are listed here only so readers of
this reference know which host behavior they depend on.

- Snapshot recovery after native compaction followed by an incompatible model
  switch depends on what `session.context` returns
  ([scenario](../openspec/specs/workflow-access/spec.md#scenario-model-switch-restores-older-transcript-beyond-the-readable-context);
  upstream [#57424](https://github.com/anomalyco/opencode/issues/57424); local
  `opencode-beads-o66`).
- Whether a rejected nested operation ends the outer code-mode step is host-owned
  ([scenario](../openspec/specs/workflow-access/spec.md#scenario-user-corrects-or-declines-a-typed-operation)).

## Practical notes

- A configured local plugin must be a directory with an `index` or `server`
  entry; files in `.opencode/plugins/` load automatically.
- When running `opencode run` from a non-interactive shell, close stdin
  (`< /dev/null`); otherwise the CLI waits indefinitely.

## Former ledger sections

Older documents link to sections of the former ledger at this path. Those
sections now live in the historical copy:

- <a id="task-7173-source-candidate--2026-10-21"></a>[Task 7.1–7.3 CLI/native bridge ledger](history/opencode-sdk-contract-ledger.md#task-7173-source-candidate--2026-10-21)
- <a id="tasks-2233-source-candidate-native-registration-and-diagnostics"></a>[Tasks 2.2/3.3 native registration and diagnostics](history/opencode-sdk-contract-ledger.md#tasks-2233-source-candidate-native-registration-and-diagnostics)
