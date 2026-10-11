# OpenCode V2 Plugin Contract

Reviewed on 2026-10-11 for the narrow OpenCode boundary used by this package (`opencode-beads-2zs`). OpenCode 1.x and its `@opencode-ai/plugin` hook API are no longer supported; 0.10.x and earlier target that line.

## Versions and sources

- Declared optional peer range: `@opencode/plugin` `>=2.0.26 <3`. The only import is type-only (`import type { Plugin } from "@opencode/plugin"`), so packages install nothing from OpenCode and use the host's runtime.
- Installed development dependency: `@opencode/plugin` `2.0.26`, matching the validated `@opencode/cli` 2.0.26 host (Bun 1.4.2).
- Authoritative sources: the installed `@opencode/plugin` 2.0.26 declarations, the [plugin guide](https://opencode.ai/v2/docs/build/plugins/), the [V1 migration guide](https://opencode.ai/v2/docs/build/plugins/migrate-v1/), [plugin configuration](https://opencode.ai/v2/docs/plugins/), the [skills reference](https://opencode.ai/v2/docs/skills/), the published OpenAPI document (`https://opencode.ai/v2/openapi.json`), and `@opencode/schema` 2.0.26 for event names.
- Qualification: a throwaway V2 plugin (`opencode-beads-2zs.1`) and the actual source plugin were loaded into disposable projects on OpenCode 2.0.26. Results were read with `opencode debug agents`, a JSONL trace from the plugin, and short `opencode run` sessions. Test sessions were deleted afterwards.

## Plugin shape and loading

The package default-exports `{ id: "opencode-beads", setup }`, the object `Plugin.define` returns; no runtime import is needed. `setup` returns a cleanup that aborts the event subscription.

OpenCode resolves a package plugin as `<name>/server`, then `<name>`. The package exports both specifiers to `src/plugin.ts`, and the package smoke test checks both. A configured local plugin must be a directory with an `index` or `server` entry file; a file path is rejected, relative paths resolve from the config file's directory, and a missing entry is skipped without a log line. Files in `.opencode/plugins/` load automatically.

## Boundary inventory

| Boundary | Supported contract and decision |
| --- | --- |
| Location | `ctx.location.directory` scopes every `bd` process. The host's `process.cwd()` is the user's home directory, so `bd` is always spawned with an explicit `cwd`. |
| Options | `ctx.options` carries the object form `{ "package": ..., "options": {...} }`. The plugin reads `luna` and `autoMigrate` as strict booleans. |
| Agents | `ctx.agent.transform(editor => editor.update(id, fn))`. The editor has no `add`; `update` on an unknown ID creates the agent from OpenCode defaults, including the default permission ruleset. User `agents` configuration overrides plugin fields one by one, and the editor does not list configuration-only agents, so V1 collision warnings were dropped. The host appends a `browser` deny rule. |
| Agent lookup | `ctx.agent.get({ agentID })` returns `Agent.Info` with `mode`; it is safe to call inside a session hook (about 1 ms). Subagents are excluded from context; lookup failures fail open. |
| Context | `ctx.session.hook("context", event => event.system.push({ type: "text", text }))` runs before every agent-loop model request with `sessionID` and `agent`. Pushed parts reach the model, are not stored in history, and survive compaction. Subagents launched through the `subagent` tool run in child sessions with their own `sessionID` and also pass through this hook. Compaction requests use the separate `compaction` hook, which the plugin does not register. |
| Events | `ctx.event.subscribe({ signal })` yields `{ type, data }`. The plugin uses `session.compaction.ended` (invalidate cached prime) and `session.deleted` (drop session state), both with `data.sessionID`. A manual compaction emitted `session.compaction.ended`, not `session.compacted`. |
| Diagnostics | V2 has no plugin log API. Rate-limited `console.warn` lines prefixed `[opencode-beads]` are emitted, and their failures never affect requests. |
| Shell | There is no `$` helper in V2. Bounded process lifecycle control uses `Bun.spawn(["bd", "prime"], { cwd, ... })` through a shared `runBd` runner with timeout and process-group cleanup; `node:child_process` also works in the host. |

## Commands and skills

V2 plugin commands are executable (`execute` calls `ctx.session.prompt`) rather than templates. Plugin-provided skills need a `path`. The vendored `/beads:*` templates were retired instead of ported (`opencode-beads-2zs.4`). OpenCode V2 discovers the canonical `.agents/skills/beads` skill installed by `bd init` natively, and users can load it with `@beads`.

## Compatibility decisions

The supported line begins at OpenCode 2.0.26, the first version qualified. There is no V1 fallback or dual export: V2 ignores V1 `server()` exports, and supporting both would mean maintaining two hook implementations. Tests fake only the small context slice the plugin uses (`location`, `options`, `event`, `agent.get`, `agent.transform`, `session.hook`) so behavior can be checked without the host.

When running `opencode run` from a non-interactive shell during qualification, close stdin (`< /dev/null`); otherwise the CLI waits indefinitely, which looks like a hang.
