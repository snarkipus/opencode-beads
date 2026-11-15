# workflow-access delta

## MODIFIED Requirements

### Requirement: Read-only native diagnostics

The package SHALL expose effective discovery, compatibility, ownership conflicts and context/persistence status through `oc-beads:diagnostics`. Diagnostic collection SHALL NOT open a store, change configuration or expose credentials. Diagnostics SHALL distinguish unavailable, failed, withheld and uncertain outcomes. Explicit collection SHALL combine plugin-integration and local native-Beads observations without repairs, network checks or background scans.

#### Scenario: Discovery collision

- **WHEN** a user customization prevents an owned entry from taking effect
- **THEN** diagnostics reports effective names/descriptions and detectable overrides while preserving native user-config precedence
- **AND** a description mismatch may identify an override but SHALL NOT be presented as proof of ownership; public owner identity and identical-description overrides remain unobservable, with explanations retained in explicit details and documentation
- **AND** command registration status reflects actual registration and lookup outcomes rather than an obsolete blanket hold

#### Scenario: Integration health and issue overview are requested

- **WHEN** a user invokes diagnostics or stats
- **THEN** diagnostics collection uses only version, config-only context and qualified native hook-list probes, cached integration state and bounded local file observations without opening a store, while stats remains an issue-overview workflow using `bd status` (alias `bd stats`)
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
- **THEN** its native command allowlist is `bd version`, `bd context --json` and `bd hooks list --json`, using bounded execution and preserving cancellation and location restrictions
- **AND** native metrics/export effects are suppressed for those child processes without changing user configuration; unqualified or failed observations are labeled unavailable or failed without substituting store-opening or network probes
- **AND** collection never invokes prime, doctor, where, upgrade, migrate, SQL, initialization, hook installation or synchronization; ordinary full-prime lifecycle behavior remains separate and unchanged
- **AND** the submitted diagnostics prompt follows the ordinary context lifecycle, which may load native full prime and open or migrate a store under native rules; diagnostics neither suppresses that load nor describes the whole request as store-free

#### Scenario: A collector is incomplete

- **WHEN** a probe fails, returns an unsupported shape, or a bounded local file observation is unreadable or truncated
- **THEN** normal output identifies the producer through a precise row label and literal unavailable/partial value; explicit details identifies its scope and limitation, without treating failure as absence or fabricating a measured success
- **AND** independent observations remain useful, secrets and raw configuration are omitted, and no diagnostic result changes runtime admission or repairs the underlying condition

## ADDED Requirements

### Requirement: Actionable observational health report

Diagnostics SHALL render fixed compact Markdown Plugin / Beads tables and labeled header metadata with Check / Status / Value columns. Assessed checks SHALL roll up to healthy ✅, mismatch ⚠️ or unhealthy ❌. Neutral incomplete fields SHALL remain visible without heading counts. Normal output SHALL omit full evidence and routine provisos; explicit details SHALL retain bounded evidence and explanations. Conditional actions SHALL state concise effects and verification.

#### Scenario: Findings need different responses

- **WHEN** the same report contains a real integration incompatibility, native maintenance advice and unknown historical completion
- **THEN** normal output distinguishes known integration failures as unhealthy, observed setup differences as mismatch and incomplete observations as neutral fields; explicit details retains producer, scope, observation time, meaning and limits
- **AND** normal output has no default provisos or limits line; conditional short actions state useful effects and a check, while detailed explanations are available on request
- **AND** section and overall severity use unhealthy > mismatch > healthy, neutral fields are visible but excluded from severity and heading counts, and no assessed checks remains neutral
- **AND** header metadata places DATE, VERSION and PATH in separate rendered paragraphs immediately after the title and before the summary, without repeating them at the bottom; DATE uses exact capture time, VERSION the executing manifest name/version, and PATH observed native cwd_repo_root or explicit not observed, without inference, path stripping, slash appending or implicit cwd fallback; native beads_dir remains in details and observed host/CLI versions stay in their rows; unmeasured schema/history/remote rows and default persistence uncertainty are omitted while actual unresolved writes remain concise
- **AND** success is limited to the observed check; neither a loaded version label nor an admitted version is evidence of unique build identity or fresh live qualification

#### Scenario: Native hook report is available

- **WHEN** native hook-list output reports missing, installed, shim or outdated entries
- **THEN** normal output groups native states in concise counts/values, labeling missing/unreadable/unresolved or unrecognized installed identity precisely; explicit details retains exact bounded entries and explains native ambiguity
- **AND** installed shims are healthy observed installations, without overdue-maintenance advice or CLI-version comparison; explicit details explains that this does not certify current wrapper policy
- **AND** install or refresh advice identifies hook/configuration writes and applicable layout review, recommends verification with native hook listing, and never runs installation

#### Scenario: CLI witness is inspected

- **WHEN** a local CLI version witness is readable alongside an observed CLI version
- **THEN** the Recorded bd version row shows the bounded recorded value; the value states equality or difference from the CLI without history inference; equality is healthy, difference is mismatch rather than unhealthy, and missing/unreadable/unsupported values remain neutral literal fields
- **AND** neither equality nor difference establishes SQL schema, reconciliation, hook freshness or maintenance completion, produces migration advice, or affects context or typed-operation admission

#### Scenario: Remote or historical maintenance freshness is requested

- **WHEN** diagnostics has only local evidence
- **THEN** explicit details states that source-Git and Beads tracker remote freshness are not checked; normal output omits unmeasured freshness/history rows, with no fetch, pull, synchronization or connectivity probes
- **AND** configured remote presence, when exposed by the supported context producer, is reported without its URL or credentials and without implying reachability or freshness
- **AND** release-note maintenance applicability and completion remain unmeasured; explicit details points to reviewable native release guidance rather than prescribing a sequential SQL migration chain


#### Scenario: Normal and requested details are captured once

- **WHEN** diagnostics is invoked normally, with exact trimmed case-insensitive `details`, or with exact trimmed case-insensitive `help`
- **THEN** exact trimmed case-insensitive `details` makes the existing callback capture explicit bounded evidence with the compact tables; exact trimmed case-insensitive `help` selects a static self-contained reference before the callback, without diagnostic collection, file reads or registry probes; a bare invocation or other free text selects normal tables without full evidence JSON
- **AND** exact free text, attachments/delivery, user overrides and the one-time v1 snapshot/replay path are preserved without recollection
- **AND** static help explains markers, each row/source/state, useful remedies/checks and limits, links the repository diagnostics reference and preserves the ordinary subsequent prompt/prime lifecycle
- **AND** author-facing relay instructions request faithful presentation but do not guarantee host-rendered or byte-exact model output

#### Scenario: Incomplete evidence and command clipping

- **WHEN** a command registry observation is incomplete or descriptions are clipped
- **THEN** the existing membership-truncation flag is exposed separately; complete membership may support measured present/expected command-name counts using the existing definition inventory, despite partial description comparison; description-cap evidence appears only in details, and incomplete membership remains explicit and neutral while retaining any comparable observed description changes
- **AND** unknown membership or description equality does not prove missing commands, ownership or no override, and incomplete fields do not become measured mismatches or defects
- **AND** a report with no assessed checks remains neutral rather than fabricating healthy

### Requirement: Managed guidance and skill visibility

Diagnostics SHALL distinguish bounded project-file observations, effective skill registration and request-time instruction observations. It SHALL identify managed block types, duplicates, retained/reduced blocks, shared-skill presence and detectable plugin-skill overrides without rewriting files or asserting semantic freshness, contradiction or actual model use from presence alone.

#### Scenario: Managed instructions accompany prime

- **WHEN** an observed request reduces complete managed bodies already present in attached prime or retains other marked bodies
- **THEN** normal output uses the exact AGENTS Configured label with bd block or duplicate bd blocks for recognized markers; no marker, missing file and unreadable/truncated observations remain neutral rather than broken or semantically complete, and explicit details alone retains bounded root-file/request counts and their observation times, preserving the exact-body reduction rule
- **AND** repeated full blocks are a mismatch needing review; Codex/minimal blocks are recognized configuration markers; retained bodies alone are informational. Raw marker counts and request instrumentation remain details-only, without runtime harness inference. Explicit details explains potential customization rather than asserting conflict or obsolescence
- **AND** no request observation means unobserved, not zero blocks; root-file counts are separate from actual request counts, and unmarked prose is not classified

#### Scenario: Shared or overriding skills are present

- **WHEN** the shared Beads skill is missing or unreadable, a named Beads skill is effectively registered alongside oc-beads, or a detectable oc-beads candidate collision occurs
- **THEN** diagnostics distinguishes file presence/readability, effective registry evidence and collision evidence without treating a shared-skill absence as plugin failure or presence as use/freshness
- **AND** user overrides and unrelated files are preserved; any optional native setup advice discloses its broader instruction/hook writes and is never executed by diagnostics
- **AND** the plugin does not recommend installing `bd setup opencode`; any optional removal of redundant legacy guidance requires review of local customization

### Requirement: Context observation provenance

Diagnostics SHALL report cached context status, available load time and the CLI version observed for that load, independently of current CLI/workspace observations. It SHALL distinguish missing evidence, withheld, failed, loading, empty and ready context and preserve existing invalidation behavior without refreshing context solely for diagnostics or claiming to observe external writes.

#### Scenario: Context observation is absent or old

- **WHEN** the diagnostic snapshot has no cache entry, lacks provenance, or precedes a later request
- **THEN** it reports missing or unobserved evidence at capture time without asserting that no eligible request occurred or that integration is persistently broken
- **AND** loading, withheld, empty and failed states retain their distinct meanings; an observed ready state does not certify complete native memory delivery

#### Scenario: Runtime or workspace changes after context load

- **WHEN** a current observed CLI version differs from the version associated with cached context or external state might have changed
- **THEN** diagnostics reports the version difference and available load time as freshness evidence with supported next-session or configured idle-refresh guidance
- **AND** age alone does not prove staleness, typed-write invalidation remains in effect, and unobserved shell or external writes remain a limitation in details/documentation
- **AND** instruction observations describe the last observed request rather than implying automatic synchronization with later file or hook edits
