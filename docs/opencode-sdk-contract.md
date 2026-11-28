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

- Package declarations in this source: optional peer `@opencode/plugin` `>=2.3.0 <2.4 || 2.4.1 || 2.4.2`, and
  `2.3.0` for development typing only. The only import is
  `import type { Plugin } from "@opencode/plugin"`, so the package installs
  nothing from OpenCode and runs on the host's runtime.
- Pinned host source for 2.3.0: `anomalyco/opencode` [`a6b15d33daf6ab7d35569f6d711fdb630b9f04e7`](https://github.com/anomalyco/opencode/tree/a6b15d33daf6ab7d35569f6d711fdb630b9f04e7).
- Pinned host source for 2.4.1: `anomalyco/opencode` [`6f0514052a3c859894ad01bb14cc14dda1e44b96`](https://github.com/anomalyco/opencode/tree/6f0514052a3c859894ad01bb14cc14dda1e44b96).
- Pinned host source for 2.4.2: `anomalyco/opencode` [`fc31a485317970bcf6be7b431a9830aaef875731`](https://github.com/anomalyco/opencode/tree/fc31a485317970bcf6be7b431a9830aaef875731).
- See [compatibility evidence](compatibility-evidence.md) for exact native runs and their limits. SDK and fixture checks alone do not establish native behavior.
- Earlier host source for 2.2.6: `anomalyco/opencode`
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
- Earlier candidate evidence: exact OpenCode 2.2.6 native-host qualification plus one
  genuine model workflow is recorded in the
  [2.2.6 qualification](opencode-22-qualification-5rj2.md). That record is
  frozen; the published 2.0.0 package carries the same runtime files and
  packaged guidance with updated version metadata.

## Release monitoring

Use the [opt-in native release probe](native-release-probe.md) for host checks;
model-backed cases are not part of scheduled SDK CI.

The daily/manual [`beads-contract` workflow](../.github/workflows/beads-contract.yml)
has an independent OpenCode stable-release job alongside the existing Beads checks.
Its human-reviewed release baseline is [`.github/opencode-reviewed-version`](../.github/opencode-reviewed-version),
not the development SDK pin or a claim of native-host qualification.
The initial 2.2.7 review covers tagged source and SDK compatibility only; it
claims no additional native-host/model qualification. Assessment evidence and
check results belong in Beads, not this standing reference.

The job selects the highest stable OpenCode version from 2.0.0 onward by default,
using the complete paginated release list with only tag/draft/prerelease metadata.
It ignores legacy 1.x and separately named component releases: GitHub's
repository-wide `latest` can designate the legacy line instead of V2. Future
major releases still trigger review; their detection does not expand host
admission. Manual runs can select an exact stable V2-or-later release tag with
`opencode_version`. The job installs that exact published SDK in a disposable
Git snapshot, restores the snapshot's source manifest/lockfile, and runs the
existing tests, typecheck and package smoke. Its Actions summary
records the release link, reviewed baseline and SDK outcome. Newer unreviewed
releases fail the independent monitor even if SDK checks pass. Retrieval/install
or compatibility failures remain failures, not successful no-change results.

Review the release notes and relevant tagged source before deliberately advancing
the reviewed-version file. Passing SDK checks does not automatically admit a new
host version, change the pinned SDK, update consumer installations or establish
live-host/model qualification. The monitor creates no issues, PRs or releases;
selected follow-up work belongs in Beads. Its failures do not become dependencies
of ordinary product CI or the release workflow.

## CI failure notifications

The metadata-only [failure notifier](../.github/workflows/notify-ci-failure.yml)
posts a failed `ci` or `beads-contract` run's link to Discord. Create an incoming
webhook in the intended Discord channel, then save its standard URL directly as
the repository Actions secret `DISCORD_CI_WEBHOOK_URL`; never put it in source or
chat. Without that secret, delivery is not configured and the notifier reports
an error. Successful runs do not post, mentions are disabled, and the notifier
never checks out failed-run code or downloads its artifacts. Each failed-run
completion gets one send attempt; manually rerunning the notifier can duplicate
a message. Activation and observed delivery are separate: first delivery remains
unverified until a real failure is posted to the intended channel.

## Loading and host admission

The package default-exports `{ id: "opencode-beads", setup }` (the shape
`Plugin.define` returns, without a runtime import). OpenCode resolves a package
plugin as `<name>/server`, then `<name>`; the package exports both to
`src/plugin.ts`, and the package smoke test checks both.

`setup` reads `ctx.app.version` and registers nothing outside `>=2.3.0 <2.4 || 2.4.1 || 2.4.2`,
emitting one `[opencode-beads]` warning instead. Diagnostics uses the same selector
(`src/host-admission.ts`). Governing rule:
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
| `ctx.session.get` | Confirms the session's current location before supplying context or snapshots or running location-bound diagnostic probes. | `src/host.ts`, `src/host-diagnostics.ts` | [Explicit native availability](../openspec/specs/workflow-access/spec.md#scenario-plugin-reloads-or-a-session-changes-location) |
| `ctx.command.transform`, `ctx.command.list`, `ctx.session.prompt` | Registers 29 `oc-beads:<stem>` workflows plus `oc-beads:diagnostics`; each body submits one ordinary prompt with compact visible text and a durable snapshot; diagnostics passes exact invocation text to its existing callback, captures finished compact code-rendered tables with DATE/VERSION/native root PATH below the title by default or bounded evidence for exact trimmed case-insensitive `details` or `details remote`; exact `help` bypasses that callback and captures a self-contained static reference, and new diagnostic captures delimit the finished report with actual newline separation before the retained invocation; the subsequent visible response remains model-mediated. Replay uses that saved selection without recollection or retrofitting old snapshots. Configuration/file commands replay later and keep precedence. | `src/workflows.ts`, `src/host.ts`, `src/host-diagnostics.ts` | [Discoverable selected workflows](../openspec/specs/workflow-access/spec.md#requirement-discoverable-selected-workflows), [Read-only native diagnostics](../openspec/specs/workflow-access/spec.md#requirement-read-only-native-diagnostics) |
| `ctx.skill.transform`, `ctx.skill.list` | The transform registers the packaged `oc-beads` skill by path and checks collisions through its editor on rebuild. Diagnostics lists effective skills separately. | `src/host.ts`, `src/workflows.ts`, `src/host-diagnostics.ts`, `assets/oc-beads/` | [Owned installation and user customization](../openspec/specs/workflow-access/spec.md#requirement-owned-installation-and-user-customization) |
| `ctx.tool.transform` | Registers eleven operations in the `beads` namespace with `{ namespace: "beads", permission: "shell", codemode: true }`. Native shell is never callable inside `execute`. | `src/continuity.ts` | [Typed daily-loop composition](../openspec/specs/work-continuity/spec.md#requirement-typed-daily-loop-composition) |
| `ctx.permission.assert` | Each typed operation asserts its exact `bd` argv with the actual invocation session/agent/message/call and `save: []`. | `src/continuity.ts` | [Restricted-agent typed operation boundary](../openspec/specs/workflow-access/spec.md#requirement-restricted-agent-typed-operation-boundary) |
| `ctx.tool.hook("execute.after")` | Adds a neutral next-request reconciliation cue after a `subagent` call, including a launch handle or error; it does not determine completion. Outer `execute` results add nothing. | `src/host.ts` | [Delegated knowledge and closure evidence](../openspec/specs/work-continuity/spec.md#requirement-delegated-knowledge-and-closure-evidence) |
| `ctx.event.subscribe({ signal })` | `session.deleted`, `session.moved`, `session.forked` drop session state; `session.compaction.started`/`session.compaction.ended`/`session.compaction.failed`, execution start/interrupt/fail and model/agent selection invalidate cached prime. | `src/host.ts` | [Recovery from durable state](../openspec/specs/work-continuity/spec.md#requirement-recovery-from-durable-state) |
| Diagnostics output | V2 has no plugin log API; rate-limited `console.warn` lines prefixed `[opencode-beads]`. | `src/host.ts` | — |
| Process execution | No `$` helper in V2. `Bun.spawn(["bd", ...args], { cwd, ... })` through the shared `runBd` runner, with timeout and process-group cleanup. | `src/prime.ts` | — |

Diagnostic workflow capture lives in `src/host-diagnostics.ts`. It samples session cache evidence after confirming location, then reads live request, registration, and persistence evidence after the native probes. `src/host.ts` owns that state; `src/workflows.ts` saves the captured report for replay.

Typed write actors are derived from the invocation as
`opencode:<readable-agent>:<12-hex-digest>` (`executorActor` in
`src/continuity.ts`); permission checks use the actual `context.agent`, and
attribution grants no permission.

## Typed read example and verification

For example, `tools.beads.get({ ids: ["project-42", "project-57"] })` invokes
`bd show project-42 --json` and `bd show project-57 --json` individually in the
project directory, each with `--sandbox`. The adapter validates each response as
a single issue row matching the requested ID. When both validate, the
acknowledged response contains an `issues` map keyed by those IDs and
`complete: true`. The normative requirements are in
[Typed daily-loop composition](../openspec/specs/work-continuity/spec.md#requirement-typed-daily-loop-composition).

- The native CLI contract exercises flags, output shapes and exit codes in disposable Beads workspaces. [CLI contract runner](../scripts/bd-contract.ts)
- Adapter fixtures exercise argv, permission assertions, response validation and partial results through the registered tool surface. [Continuity tests](../tests/continuity.test.ts)
- The real OpenCode canary exercises host discovery and, when a model is available, typed calls and permission behavior. [Native qualification runner](../scripts/native-qualification.py), [compatibility evidence](compatibility-evidence.md)

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
