# OpenCode SDK and Plugin Contract

Reviewed on 2026-07-20 for the narrow OpenCode boundary used by this package.

## Versions and sources

- Declared optional peer range: `@opencode-ai/plugin` and `@opencode-ai/sdk` `>=1.18.3 <2`; both imports are type-only, so consumers use the OpenCode host's compatible runtime rather than installing a duplicate.
- Installed development dependencies: plugin `1.18.4` and SDK `1.18.4` as an exact compatible pair.
- Minimum supported and separately validated pair: plugin `1.18.3` and SDK `1.18.3`.
- Current stable reviewed from the npm `latest` dist-tag: plugin `1.18.4` and SDK `1.18.4`. The npm package diff from `1.18.3` changes no plugin or SDK declarations; the plugin updates its exact SDK dependency and optional OpenTUI peer minimums.
- Authoritative sources: the installed package declarations; the [official plugin documentation](https://opencode.ai/docs/plugins); the [official SDK documentation](https://opencode.ai/docs/sdk); the `1.18.4` [plugin declarations](https://cdn.jsdelivr.net/npm/@opencode-ai/plugin@1.18.4/dist/index.d.ts), [generated SDK declarations](https://cdn.jsdelivr.net/npm/@opencode-ai/sdk@1.18.4/dist/gen/types.gen.d.ts), and [generated client result declarations](https://cdn.jsdelivr.net/npm/@opencode-ai/sdk@1.18.4/dist/gen/client/types.gen.d.ts); and the upstream [plugin source](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts). The same declarations were diffed against minimum `1.18.3`.
- API history reviewed: the closed [SDK v2 migration proposal](https://github.com/anomalyco/opencode/pull/7639), which documents flattened v2 requests as a breaking alternative. Stable plugin `1.18.4` still exposes the v1 client with nested request objects.

## Boundary inventory

| Boundary | Supported contract and decision |
| --- | --- |
| `PluginInput` | Minimum `1.18.3` and current stable `1.18.4` supply `client`, `project`, `directory`, `worktree`, `serverUrl`, `experimental_workspace`, and `$`. The plugin intentionally consumes only `client`, `directory`, and `worktree`; their declarations are identical across the supported range. |
| Project scope | `directory` is the active session directory and is preferred. `worktree` is the documented Git worktree and is the only fallback. Empty values fail rather than falling back to `process.cwd()`. Every project-scoped SDK query and `bd` process receives the resolved directory. |
| Messages | `client.session.messages({ path: { id }, query: { directory, limit } })`; generated `SessionMessagesData` and `SessionMessagesResponse` types are authoritative. Returned arrays are checked before entering controller logic. |
| Agents | `client.app.agents({ query: { directory } })`; generated `AppAgentsData`, `Agent`, and response types are authoritative. Required `name` and supported `mode` values are checked. |
| Prompt | `client.session.prompt({ path: { id }, query: { directory }, body })`; the body is derived from `SessionPromptData`, with `noReply: true` and a synthetic `TextPartInput`. This is the documented context-only prompt path. |
| Diagnostics | `client.app.log({ query: { directory }, body })` uses the generated log request and the official structured logging recommendation. Diagnostic failure remains non-fatal at the controller boundary. |
| SDK results | Generated clients default to `responseStyle: "fields"` and `throwOnError: false`. Each call therefore checks ordinary `{ error }` results and required `data`; thrown transport/client failures also propagate to existing controller fallback and diagnostic handling. |
| `chat.message` | The official hook input provides `sessionID`, optional `agent`, and optional model IDs in both reviewed versions. These input fields, not duplicated fields from the output message, drive injection. |
| `event` | The official discriminated `Event` union includes `session.compacted` with `properties.sessionID`; only that event is consumed. |
| `config` | The official hook mutates `Config` in place. Beads commands and the task agent are merged into `command` and `agent`, with explicit user definitions taking precedence. Vendor command metadata preserves `description`, `agent`, `model`, and `subtask`; supported task-agent metadata maps directly to `AgentConfig`. |
| Shell | The plugin does not use `PluginInput.$`: bounded process lifecycle control uses `Bun.spawn(["bd", "prime", "--memories-only"], { cwd: projectDirectory, ... })`. Only stderr that specifically reports the unsupported flag triggers one `Bun.spawn(["bd", "prime"], ...)` compatibility fallback. Both attempts retain timeout and cleanup guarantees; there is no implicit process cwd. |

## Compatibility decisions

The supported OpenCode line begins at `1.18.3`, with the concrete contract checked against that minimum and current stable `1.18.4`. Both expose the nested v1 request shape used here, the same hook fields consumed here, directory query parameters, and field-style SDK results. Their relevant declarations are identical, so no compatibility fallback is needed.

No SDK v2 facade or feature detection is included. Flattened request parameters belong to a separate breaking API and are not the stable plugin contract reviewed here. The controller keeps only small projections derived from official message, agent, prompt, hook, and config exports so tests can fake behavior without reproducing the SDK client.
