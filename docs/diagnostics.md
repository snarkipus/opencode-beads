# Beads diagnostics reference

`/oc-beads:diagnostics` reports observed integration conditions in compact Plugin
and Beads tables. It captures a result once; primary and compaction replay use that
saved result. The timestamp describes capture time, not current live state on replay.

| Invocation | Result |
| --- | --- |
| `/oc-beads:diagnostics` or other free text | Collect once and show normal tables, labeled header metadata and conditional actions. |
| `/oc-beads:diagnostics details` | Collect once and append bounded evidence, provenance and explanations. |
| `/oc-beads:diagnostics remote` | Show normal tables and explain why a fresh history comparison is unavailable. |
| `/oc-beads:diagnostics details remote` | Explain the unavailable comparison and include bounded local evidence. |
| `/oc-beads:diagnostics help` | Capture a self-contained static reference without invoking diagnostic collection. |

Selectors are exact after trimming and case folding. For example, ` HeLp ` selects
help. `help me`, `remote please`, `remote details` and `details  remote` select normal output. Literal user text,
attachments and native delivery remain intact in history. Help is built into the
package because this repository's `docs/` directory is not shipped. No extra skill
resource or public command is needed.

## Reading the report

✅ **Healthy** means an assessed check matches. ⚠️ **Mismatch** means an observed
setup difference. ❌ **Unhealthy** means known incompatibility or integration
failure. **—** means unobserved or unassessed. Overall and section headings use the
worst assessed check; neutral rows remain visible without contributing severity or
heading counts. With no assessed checks, the heading says **No checks assessed**.
A healthy heading does not claim that every neutral row was measured.

Immediately below the title, before any conditional summary, each metadata item is
its own paragraph: **DATE** is the exact ISO capture timestamp, **VERSION** is the
executing package manifest name/version, and **PATH** is the observed native
`cwd_repo_root` (repository root). A missing root says `not observed`: the plugin
does not strip `.beads`, append a slash, infer a root or substitute session cwd.
The original `beads_dir` remains available in details. Metadata is not repeated
at the bottom; host and CLI versions stay in their rows.

The report is fully populated Markdown from code, not placeholders for the model
to reconstruct. New diagnostic captures enclose it in literal
`BEGIN_DIAGNOSTIC_REPORT` / `END_DIAGNOSTIC_REPORT` lines and real newline separators
before the preserved original invocation. Relay guidance requests only the report,
with values, labels, order and Markdown intact; boundary markers, invocation and
extra commentary are not intended visible output. Other free text still selects
normal output; the command relays the report rather than answering appended questions.
Older v1 snapshots replay their
saved instructions unchanged. Generic workflows keep their existing payloads.

Native Markdown tables, bold and inline code use the host's theme; the package
does not control smaller fonts or dim styling. Code-populated fields and request
separation do not bypass the model: byte-exact visible relay is not guaranteed.

## Plugin checks

| Row | Source and values | Meaning, response and verification |
| --- | --- | --- |
| Host | Observed OpenCode application version, evaluated against the same selector as plugin registration. | Unsupported is unhealthy; unknown is neutral. Check the operator's OpenCode version and the [supported interface reference](opencode-sdk-contract.md). Installation/upgrades are operator-owned. |
| Commands | Effective command names/descriptions compared with the existing 30 package definitions. | Complete membership shows `30/30 present`, or e.g. `29/30 · 1 missing` / `30/30 · 1 changed`. Missing/changed is mismatch, registration failure unhealthy, incomplete membership or failed lookup neutral. Review user command overrides and rerun diagnostics. |
| Skill | Packaged skill load result, effective skill IDs and rebuild collision evidence; scoped shared skill file readability. | `oc-beads active`, `absent` or `overridden`; packaged failure is `unavailable`. Absence/override is mismatch, packaged failure unhealthy, lookup/readability gaps neutral. `shared: absent` alone is informational for other harnesses. Review overrides, then check the registry in details. |
| Typed tools | Actual registration state, separate from requested enablement. | `Registered`, `Requested, not registered` (unhealthy), `Not requested` (neutral), or not observed. Registration grants no permissions or assurance that every leaf is visible. Check details and actual tool discovery with the intended agent. |
| Context | Cached native-prime status and preceding CLI version associated with a successful load. | `Loaded`, `Loaded under bd …` (version difference, mismatch), `Not yet loaded`, `Loading`, `Empty`, `Withheld`, `Failed` or `Session lookup failed`. Withheld/failure is unhealthy; missing/loading/empty evidence neutral. Use a next session or configured idle refresh for a version difference, then check this row. |
| AGENTS Configured | A bounded `AGENTS.md` at context `cwd_repo_root`, otherwise the confirmed session directory. Counts recognized full/minimal/Codex bd blocks. | `bd block` is healthy observed configuration; `duplicate bd blocks` means repeated full blocks (mismatch). `no bd block`, `no AGENTS.md`, `unreadable`, `truncated` or not observed is neutral. Review local customization before edits; verify root-file and request counts in details. |
| Write outcomes | Existing recorded unresolved write evidence, only when present. | A mismatch requiring inspection of the actual operation/readback before any retry. No row is shown for the default lack of a final-write guarantee. Diagnostics does not repair or retry writes. |

### Command evidence caps and ownership

The registry observation caps the list at 128 entries, names at 128 characters and
descriptions at 512 characters. Membership clipping makes the normal row **list
incomplete**; it cannot establish all expected names or declare unobserved names
missing. Any comparable observed description changes remain visible as a changed
count even when membership is incomplete. Description clipping alone is our evidence cap, not a host health defect:
complete expected names can be healthy, and clipping appears only in details.
Clipped descriptions are excluded from mismatch comparison. Real missing names and
comparable description changes remain visible. A saved older observation without
an expected-count field can say **expected names present** without inventing a ratio.

Matching descriptions do not establish public owner identity or detect an override
with an identical description. User precedence and package restoration remain native.

### Instruction scope and initial context

`AGENTS Configured` detects recognized markers, not semantic completeness, template
freshness, model use or runtime harness availability. Unmarked custom instructions,
pointers and native injected prime can all be useful. Codex marker counts are setup
blocks, not a runtime capability counter; there is no Claude-runtime counter.

Details separates current bounded root-file counts from the last observed request's
full/minimal/Codex, replaced and retained counts and request time. The root-file cap
is 64 KiB; unreadable/truncated files are incomplete observations. Retained blocks
may contain customization rather than conflict. Request reduction still requires
an exact complete body already present in attached prime; diagnostics does not edit
instructions or refresh those observations.

An initial capture may precede any cached prime or request instrumentation and show
**Not yet loaded**. That means missing evidence at capture time, not proof that no
eligible request occurred. Load time/version is preceding, non-atomic provenance;
age alone is not staleness. Typed writes invalidate context through existing paths;
shell/external writes are not observed. Successful prime does not certify complete
native memory delivery.

## Beads checks

| Row | Source and values | Meaning, response and verification |
| --- | --- | --- |
| bd CLI | Native `bd version`: version, below-minimum version (`needs ≥1.3.1`), `not found`, or not observed. | Unsupported/unavailable is unhealthy; failed version evidence can be neutral. Install/upgrade in an authorized workflow and start a new session; check `bd version`. The qualified baseline is 1.3.4, not a maximum. |
| Workspace | Config-only `bd context --json`: `Located`, `Not initialized`, `Probe failed`, `Withheld` or not observed. | Located identifies native-resolved context, not integrity. Failed/withheld/uninitialized is unhealthy; absent evidence neutral. Inspect context/location evidence; initialization is human-directed, never automatic repair. |
| Recorded bd version | Bounded `.local_version` under the resolved `beads_dir`. | `1.3.4 = CLI` is healthy; `1.3.1 ≠ CLI 1.3.4` is mismatch. `none`, unreadable, truncated, unsupported, unavailable or running-version unavailable stays neutral. Compare the recorded value and `bd version`; review native upgrade guidance if they differ. |
| Git hooks | Qualified native `bd hooks list --json`. | Installed/total counts include shims. Optional missing/unreadable/unresolved hooks and empty, failed or withheld evidence are neutral. Outdated or unrecognized installed hooks are mismatch. Review layout and customization before installation, then verify with `bd hooks list`. |
| Sync target | Config-only native context and strict-readonly native Dolt remote listing. | `Resolved · origin` means the native default name is listed in a supported direct Dolt context. `Local-only` means an empty listing in a confirmed embedded store. Both are healthy target observations. Missing, failed or ambiguous evidence leaves the target `Unknown` and neutral. |
| Remote history | Availability of a fresh Beads comparison. | `Not applicable` for established local-only operation and `Not checked` otherwise. Both are neutral. Exact remote selectors explain the unavailable probe. |

### Version witnesses

The witness read is limited to 256 bytes and accepts a trimmed three-component
version. It records equality/difference only. Neither result identifies schema,
reconciliation, completed maintenance, pending migrations, hook freshness or which
operation last used the CLI. A missing witness does not diagnose a new store.
Read the [native upgrade guide](https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/docs/getting-started/upgrading.md)
for native backup and release review responsibilities; diagnostics prescribes no
migration chain and never reinstates admission holds from witnesses.

### Hook reports and shims

Native listing uses its configured hook directory/common Git directory. A false
installed flag can mean missing files, unreadability or unresolved hook location.
An installed entry without a reported version is **unrecognized**, not proven
foreign. Installed counts include shims, so the shim suffix is a subset, not extra
hooks. Shims are healthy observed installations, not certification of wrapper
policy freshness; diagnostics does not compare shim versions against the CLI.
Exact bounded per-hook entries are available in details.

For outdated or unrecognized installations, review hook identity, local
customization and the intended default, `--beads` or `--shared` layout before any
refresh. `bd hooks install` writes hook files and may change `core.hooksPath`.
Verify with `bd hooks list`. Diagnostics lists installations without running hooks.

### Sync target and remote history

An empty listing in server mode is inconclusive. So are non-origin-only listings,
failed or incomplete listings and missing, conflicting or unsupported native
context. A labelled embedded context with a server endpoint is conflicting
evidence. Known proxied-server mode lacks strict-readonly listing support on the
current pins, so diagnostics reports the context limitation without opening that
store. A configured remote hint is shown as presence only. URLs and credentials
are discarded before capture. A registered `origin` establishes the target name
only. Reachability and synchronization remain unmeasured.

Local-only describes the current embedded store. Native push may offer Git-origin
adoption with consent. The history comparison is unperformed on Beads 1.3.1 and
1.3.4. No qualified native probe establishes that a comparison uses the remote
branch fetched during that invocation. Diagnostics leaves cached counts out of
the report. Source-Git freshness remains unchecked in all views.

## Collection and native responsibility

Collected views use native `version`, config-only `context --json`, qualified
`hooks list --json`, `bd --readonly dolt remote list --json --sandbox` in supported
workspaces, cached integration state and bounded local files. Diagnostic child
processes retain scoped metrics/event/OTel suppression. The strict-readonly
listing can open the store and skips native auto-start and maintenance, including
automatic export. Disposable checks observed incidental locks, an empty metrics
marker and journal timestamp changes while sampled store, version and configuration
contents held steady. Server mode may connect to the configured database. No
selector contacts the sync remote or fetches history. Help skips collection,
including its file reads and registry lookups.

Every view still submits an ordinary prompt. Its later normal eligible lifecycle
can load full native prime and persistent memories and may open/migrate a store
under native rules. The help guarantee concerns diagnostic collection, not the
whole subsequent model request. The native CLI owns store routing and consistency;
the plugin does not emulate or repair those internals.

SQL/schema health, historical maintenance completion, complete memory delivery and
unique build identity remain unmeasured. Details contains bounded observations
and finding explanations. Prime, memories, instruction bodies and raw configuration
stay outside the captured diagnostic evidence.

For intended behavior see [Read-only native diagnostics](../openspec/specs/workflow-access/spec.md#requirement-read-only-native-diagnostics)
and the [accepted diagnostics change](../openspec/changes/archive/2026-11-15-add-integrated-beads-diagnostics/specs/workflow-access/spec.md).
For native evidence boundaries see the [Beads artifact policy](beads-artifact-policy.md).
