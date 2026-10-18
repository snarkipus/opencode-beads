# Upstream review

## ADDED Requirements

### Requirement: Relevant upstream source comparison

The maintenance workflow SHALL compare selected upstream integration source paths between an explicitly human-reviewed marketplace-main commit baseline and the upstream default branch resolved to an immutable candidate commit. It SHALL detect additions, modifications, deletions and renames where identifiable, and report incomplete retrieval or comparison as an error rather than no change. Source comparison SHALL remain separate from CLI compatibility checks.

#### Scenario: Relevant source changes

- **WHEN** a candidate commit changes content or membership under the selected source paths
- **THEN** the workflow reports both immutable commit identities, changed paths and reviewable diff references
- **AND** it does not infer behavioral incompatibility from source changes alone

#### Scenario: Comparison cannot complete

- **WHEN** source retrieval or comparison is incomplete
- **THEN** the workflow exposes the failure and does not record a successful no-change result

### Requirement: Check-based review notification

The workflow SHALL reuse the existing scheduled contract/check pattern and fail a distinct check/job for unreviewed source drift, with immutable review links and a drift `::error::` diagnostic. Retrieval/comparison failure SHALL fail with a distinct retrieval-error diagnostic rather than report no change. It SHALL NOT create GitHub issues or request issue-write permission. Source review SHALL remain separate from stable CLI release checks; Beads owns any later execution work.

#### Scenario: Repeated detection

- **WHEN** the same candidate remains unreviewed across scheduled checks
- **THEN** each check fails while reporting the same baseline/candidate scope and review links without creating duplicate external tracking records

### Requirement: Explicit baseline disposition

The reviewed baseline SHALL advance only following an explicit human disposition, which may accept a local adaptation, accept no local change, or defer adoption. Drift detection SHALL NOT automatically copy upstream content, modify runtime behavior, bump package versions or publish releases.

#### Scenario: No adaptation required

- **WHEN** a maintainer explicitly reviews changed upstream content and determines the local implementation needs no change
- **THEN** the review records that rationale and may explicitly advance the reviewed source baseline without a product change

#### Scenario: Detection alone grants no adoption authority

- **WHEN** a scheduled comparison detects changed upstream sources
- **THEN** packaged content, runtime behavior and the reviewed baseline remain unchanged until their respective authorized actions occur
