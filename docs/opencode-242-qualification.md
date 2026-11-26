# OpenCode 2.4.2 bounded qualification

This record covers exact OpenCode 2.4.2, not other 2.4.x versions, operator
activation, or a package publication.

## Upstream review

Compared [v2.4.1](https://github.com/anomalyco/opencode/tree/6f0514052a3c859894ad01bb14cc14dda1e44b96)
with [v2.4.2](https://github.com/anomalyco/opencode/tree/fc31a485317970bcf6be7b431a9830aaef875731)
and read the [2.4.2 release notes](https://github.com/anomalyco/opencode/releases/tag/v2.4.2).
GitHub's compare returned its 300-file cap. Both complete recursive Git inventories
matched the tagged archives (14,029 and 14,190 paths; 1,004 changed paths).

- The [Promise endpoint bridge](https://github.com/anomalyco/opencode/blob/fc31a485317970bcf6be7b431a9830aaef875731/packages/plugin/src/promise/adapter.ts#L299-L320)
  now rejects an already-aborted call and passes the signal to the Effect runtime.
  [`permission.assert`](https://github.com/anomalyco/opencode/blob/fc31a485317970bcf6be7b431a9830aaef875731/packages/plugin/src/promise/adapter.ts#L535-L543)
  remains a separate path. Beads retains the tool signal, waits for permission and
  rechecks cancellation before spawning `bd`.
- The [inventory](https://github.com/anomalyco/opencode/blob/fc31a485317970bcf6be7b431a9830aaef875731/packages/core/src/tool.ts#L310-L331)
  uses whole-action denial, so trailing narrower denies do not undo a blanket
  deny. The [per-resource check](https://github.com/anomalyco/opencode/blob/fc31a485317970bcf6be7b431a9830aaef875731/packages/core/src/permission.ts#L190-L225)
  still resolves the invoking agent and session and honors configured denies.
- The [session interrupt API](https://github.com/anomalyco/opencode/blob/fc31a485317970bcf6be7b431a9830aaef875731/packages/server/src/handlers/session.ts#L617-L622)
  preserves explicit interruption. The [TUI's early Esc](https://github.com/anomalyco/opencode/blob/fc31a485317970bcf6be7b431a9830aaef875731/packages/tui/src/component/prompt/index.tsx#L396-L422)
  can now return an unanswered prompt to the composer; user input unarchives
  sessions, and parent moves propagate to eligible children. Those operator
  behaviors were reviewed in source, not exercised by the API probe.

## Measured evidence

- Source basis: `e3a9d7a2d1a504344fda2f47900bf4d5cc298ef9` plus the exact
  2.4.2 admission addition. Native-tested archive SHA-256:
  `d5b25e80b83fe815704b09b9c6ed7c79bbe3f9b0602350696f779c12c8b81112`.
  The release archive comparison permits only the manifest version field and
  README prose to differ; source, packaged guidance and all other files match.
- Official Linux x64 host executable SHA-256:
  `523b1502d1d556998b0904235cef65eb1d8cf8362b4e2faa7ae7a170c9a44cd4`.
  Both private servers reported 2.4.2; fixture Beads was 1.3.4 (`7ef2fd05e`).
- The unchanged [probe](native-release-probe.md) used a scratch launcher to
  select an explicitly authorized disposable profile. Native records confirmed
  `openai/gpt-6.2-sol` at `medium`. The previous free-model attempt was blocked
  by provider HTTP 400; it was not counted as a pass.
- Exact SDK 2.3.0 and 2.4.2 each passed 261 tests, typecheck, and package smoke
  on Bun 1.3.14. The native probe exited 0 with all six cases passing:

| Case | Native observation |
| --- | --- |
| Registration and diagnostics | The package registered on exact 2.4.2 and diagnostics reported a healthy Host row. |
| Typed read | Native discovery and `beads.get` returned an acknowledged, complete result; independent readback matched. |
| Denial | The denied typed note left the fixture unchanged. |
| Stop and late reply | Stopped during a pending note approval. A late one-time reply returned 204 without resuming the tool, saving approval or changing the fixture. |
| Saved workflow replay | A fresh private server reopened the same session. One instruction snapshot, compact invocation and Beads context were present in the next request, which produced a native model token. |
| Handoff | The bounded child completed and the parent received the expected native `<background-result kind="subagent">` envelope. |

Both owned listeners closed. The probe did not measure compaction replay,
interruption of a running `bd` process, cross-provider replay or a live database
upgrade. Prior qualification records are unchanged.
