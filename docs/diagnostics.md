# Beads diagnostics reference

`/oc-beads:diagnostics` reports observed integration conditions in compact Plugin
and Beads tables. It captures a result once; primary and compaction replay use that
saved result. The timestamp describes capture time, not current live state on replay.

| Invocation | Result |
| --- | --- |
| `/oc-beads:diagnostics` or other free text | Collect once and show normal tables, labeled header metadata and conditional actions. |
| `/oc-beads:diagnostics details` | Collect once and append bounded evidence, provenance and explanations. |
| `/oc-beads:diagnostics help` | Capture a self-contained static reference without invoking diagnostic collection. |

Selectors are exact after trimming and case folding: ` HeLp ` selects help;
`help me` and `explain details please` select normal output. Literal user text,
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
| Host | Observed OpenCode application version: supported `2.3.x`, unsupported or not observed. | Unsupported is unhealthy; unknown is neutral. Check the operator's OpenCode version and the [supported interface reference](opencode-sdk-contract.md). Installation/upgrades are operator-owned. |
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
| Git hooks | Qualified native `bd hooks list --json`, not independent filesystem verification. | Installed/total counts, optional overlapping `(shims)` or `(N shims)`, and missing/unreadable/unresolved, outdated or unrecognized counts. Those differences are mismatch; empty/failed/withheld evidence is neutral. Review intended layout/customization before installation, then verify with `bd hooks list`. |

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

For missing/outdated hooks, review local customization and the intended default,
`--beads` or `--shared` layout before `bd hooks install`. Installation writes hook
files and may change `core.hooksPath`; diagnostics never executes it. Verify with
`bd hooks list`. An unrecognized identity warrants inspection rather than automatic
replacement. A collection failure warrants checking the producer, not claiming all
hooks absent.

## Collection and native responsibility

Normal/details diagnostic collection uses only native `version`, config-only
`context --json`, qualified `hooks list --json`, cached integration state and bounded
local files. Diagnostic child processes retain scoped metrics/event/OTel suppression.
It does not invoke prime, doctor, where, SQL, init, upgrades, hook installation,
repairs, synchronization or network freshness checks. Help skips the diagnostic
callback entirely, including its file reads and registry lookups.

Every view still submits an ordinary prompt. Its later normal eligible lifecycle
can load full native prime and persistent memories and may open/migrate a store
under native rules. The help guarantee concerns diagnostic collection, not the
whole subsequent model request. The native CLI owns store routing and consistency;
the plugin does not emulate or repair those internals.

SQL/schema health, historical maintenance completion, remote freshness, complete
memory delivery and unique build identity are not measured. Optional remote presence
is reduced to configured/not configured/not reported without URLs or credentials;
it does not establish connectivity. Details contains bounded observations and
finding explanations, not raw prime, memories, instruction bodies or configuration.

For intended behavior see [Read-only native diagnostics](../openspec/specs/workflow-access/spec.md#requirement-read-only-native-diagnostics)
and the [accepted diagnostics change](../openspec/changes/archive/2026-11-15-add-integrated-beads-diagnostics/specs/workflow-access/spec.md).
For native evidence boundaries see the [Beads artifact policy](beads-artifact-policy.md).
