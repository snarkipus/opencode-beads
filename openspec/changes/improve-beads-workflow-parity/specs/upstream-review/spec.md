# Upstream review

## ADDED Requirements

### Requirement: Relevant upstream source comparison

The maintenance workflow SHALL compare selected upstream integration source paths between an explicitly reviewed release/commit baseline and a resolved candidate stable release. It SHALL detect additions, modifications, deletions and renames where identifiable, and report incomplete retrieval or comparison as an error rather than no change. Source comparison SHALL remain separate from CLI compatibility checks.

#### Scenario: Relevant source changes

- **WHEN** a candidate release changes content or membership under the selected source paths
- **THEN** the workflow reports both immutable commit identities, changed paths and reviewable diff references
- **AND** it does not infer behavioral incompatibility from source changes alone

#### Scenario: Comparison cannot complete

- **WHEN** source retrieval or comparison is incomplete
- **THEN** the workflow exposes the failure and does not record a successful no-change result

### Requirement: Deduplicated review notification

The workflow SHALL create or update a deduplicated review issue for unreviewed relevant drift. Repeated scheduled checks SHALL NOT create duplicate issues for the same review scope and candidate. Issue-write authority SHALL be limited separately from source comparison.

#### Scenario: Repeated detection

- **WHEN** the same candidate remains unreviewed across scheduled checks
- **THEN** its existing review alert is reused rather than creating a new issue each run

### Requirement: Explicit baseline disposition

The reviewed baseline SHALL advance only following an explicit human disposition, which may accept a local adaptation, accept no local change, or defer adoption. Drift detection SHALL NOT automatically copy upstream content, modify runtime behavior, bump package versions or publish releases.

#### Scenario: No adaptation required

- **WHEN** a maintainer explicitly reviews changed upstream content and determines the local implementation needs no change
- **THEN** the review records that rationale and may explicitly advance the reviewed source baseline without a product change

#### Scenario: Detection alone grants no adoption authority

- **WHEN** a scheduled comparison detects changed upstream sources
- **THEN** packaged content, runtime behavior and the reviewed baseline remain unchanged until their respective authorized actions occur
