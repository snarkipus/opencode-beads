# OpenCode 2.4.1 bounded native qualification

The [opt-in probe](native-release-probe.md) ran once with all six cases, after
correcting its result parser and replay setup. It exited 0. This record covers
exact 2.4.1, not every 2.4.x release, publication, or operator activation.

- Source basis: PR [#52](https://github.com/snarkipus/opencode-beads/pull/52)
  fixture head `5fd9a94fca9511467e723504eec04c88e0a51f93` plus exact-2.4.1
  admission and shared diagnostics.
- Qualified archive SHA-256:
  `a69e2c72660758da530e7165637adf182fe3cde71bff94e4d3ef449359cbced9`.
  In the PR, packaged source, guidance, manifest and license match that archive;
  README compatibility prose is the only packaged content difference.
- Probe SHA-256:
  `18c6b48d379c43727e402c6f9e6a5af595975409619b55a6392776aaffe705eb`.
  Four deterministic parser and snapshot tests passed.
- Official Linux x64 OpenCode 2.4.1 executable SHA-256:
  `ec93043f18f8a6b4d8e71ec9260e292ba6f91b66b142782135d40f0b58b0c152`.
  The private API reported 2.4.1. Beads was 1.3.4 (`7ef2fd05e`); the native
  model was `opencode/tidepool-alpha-free` at its default variant. No operator
  credentials, sessions, or store were used.

| Case | Native observation |
| --- | --- |
| Registration | 30 commands, skill and task agent discovered; diagnostics showed a healthy 2.4.1 Host row and typed registration. |
| Typed read | Native search and `beads.get` completed with an acknowledged, complete result matching independent `bd show`. |
| Denial | Native permission denied the typed note; independent readback was unchanged. |
| Stop and late reply | Stop interrupted the typed note's approval wait. An exact late `once` reply returned 204 and consumed the pending request without a saved approval, resumed tool, or mutation. Independent readbacks agreed before Stop, after Stop, and after reply. |
| Saved workflow | The same private session reopened in a new server process. Its saved diagnostics snapshot was unchanged. The next request contained exactly one restored instruction copy, the compact invocation, and Beads context; the native model emitted a token. |
| Handoff | A native child completed and the parent received the expected `<background-result kind="subagent">` envelope and report. |

Both owned listeners closed. This run did not measure compaction replay, model
switching, interruption of an already-running `bd` process, or a live database
upgrade/downgrade. The native package loader used the verified archive's unpacked
directory; the 2.4.1 host rejects a local `file://…tgz` path as a configured
plugin directory. No registry install or publication was part of the canary.

The reviewed monitor change also relies on the [2.4.0](https://github.com/anomalyco/opencode/releases/tag/v2.4.0)
and [2.4.1](https://github.com/anomalyco/opencode/releases/tag/v2.4.1) release
review and exact SDK 2.3.0 and 2.4.1 source/package checks. The original
[scheduled failure](https://github.com/snarkipus/opencode-beads/actions/runs/45582587269)
showed the required `codemode` fixture shape mismatch and the separate review
gate. Advancing the monitor records review, not an installation change.
