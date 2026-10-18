# Installed Claude reference integration

## Evidence boundary

The actual `beads@beads-marketplace` plugin is installed and enabled at **local project scope** for the Hermes `/opt/data/opencode-beads` workspace. This records installation/component discovery, not a live model-behavior or functional-parity result. It does not require collaborators to install a Claude plugin to use the OpenCode package.

## Installed identity

- Claude Code: `2.1.292`.
- Plugin-reported version: `1.3.0` (distinct from the Beads CLI/release version).
- Marketplace: `gastownhall/beads`, name `beads-marketplace`.
- Installed source commit recorded by Claude: `4a67d0d0288c1b4ee23e17fc896f47616931ba2d`.
- Installation path in this runtime: `/opt/data/home/.claude/plugins/cache/beads-marketplace/beads/1.3.0`.
- Local activation: `.claude/settings.local.json`, `enabledPlugins["beads@beads-marketplace"] = true`.
- CLI `plugin list --json` reports `enabled: true`, `scope: local`, and the exact project path. Its separate `projectEnabled: false` field is retained as reported, not treated as a project-scope installation claim.

Source: [installed revision](https://github.com/gastownhall/beads/tree/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads). The analysis baseline remains [Beads v1.3.1 source](https://github.com/gastownhall/beads/tree/c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c/plugins/beads). Installation used the marketplace's current checkout, **not** a claim that the pinned release was installed. Behavioral comparisons must record and align the chosen revision, or disclose differences, before attributing outcomes.

## Observed component discovery

`claude plugin details beads@beads-marketplace` reports:

- **30 skills**: the rich `beads` entry plus all **29 command entries**, including `prime` and `template`.
- **One agent**: `task-agent`.
- **Two hook types**: `SessionStart` and `PreCompact`.
- **Zero MCP servers** and zero LSP servers.

The installed resource directory contains **15 Markdown resources**. Inspection confirmed that the rich skill and task-agent body byte-match the examined release source. Other files differ between the installed checkout and the pinned evidence tree, so component counts and matching examples are not whole-corpus equivalence evidence. The static 73-file release inventory remains unchanged and authoritative for its explicitly pinned scope.

Claude's discovery of `prime` and `template` establishes component recognition in this installed harness. It does not prove successful invocation, argument handling, CLI/MCP resolution, or applicability to the pinned release. The original OpenCode loader's frontmatter limitation is not a Claude discovery limitation.

## Hook ownership and Codex setup

`bd setup claude` initially installed a standalone project `SessionStart` hook. After marketplace installation, only that newly generated standalone settings file was removed to avoid duplicate prime execution; marketplace hooks now own Claude startup/compaction wiring. Existing user instructions were preserved. No marketplace payload was modified.

`bd setup codex` installed the shared `.agents/skills/beads` entry, `.codex/hooks.json`, `.codex/config.toml` enabling hooks, and an `AGENTS.md` section. Setup verification passed. Generated Codex instructions explicitly call for persistent project memory through `bd remember`. This is potential behavior-bearing input to compare, not evidence of actual model compliance. Codex CLI was `0.162.1` when inspected.

Fresh worker sessions are required to evaluate effective loaded guidance. Do not interpret prior Astra runs as having exercised these newly installed integrations. Shared/generated instruction files and local activation are workspace setup, not implementation of the proposed OpenCode package.

## Packaging conclusion

The intended OpenCode product delivers its **complete owner-selected integration through its npm package**: registered command workflows, skill/resource assets, agent policies, lifecycle wiring and selected continuity tools. A separate manual skill/resource installation is not an acceptable hidden prerequisite for advertised capability. The installed `bd` executable and upstream-owned project initialization/data remain external. This refines the proposed packaging goal; individual corpus/default/version/experimental dispositions remain pending.

Qualification must inspect the installed artifact and effective registrations, resource reachability, overrides, teardown and a fresh session's actual guidance. Claude component discovery is a useful reference observation, not proof that OpenCode or any model achieves behavioral equivalence.
