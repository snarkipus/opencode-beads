# Beads Artifact Policy

Status: implemented on 2026-07-20 by `opencode-beads-yui.16`.

## Evidence

- Currently packaged artifact baseline: Beads `v1.0.5`, commit `6a3f515ced18406c189c55fff789a4925bfaa35c`, under `plugins/beads/`.
- Current reviewed artifact baseline: Beads `v1.1.0`, commit `8e4e59d39f3459a43cf21a3236a13eca4dd874f7`. Its skill, ADR, and all 15 resource blobs are unchanged from `v1.0.5`.
- OpenCode baseline: installed plugin/SDK `1.0.148` and reviewed stable `1.18.3`, as recorded in [the SDK contract](opencode-sdk-contract.md).
- OpenCode's [skill documentation](https://opencode.ai/docs/skills) limits automatic discovery to `skills/<name>/SKILL.md` under project or global `.opencode`, `.claude`, and `.agents` configuration trees. It does not scan npm package internals.
- OpenCode's [plugin documentation](https://opencode.ai/docs/plugins) and reviewed plugin types expose native command, agent, tool, hook, and configuration integration, but no hook or configuration field for registering a package-local skill or resource tree.
- The upstream [`SKILL.md`](https://github.com/gastownhall/beads/blob/v1.1.0/plugins/beads/skills/beads/SKILL.md) is declared for Claude Code and Codex, uses frontmatter fields OpenCode ignores, targets `bd` 0.60.0, and tells newer clients to use `bd prime` because the skill may be stale.
- Upstream [ADR-0001](https://github.com/gastownhall/beads/blob/v1.1.0/plugins/beads/skills/beads/adr/0001-bd-prime-as-source-of-truth.md) makes `bd prime` the canonical dynamic context source. OpenCode uses its memories-only mode plus `bd <command> --help` to avoid duplicating the full workflow and CLI reference.

## Decision

| Upstream artifact | Policy | Reason |
| --- | --- | --- |
| `skills/beads/commands/*.md` | Approved after OpenCode adaptation | OpenCode has a native `Config.command` surface. The current adapter namespaces these as `/beads:*`, validates known adaptations, and records exact provenance. |
| `agents/task-agent.md` | Approved after OpenCode adaptation | OpenCode has a native `Config.agent` surface. The adapter validates the upstream prompt but registers a compact role-specific `beads-task-agent`; shared CLI and lifecycle guidance is injected once per session. |
| `skills/beads/SKILL.md` | Approved after OpenCode adaptation for explicit managed installation | Passive npm discovery does not work, so the companion CLI owns deliberate project or global installation, provenance, collision checks, upgrades, and removal. The runtime plugin never writes it during startup. |
| `skills/beads/adr/` | Approved when referenced by the adapted skill | Keep only reviewed rationale needed by the installed skill; `bd prime` remains the canonical live workflow source. |
| `skills/beads/resources/` | Approved after OpenCode adaptation | Include only resources referenced by the adapted skill, removing host-specific policy and avoiding duplication of live CLI guidance. |
| Claude/Codex manifests and hooks | Excluded | `.claude-plugin` and `.codex-plugin` formats and lifecycle hooks are not OpenCode plugin registration formats. This adapter implements its own typed startup/message and compaction behavior. |
| Beads executable, complete CLI docs, server, or MCP integration | Excluded | The installed `bd` CLI remains the sole execution and data-management boundary. This package invokes it but does not redistribute, emulate, or replace it. |

## Discovery and collisions

Shipping a package-local skill alone would add no capability because OpenCode does not search npm package internals. Installation is therefore an explicit companion-CLI operation, never a startup side effect. Before writing, it scans project and global `.opencode`, `.agents`, and `.claude` skill roots and refuses unmanaged, differently managed, or locally modified content. A provenance manifest and hashes establish ownership for safe update and removal; there is no force override.

The project target is `<worktree>/.opencode/skills/beads`; the global target is `<home>/.config/opencode/skills/beads`. The installed ownership record is `.opencode-beads-manifest.json` inside that target. It records owner, package version, upstream tag and commit, adaptation revision, scope, canonical target, and the sorted path and SHA-256 digest of every payload file. The ownership record does not hash itself. Install and update build a complete sibling staging tree, write its ownership record last, and swap it with a sibling backup; removal first renames the validated target to a sibling backup. Recovery copies permit caught deletion failures to restore the old target. Clearly owned stale transaction siblings are refused rather than silently consumed. This protects against ordinary caught filesystem errors but does not claim crash-proof atomicity across multiple renames.

The approved commands and agent use native configuration mutation and explicit names. Their collision policy is separate work owned by `opencode-beads-yui.10`; this decision does not change precedence or merge behavior.

## `bd prime` boundary

The plugin runs the active project's installed `bd prime --memories-only` at initial context injection and after compaction. Persistent memories provide project-specific context, one compact adapter layer supplies OpenCode host and lifecycle safety, and `bd <command> --help` supplies current syntax. Older CLIs that specifically reject the flag fall back once to full `bd prime`, without appending duplicate workflow guidance. Static artifacts must not restate the complete CLI or task-agent workflow.

The full `bd` command surface remains CLI-only. OpenCode receives no generated tool per subcommand, no embedded database API, and no bundled Beads binary.

## Provenance and package implications

The npm package ships the adapted skill and three referenced resources under `dist/init/artifacts/beads/`, with strict checksums and provenance in `dist/init/manifest.json` and the `opencode-beads` companion lifecycle CLI. The manifest pins Beads `v1.0.5` at `6a3f515ced18406c189c55fff789a4925bfaa35c`. It records and validates this reviewed fork mapping:

| Exact upstream source | Adapted package target |
| --- | --- |
| `plugins/beads/skills/beads/SKILL.md` | `SKILL.md` |
| `plugins/beads/skills/beads/resources/DEPENDENCIES.md` | `references/DEPENDENCIES.md` |
| `plugins/beads/skills/beads/resources/ISSUE_CREATION.md` | `references/ISSUE_CREATION.md` |
| `plugins/beads/skills/beads/resources/RESUMABILITY.md` | `references/RESUMABILITY.md` |

Each source record includes the reviewed upstream SHA-256, independently of the adapted target checksum. Upstream plugin manifests, hooks, executables, and unreferenced resources remain excluded.

The package CLI is canonical for skill setup and management; every suggested `bunx` invocation is pinned to the plugin package version. `/beads:init` remains DB-only. CLI exits are `0` for success/current, `1` for a non-current `check`, and `2` for usage, refusal, validation, discovery, or operational errors. JSON mode emits one deterministic object on stdout and no stderr on every exit.

Any future artifact added to this policy must have all of the following before implementation:

- a native, documented OpenCode discovery or registration path;
- an explicit namespace and deterministic collision policy;
- review and adaptation for OpenCode semantics without duplicating `bd prime`;
- exact upstream repository, stable tag, commit, source-to-target mapping, sorted inventory, byte length, and checksum provenance;
- deterministic validation, package-content tests, and failure behavior;
- a documented owner and removal/upgrade path.

Upstream Beads issue [#3145](https://github.com/gastownhall/beads/issues/3145) and OpenCode PR [#35196](https://github.com/anomalyco/opencode/pull/35196) are future convergence points. Both remain open and are not release dependencies; the explicit fork-owned CLI remains canonical until a stable replacement exists.
