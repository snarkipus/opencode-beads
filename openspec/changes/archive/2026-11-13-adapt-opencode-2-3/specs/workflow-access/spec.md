# Spec Delta

## MODIFIED Requirements

### Requirement: Explicit native availability and fallback

The integration SHALL target exact OpenCode 2.3.0 qualification and `>=2.3.0 <2.4` admission. It SHALL distinguish admission from measured compatibility, preserve existing version pins and refuse unsupported host registration with diagnostics. It SHALL NOT retain a 2.1 compatibility layer or silently migrate installations. Publication remains separately authorized.

#### Scenario: A different host version is considered

- **WHEN** a future admitted patch or a version outside the declared range is considered
- **THEN** an admitted patch is not described as tested without measured evidence, and an out-of-range host remains unsupported pending explicit contract review

#### Scenario: Host cannot satisfy N1

- **WHEN** the host lacks the selected permission or lifecycle contract
- **THEN** the integration reports the unsupported path and does not enable privileged fallback execution or silently weaken guarantees

#### Scenario: Experimental capability is considered

- **WHEN** a released experimental mechanism could improve task flow or recovery
- **THEN** the packet records its semantics, qualification, maintenance and fallback consequences before adoption
- **AND** instability alone is neither approval nor automatic exclusion

#### Scenario: Plugin reloads or a session changes location

- **WHEN** registrations are unloaded or a session moves, forks or is deleted
- **THEN** the selected integration disposes or re-resolves affected state and observers without leaking task context across sessions or locations
- **AND** it preserves user overrides and does not claim cleanup guarantees a final durable write

### Requirement: Documented snapshot-recovery deficiency

The package SHALL document unavailable historical workflow-snapshot recovery as an unresolved plugin deficiency with an upstream API blocker. User-facing documentation SHALL explain its trigger, impact and limits and link the upstream request. Accepting the limitation for a release SHALL NOT be described as resolving the deficiency.

#### Scenario: User evaluates the documented limitation

- **WHEN** a user reads the README's applicable compatibility/limitations section
- **THEN** it describes native compaction followed by an incompatible model switch, missing historical workflow instructions or captured reports, and unaffected Beads tracker data
- **AND** it links OpenCode #57424 and identifies the unresolved local follow-up without requiring Beads access to understand the limitation
- **AND** current 2.3 integration behavior is distinguished from the published beta's narrower host support
