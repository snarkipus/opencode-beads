# upstream-review Specification

## Purpose
Track relevant upstream integration changes without conflating development-source drift with tagged CLI compatibility or automatically adopting new content.

## Requirements

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

The workflow SHALL report completed main comparisons as successful informational evidence, not compatibility failures or product/release gates. It SHALL distinguish unavailable comparisons from no change and isolate collector failures from product/release gates. Tagged CLI compatibility SHALL remain separate. It SHALL NOT create GitHub issues, request issue-write permission or require adoption; Beads owns later selected work.

#### Scenario: Repeated detection

- **WHEN** the same candidate remains unreviewed across scheduled checks
- **THEN** each completed comparison succeeds and reports the same informational baseline/candidate scope and review links without repeated warning/error annotations or duplicate external tracking records

#### Scenario: Default branch advances ahead of a tagged release

- **WHEN** ordinary work changes selected paths on main while the supported tagged CLI release is unchanged
- **THEN** the source comparison succeeds and labels the changes development-source information, not released behavior or proven incompatibility
- **AND** it does not fail product checks, block release, require immediate review/adoption or change the supported CLI version
- **AND** a reviewed change needing an unreleased CLI feature may be deferred until verified inclusion in a supported tagged release

### Requirement: Explicit baseline disposition

The reviewed baseline SHALL advance only following an explicit human disposition, which may accept a local adaptation, accept no local change, or defer adoption. Drift detection SHALL NOT automatically copy upstream content, modify runtime behavior, bump package versions or publish releases.

#### Scenario: No adaptation required

- **WHEN** a maintainer explicitly reviews changed upstream content and determines the local implementation needs no change
- **THEN** the review records that rationale and may explicitly advance the reviewed source baseline without a product change

#### Scenario: Detection alone grants no adoption authority

- **WHEN** a scheduled comparison detects changed upstream sources
- **THEN** packaged content, runtime behavior and the reviewed baseline remain unchanged until their respective authorized actions occur
