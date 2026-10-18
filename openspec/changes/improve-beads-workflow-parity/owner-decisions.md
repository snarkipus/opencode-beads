# Owner decisions — partial gate disposition

Recorded 2026-10-18 UTC from Matt's direct response to the Opus review on published candidate e74b507 (review report published at acf5a68). This is partial planning acceptance, not implementation or release authority. Proposal/spec/design/task/inventory reconciliation remains pending; do not infer that all earlier alternatives are selected.

## Accepted direction

1. **Parity reference: marketplace main.** Compare against the complete Claude Beads marketplace integration on upstream's default branch, resolved to immutable commits for each review/evaluation. A moving branch name alone is not evidence identity. Retain the release-pinned inventory as historical evidence, not the sole current parity target. Characterize the installed-vs-release append-notes change identified by Opus.
2. **Host and architecture: OpenCode 2.0.32 or later with N1.** Select the native continuity adapter direction, not N0-first. This does not declare arbitrary future major releases compatible or authorize a dependency/runtime upgrade. Qualify the chosen minimum and permissions/lifecycle contract; preserve fallback reporting if a concrete guarantee cannot be met.
3. **Release/behavior direction: beta or next, canonical non-mandatory-atomic execution.** This planned plugin version is an opt-in prerelease direction; exact version and distribution tag remain engineering/release decisions requiring normal publication authority. Do not replace stable defaults for existing consumers silently. Atomic claim and per-bead validation remain; invocation scope is not universally one bead. Follow explicit assignment/goal authorization and preserve stop/approval constraints. Optional one-bead orchestration mode may remain, not the mandatory base. No package version/tag has changed.
4. **Upstream alert sink: existing check pattern.** Reuse the scheduled contract/check mechanism rather than introduce GitHub issues as a second tracker. Compare selected source paths against marketplace main, resolve commits, make drift visible in check output with review links, and distinguish retrieval failure from drift/no drift. Baseline advancement remains human-reviewed. Do not add issue-write permissions. Beads owns any execution work selected after review. Update prior issue-alert language consistently.
5. **Primary objective: overall harness-native DX.** Better note and memory behavior are examples, not the entire problem. Aim for a coherent, tightly integrated OpenCode experience across discovery, command/task flow, contextual guidance, recovery, persistence, delegation, approvals, diagnostics and lifecycle. Claude is the behavioral baseline, not the implementation blueprint. Exploit supported native and selectively adopted experimental capabilities where they improve observed DX. The user suspects Claude-harness optimization contributes to the difference; causality remains unproven.

## Decisions still pending / requested explanation

- **Skill/command ownership and naming:** Matt deferred or requested explanation. No approval to override upstream's shared `beads` skill. Proposed engineering recommendation: package-owned distinctly named rich skill (e.g. `beads-workflow`) and `beads:*` commands, loaded through native registrations, with upstream shared skill left intact and coherent routing to avoid competing guidance. Final names, collision policy and default discovery need an explained disposition.
- **Corpus groups:** Matt deferred or requested explanation. Explain which upstream workflows/resources are core daily experience, advanced optional guidance, or administrative/destructive operations, and recommend clear bundles. Do not silently turn prior defer recommendations into exclusions. Full source-corpus drift coverage can exceed enabled runtime defaults. No command/resource selection is settled by merely choosing N1.

## Review corrections to reconcile

The Opus review remains REVISE until the meaningful installed-vs-release source differences are characterized and marketplace-main monitoring replaces stable-only review assumptions. Fold in concrete typed-tool discovery/agent/permission/save/external-access checks, simplify speculative prepared-write compaction state, and resolve GitHub notification language to the existing-check decision. Cosmetic fixes should ride the same bounded planning reconciliation. No new infrastructure or wholesale analysis restart is needed.

## Authority

The planning bead is `opencode-beads-d9n`. Keep it open. Reconcile the artifacts and publish for review under planning-branch authority; implementation, prerelease publication, merging, runtime upgrades and deployment remain unapproved. Current local AGENTS.md/.codex integration setup is separate from the product candidate.
