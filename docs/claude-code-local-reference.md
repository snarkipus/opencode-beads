# Installed Claude reference integration

## Evidence boundary

The actual `beads@beads-marketplace` plugin is installed and enabled at **local project scope** for the Hermes `/opt/data/opencode-beads` workspace. This records installation/component discovery, not a live model-behavior or functional-parity result. It does not require collaborators to install a Claude plugin to use the OpenCode package.

## Current OpenCode comparison boundary — 2026-10-21

The [installed/model continuation](opencode-installed-model-continuation-vuy9.md) adds genuine OpenAI Sol/high semantic evidence on exact OpenCode 2.1.1 and the unchanged accepted package, including actual failure/partial child, meaningful append/relevant recall, bounded scope and same-provider summary/native recovery. Corrected actual cleanup/17 resource reads are reused; all 19 requirements and 73/74 selected corpus dispositions plus CODE_MODE are mapped. This is a parent-accepted bounded evaluation, not a controlled Claude-versus-OpenCode comparison or a model-quality finding. Ordinary typed execution remains withheld; the internal installed-source qualification seam is scratch-only. The installed Claude identity and all historical source comparisons below are unchanged. All 16 implementation tasks are accepted; release/activation remain separate.

## Installed identity

- Claude Code: `2.1.292`.
- Plugin-reported version: `1.3.0` (distinct from the Beads CLI/release version).
- Marketplace: `gastownhall/beads`, name `beads-marketplace`.
- Installed source commit recorded by Claude: `4a67d0d0288c1b4ee23e17fc896f47616931ba2d`.
- Installation path in this runtime: `/opt/data/home/.claude/plugins/cache/beads-marketplace/beads/1.3.0`.
- Local activation: `.claude/settings.local.json`, `enabledPlugins["beads@beads-marketplace"] = true`.
- CLI `plugin list --json` reports `enabled: true`, `scope: local`, and the exact project path. Its separate `projectEnabled: false` field is retained as reported, not treated as a project-scope installation claim.

Source: [installed revision](https://github.com/gastownhall/beads/tree/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads). The analysis baseline remains [Beads v1.3.1 source](https://github.com/gastownhall/beads/tree/c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c/plugins/beads). Installation used the marketplace's current checkout, **not** a claim that the pinned release was installed. Behavioral comparisons must record and align the chosen revision, or disclose differences, before attributing outcomes.

## Reconciled installed/release/current comparison

On 2026-10-18, read-only GitHub repository/commit/tree APIs resolved default branch `main` to **`4a67d0d0288c1b4ee23e17fc896f47616931ba2d`**, matching the recorded installed revision. All **57** current `plugins/beads/` files byte-match the installed cache. The complete declared current scope has 74 files versus the historical 73; all current blobs are hash-verified against the non-truncated tree. Equality of source identities is established; ancestry is **not** inferred from dates or manifest versions.

Compared with the historical release `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`, the full selected scope has one addition, no deletions and 16 edited files:

| Members | Characterized change and planning consequence |
| --- | --- |
| `plugins/beads/skills/beads/README.md`, resources `WORKFLOWS.md`, `PATTERNS.md`, `INTEGRATION_PATTERNS.md`, `ISSUE_CREATION.md` | Checkpoint examples change `--notes` to `--append-notes`. Preserve previous attempts/learning through append-style checkpoints; do not describe overwriting as the current main recommendation. WORKFLOWS still says "overwrite previous notes, not append" at line 368 and retains approval-on-every-handoff instructions. Its prose conflicts with its updated examples; adapt both to append checkpoints under existing authority. |
| resource `ASYNC_GATES.md` | Adds cross-repository `--repo` guidance for GitHub gates; qualify installed CLI support and normal access rather than enabling a monitor. |
| `.claude-plugin/marketplace.json`, plugin Claude/Codex/Copilot manifests | Version strings 1.3.1 in the release versus 1.3.0 in installed/main; discovery wiring is unchanged. Manifest version does not identify full source behavior. |
| `cmd/bd/prime.go` | Adds disabled-prime behavior before workspace/store access; changes `-C`/redirect/custom-prime and Git routing; distinguishes project facts from operator preferences and recommends append notes. Empty output is not proof of absent memory or a reason to bypass disable/hold. |
| `cmd/bd/memory.go` | Adds opt-in corpus-budget refusal/force semantics, explicit landed-but-uncommitted or indeterminate commit JSON fields, and found-empty versus absent recall. A zero exit is not proof of committed durability. Never silently force, change budgets or commit. |
| `cmd/bd/init.go`, `cmd/bd/init_embedded_test.go` | Home-directory/missing-database safety, explicit routing/initialization boundaries and fixture reorganization/coverage change. Upstream owns setup; this plan neither copies init nor authorizes it. |
| `cmd/bd/setup/claude.go`, `cmd/bd/setup/codex.go` | Adds output-directed installation wrappers; does not change ownership of integrations. |
| added `plugins/beads/BUILD.bazel` | Build/layout metadata only; reference evidence, no OpenCode runtime payload. |

The remaining **57 selected files** are unchanged from release (including all 29 command bodies, rich skill, agent and ADR); unchanged bytes may still contain obsolete MCP/TodoWrite/setup advice. `--append-notes` already exists in historical CLI source (`cmd/bd/cli_fast_test.go`), so the guidance correction alone does not require a runtime upgrade. Current-source memory/prime changes are not claims about the installed executable. See the separate `marketplace_main` inventory and [design](../openspec/changes/improve-beads-workflow-parity/design.md) for the selected acknowledgement and authority contract.

## Observed component discovery

`claude plugin details beads@beads-marketplace` reports:

- **30 skills**: the rich `beads` entry plus all **29 command entries**, including `prime` and `template`.
- **One agent**: `task-agent`.
- **Two hook types**: `SessionStart` and `PreCompact`.
- **Zero MCP servers** and zero LSP servers.

The installed resource directory contains **15 Markdown resources**. Inspection confirmed that the rich skill and task-agent body byte-match the examined release source. The characterized differences above prevent treating component counts as whole-corpus release equivalence. The static 73-file release inventory remains unchanged and authoritative for its explicitly pinned scope.

Claude's discovery of `prime` and `template` establishes component recognition in this installed harness. It does not prove successful invocation, argument handling, CLI/MCP resolution, or applicability to the pinned release. The original OpenCode loader's frontmatter limitation is not a Claude discovery limitation.

## Hook ownership and Codex setup

`bd setup claude` initially installed a standalone project `SessionStart` hook. After marketplace installation, only that newly generated standalone settings file was removed to avoid duplicate prime execution; marketplace hooks now own Claude startup/compaction wiring. Existing user instructions were preserved. No marketplace payload was modified.

`bd setup codex` installed the shared `.agents/skills/beads` entry, `.codex/hooks.json`, `.codex/config.toml` enabling hooks, and an `AGENTS.md` section. Setup verification passed. Generated Codex instructions explicitly call for persistent project memory through `bd remember`. This is potential behavior-bearing input to compare, not evidence of actual model compliance. Codex CLI was `0.162.1` when inspected.

Fresh worker sessions are required to evaluate effective loaded guidance. Do not interpret prior Astra runs as having exercised these newly installed integrations. Shared/generated instruction files and local activation are workspace setup, not implementation of the proposed OpenCode package.

## Packaging conclusion

The intended OpenCode product delivers its **complete owner-selected integration through its npm package**: registered command workflows, skill/resource assets, agent policies, lifecycle wiring and selected continuity tools. A separate manual skill/resource installation is not an acceptable hidden prerequisite for advertised capability. The installed `bd` executable and upstream-owned project initialization/data remain external. This refines the proposed packaging goal; the owner has selected N1, the full corpus groups, `oc-beads` and opt-in beta/next; implementation and acceptance remain unexecuted.

Qualification must inspect the installed artifact and effective registrations, resource reachability, overrides, teardown and a fresh session's actual guidance. Claude component discovery is a useful reference observation, not proof that OpenCode or any model achieves behavioral equivalence.
