# Spec Delta

## MODIFIED Requirements

### Requirement: Read-only native diagnostics

The package SHALL expose integration and native Beads observations through `oc-beads:diagnostics`. Ordinary collection SHALL use local evidence and strict-readonly native store access without changing user configuration, contacting the sync remote or fetching. If qualified remote observation is enabled, diagnostics SHALL disclose its native effects. Diagnostics SHALL distinguish unavailable, failed, withheld and uncertain outcomes without credentials, repairs or background scans.

#### Scenario: Discovery collision

- **WHEN** a user customization prevents an owned entry from taking effect
- **THEN** diagnostics reports effective names/descriptions and detectable overrides while preserving native user-config precedence
- **AND** a description mismatch may identify an override but SHALL NOT be presented as proof of ownership; public owner identity and identical-description overrides remain unobservable, with explanations retained in explicit details and documentation
- **AND** command registration status reflects actual registration and lookup outcomes rather than an obsolete blanket hold

#### Scenario: Integration health and issue overview are requested

- **WHEN** a user invokes diagnostics or stats
- **THEN** ordinary diagnostics collection uses version, config-only context, qualified native hook listing, strict-readonly native remote listing, cached integration state and bounded local file observations, while stats remains an issue-overview workflow using `bd status` (alias `bd stats`)
- **AND** version/workspace/protocol observations do not certify SQL health or complete native memory delivery
- **AND** diagnostic safety and observed qualification limits are preserved; the report identifies the loaded plugin package name/version from its own manifest alongside the observed host version, without inferring a unique build fingerprint

#### Scenario: Compact diagnostic history

- **WHEN** diagnostics is invoked with optional free text and native attachments/delivery
- **THEN** history shows the compact command and exact free text, while the dynamic report is captured once in a durable invocation snapshot and expanded only through primary/compaction hooks
- **AND** replay preserves the captured observation without regenerating diagnostics, duplicating instructions, mutating persisted input or expanding auxiliary requests; older v1 snapshots are replayed as captured without boundary backfill, and generic workflow payloads remain unchanged
- **AND** the captured report is fully populated and rendered deterministically by plugin code; new diagnostic instructions delimit it with literal BEGIN_DIAGNOSTIC_REPORT / END_DIAGNOSTIC_REPORT lines and actual newline separators before the preserved invocation, requesting only the report with values/labels/order/Markdown intact and no markers, invocation or added commentary; subsequent model relay is guidance, not guaranteed verbatim presentation

#### Scenario: Diagnostics is overridden or unloaded

- **WHEN** a user override is added or removed, or package diagnostics is unloaded while pending
- **THEN** native override precedence, package restoration after override removal and disposal are preserved, user-owned old status remains untouched, and unloaded work submits no late prompt

#### Scenario: Qualified local probe boundary

- **WHEN** diagnostics collects native evidence in a confirmed session location
- **THEN** ordinary collection adds only `bd --readonly dolt remote list --json --sandbox` to `bd version`, `bd context --json` and `bd hooks list --json`, using bounded execution and preserving existing plugin-disposal cancellation and location restrictions
- **AND** the existing diagnostic environment remains scoped to child processes and suppresses native metrics/export effects without changing user configuration; strict readonly preserves ordinary no-mutation intent, disables native auto-start/maintenance and does not fetch; a server-backed listing uses its native database connection, not a sync-remote reachability check
- **AND** collection never substitutes prime, doctor, where, explicit upgrade/migrate, SQL, initialization, hook installation, hook execution or synchronization; ordinary full-prime lifecycle behaviour remains separate and unchanged
- **AND** the submitted diagnostics prompt retains ordinary full prime and memories, which may open or migrate a store under native rules; neither strict-readonly collection nor help changes that later lifecycle

#### Scenario: A collector is incomplete

- **WHEN** a probe fails, returns an unsupported shape, or a bounded local file observation is unreadable or truncated
- **THEN** normal output identifies the producer through a precise row label and literal unavailable/partial value; explicit details identifies its scope and limitation, without treating failure as absence or fabricating a measured success
- **AND** independent observations remain useful, secrets and raw configuration are omitted, and no diagnostic result changes runtime admission or repairs the underlying condition

#### Scenario: Explicit remote observation is requested

- **WHEN** exact trimmed case-insensitive `remote` or `details remote` is invoked in a confirmed workspace with an established native target and a qualified native exact-branch comparison for that context
- **THEN** diagnostics performs one bounded native observation that fetches the selected peer's corresponding current branch and compares the fetched tip, through the existing callback/runner; the fetch may write local objects and refs
- **AND** command purpose and static help/docs disclose remote contact, local fetched objects/refs/cache, native version-bump maintenance/migration and applicable native CLI-remote preparation; diagnostics does not invoke synchronization, merge, push or standalone migration/repair commands
- **AND** invocation requests the bounded operation under applicable authority and host semantics; no new typed-tool permission machinery, human-origin guarantee, per-invocation abort promise, retry or polling is introduced
- **AND** existing timeout and plugin-disposal cancellation remain effective and unloaded work submits no late report


### Requirement: Actionable observational health report

Diagnostics SHALL render fixed compact Markdown Plugin / Beads tables and labeled header metadata with Check / Status / Value columns. Assessed checks SHALL roll up to healthy ✅, mismatch ⚠️ or unhealthy ❌. Neutral incomplete fields SHALL remain visible without heading counts. Normal output SHALL omit full evidence and routine provisos; explicit details SHALL retain bounded evidence and explanations. Conditional actions SHALL state concise effects and verification.

#### Scenario: Findings need different responses

- **WHEN** the same report contains a real integration incompatibility, native maintenance advice and unknown historical completion
- **THEN** normal output distinguishes known integration failures as unhealthy, observed setup differences as mismatch and incomplete observations as neutral fields; explicit details retains producer, scope, observation time, meaning and limits
- **AND** normal output has no default provisos or limits line; conditional short actions state useful effects and a check, while detailed explanations are available on request
- **AND** section and overall severity use unhealthy > mismatch > healthy, neutral fields are visible but excluded from severity and heading counts, and no assessed checks remains neutral
- **AND** header metadata places DATE, VERSION and PATH in separate rendered paragraphs immediately after the title and before the summary, without repeating them at the bottom; DATE uses exact capture time, VERSION the executing manifest name/version, and PATH observed native cwd_repo_root or explicit not observed, without inference, path stripping, slash appending or implicit cwd fallback; native beads_dir remains in details and observed host/CLI versions stay in their rows; unmeasured schema/maintenance rows and default persistence uncertainty are omitted while actual unresolved writes remain concise; Git hooks, Sync target and Remote history are the three remote-related rows, including neutral target/history observations
- **AND** success is limited to the observed check; neither a loaded version label nor an admitted version is evidence of unique build identity or fresh live qualification

#### Scenario: Native hook report is available

- **WHEN** native hook-list output reports missing, installed, shim or outdated entries
- **THEN** normal output extends the single Git hooks row with concise installation counts and independently established safe warnings; explicit details retains bounded native entries and their observation scope
- **AND** installed shims are healthy observed installations, without CLI-version comparison or inferred execution/configuration health; static installation never proves successful execution or current wrapper policy
- **AND** absent optional hooks and ambiguous native false-installed entries are neutral and receive no mismatch or installation demand, including an established local-only setup; a native false installed flag remains a missing/unreadable/unresolved observation, not proof of a broken file
- **AND** positively observed outdated or unrecognized installed entries, or a safely observed runtime/configuration warning, are mismatch; a failed/unavailable listing is neutral and does not establish absence
- **AND** concise review/refresh advice for observed installation problems identifies hook/configuration writes and applicable layout review, recommends verification with native hook listing, and never runs installation

#### Scenario: Hook warning and native target disagree

- **WHEN** an existing allowlisted native observation actually reports a no-configured-remote hook warning while independent native evidence resolves the target
- **THEN** Git hooks retains the warning and Sync target remains Resolved with separate provenance; neither finding overwrites the other
- **AND** diagnostics never adds a warning collector or executes a hook to obtain this evidence; without an allowlisted observation it reports no warning, because missing configuration and source-code knowledge are not observed warnings

#### Scenario: CLI witness is inspected

- **WHEN** a local CLI version witness is readable alongside an observed CLI version
- **THEN** the Recorded bd version row shows the bounded recorded value; the value states equality or difference from the CLI without history inference; equality is healthy, difference is mismatch rather than unhealthy, and missing/unreadable/unsupported values remain neutral literal fields
- **AND** neither equality nor difference establishes SQL schema, reconciliation, hook freshness or maintenance completion, produces migration advice, or affects context or typed-operation admission

#### Scenario: Remote or historical maintenance freshness is requested

- **WHEN** diagnostics has only local evidence
- **THEN** normal output shows Sync target from the available native evidence and Remote history as Not checked, or Not applicable only for established local-only operation; details identifies missing evidence and states source-Git freshness is not checked
- **AND** configured remote presence is a bounded hint without URL or credentials, never proof of effective resolution, connectivity or freshness; absent config fields and absent hooks establish neither local-only operation nor failure
- **AND** ordinary collection uses strict-readonly native remote listing without sync-remote contact, fetch, pull, synchronization or a custom resolver
- **AND** release-note maintenance applicability and completion remain unmeasured; details points to reviewable native release guidance rather than prescribing a sequential SQL migration chain

#### Scenario: Normal and requested details are captured once

- **WHEN** diagnostics is invoked normally or with an exact trimmed case-insensitive `details`, `help`, `remote` or `details remote` selector
- **THEN** exact `details` captures bounded evidence with the compact tables; exact `help` selects a static self-contained reference before collection, file reads or registry probes; exact `remote` and `details remote` request a comparison with normal tables or bounded evidence respectively, but report Not checked when no qualified producer is available and Not applicable for established local-only; bare or other text selects local normal tables without full evidence JSON
- **AND** `details remote` evidence distinguishes a successful fresh Beads history comparison, an attempted failure and an unperformed comparison; it does not claim a completed comparison was not checked or imply that source-Git freshness was checked
- **AND** exact free text, attachments/delivery, user overrides and the one-time v1 snapshot/replay path are preserved without recollection
- **AND** static help explains markers, each row/source/state, useful remedies/checks and limits, links the repository diagnostics reference and preserves the ordinary subsequent prompt/prime lifecycle
- **AND** author-facing relay instructions request faithful presentation but do not guarantee host-rendered or byte-exact model output

#### Scenario: Incomplete evidence and command clipping

- **WHEN** a command registry observation is incomplete or descriptions are clipped
- **THEN** the existing membership-truncation flag is exposed separately; complete membership may support measured present/expected command-name counts using the existing definition inventory, despite partial description comparison; description-cap evidence appears only in details, and incomplete membership remains explicit and neutral while retaining any comparable observed description changes
- **AND** unknown membership or description equality does not prove missing commands, ownership or no override, and incomplete fields do not become measured mismatches or defects
- **AND** a report with no assessed checks remains neutral rather than fabricating healthy

#### Scenario: Remote findings contribute to the summary

- **WHEN** the report contains target/history observations alongside plugin and local Beads observations
- **THEN** Local-only and Resolved assess only the target check; In sync assesses only a fresh successful history comparison; Unknown, Not checked and Not applicable are neutral and excluded from severity
- **AND** Unresolved, Local ahead, Remote ahead, Diverged and an actually attempted Check failed contribute mismatch, not an automatic unhealthy local-store or Plugin verdict
- **AND** the existing worst-assessed-check roll-up is retained, with a concise summary saying Remote history not checked whenever applicable so a healthy heading cannot imply synchronization; no assessed checks remains neutral
- **AND** Local ahead is described as unpublished work, with short review/sync-under-separate-authority actions and no corruption claim, automatic sync, retry, repair or migration advice


## ADDED Requirements

### Requirement: Evidence-based native sync target

Diagnostics SHALL derive Local-only, Resolved or Unknown from native context and strict-readonly remote-list evidence for the selected native default-name seam. Unresolved is reserved for positive evidence from an allowlisted native producer that an expected target failed resolution; the current listing supplies no such evidence. Target status SHALL remain independent of hooks, connectivity and history. The plugin SHALL NOT reconstruct native routing or guess Git origin.

#### Scenario: Native origin is listed

- **WHEN** complete successful native listing contains `origin` in an unambiguous supported direct Dolt context
- **THEN** Sync target is Resolved and identifies only the native remote name; a qualified explicit history observation, if available, selects that same `origin`
- **AND** resolution proves neither connectivity nor synchronization; missing hooks or YAML configuration do not negate it

#### Scenario: Native listing establishes local-only operation

- **WHEN** a complete successful native listing is empty in a confirmed embedded Dolt context
- **THEN** Sync target is Local-only and Remote history is Not applicable
- **AND** details explains that native push may offer Git-origin adoption with consent; diagnostics never adopts a remote or promises permanent local-only operation

#### Scenario: Target evidence is ambiguous or fails

- **WHEN** listing is empty in server mode, contains only non-origin remotes, fails or is incomplete, or native context is missing, conflicting, unrecognized, non-Dolt or proxied-server
- **THEN** Sync target is Unknown with the actual evidence limitation, rather than local-only or an invented failure
- **AND** a native embedded label accompanied by server endpoint evidence is conflicting evidence; the plugin retains the smallest native mode projection without reproducing config/environment precedence
- **AND** Unresolved requires positive native evidence of an expected target's failed resolution; generic listing errors or missing configuration are insufficient, and no speculative error classifier is required
- **AND** a configured but unreachable target is never recast as Local-only; target/history failures never change runtime admission

### Requirement: Fresh native remote history evidence

Only exact explicit remote selectors SHALL trigger a qualified native exact-branch comparison. Comparative states SHALL require evidence that the current invocation fetched the selected peer's corresponding native branch and compared that fetched tip. Generic fetch success, reachability, cached counts and transport hashes are insufficient.

#### Scenario: No fresh comparison is performed

- **WHEN** the target is Local-only, no remote selector was requested, the target/context is unknown, unresolved or unsupported, or no qualified native exact-branch operation is available before spawn
- **THEN** Remote history is Not applicable for Local-only and otherwise Not checked with an unperformed/unsupported/withheld reason in details
- **AND** without a qualified native operation there is no fetch; Beads 1.3.1 and 1.3.4 have no qualified history probe, and exact remote selectors explain this limitation
- **AND** ordinary/details remains local without fetch; known proxied-server mode is unsupported rather than an attempted history failure
- **AND** `remote please`, reversed tokens or other non-exact selector text does not trigger a remote operation

#### Scenario: Fresh native comparison succeeds

- **WHEN** the requested native observation establishes that the exact branch existed at the selected peer during this fetch and returns valid nonnegative integer ahead/behind counts against the fetched tip
- **THEN** zero/zero means In sync, positive/zero Local ahead, zero/positive Remote ahead, and positive/positive Diverged
- **AND** details records producer, time, scope and native effects; it does not invent a branch-name field absent from the producer or compare Git transport hashes with Dolt commits
- **AND** Local ahead describes unpublished work, not corruption; the result is captured once and replayed without rerunning any probe

#### Scenario: An attempted history observation fails

- **WHEN** a started qualified command times out, exits unsuccessfully, reports a missing branch or failed reachability, or lacks a valid comparable selected-peer result
- **THEN** Remote history is Check failed with a concise bounded sanitized actual reason if report submission remains available; negative/missing counts and malformed output are failed comparison evidence
- **AND** cached counts are discarded whenever branch freshness is not established, even when native process exit or reachability indicates success; URLs and credentials never enter the captured report or details
- **AND** unsupported/withheld operations skipped before spawn remain Not checked, disposal prevents late prompt submission, and no failure starts retries, synchronization or repair

#### Scenario: A native exact-branch producer is considered for enablement

- **WHEN** a released supported native operation is proposed for fresh comparison
- **THEN** enabling it requires separate approval and disposable qualification proving the comparison binds the same invocation, peer, branch and fetched tip
- **AND** qualification covers unchanged and changed remote tips, a missing branch with a cached tracking ref including an empty destination, and an unreachable destination; a missing or unverified branch never yields comparative counts
