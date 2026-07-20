# Beads Artifact Policy

Status: accepted on 2026-07-20. This decision defines product scope only; artifact-policy implementation belongs to `opencode-beads-yui.16`.

## Evidence

- Currently packaged artifact baseline: Beads `v1.0.5`, commit `6a3f515ced18406c189c55fff789a4925bfaa35c`, under `plugins/beads/`.
- Current reviewed artifact baseline: Beads `v1.1.0`, commit `8e4e59d39f3459a43cf21a3236a13eca4dd874f7`. Its skill, ADR, and all 15 resource blobs are unchanged from `v1.0.5`.
- OpenCode baseline: installed plugin/SDK `1.0.148` and reviewed stable `1.18.3`, as recorded in [the SDK contract](opencode-sdk-contract.md).
- OpenCode's [skill documentation](https://opencode.ai/docs/skills) limits automatic discovery to `skills/<name>/SKILL.md` under project or global `.opencode`, `.claude`, and `.agents` configuration trees. It does not scan npm package internals.
- OpenCode's [plugin documentation](https://opencode.ai/docs/plugins) and reviewed plugin types expose native command, agent, tool, hook, and configuration integration, but no hook or configuration field for registering a package-local skill or resource tree.
- The upstream [`SKILL.md`](https://github.com/gastownhall/beads/blob/v1.1.0/plugins/beads/skills/beads/SKILL.md) is declared for Claude Code and Codex, uses frontmatter fields OpenCode ignores, targets `bd` 0.60.0, and tells newer clients to use `bd prime` because the skill may be stale.
- Upstream [ADR-0001](https://github.com/gastownhall/beads/blob/v1.1.0/plugins/beads/skills/beads/adr/0001-bd-prime-as-source-of-truth.md) makes `bd prime` the canonical AI workflow and CLI reference specifically to avoid duplication, drift, and token overhead.

## Decision

| Upstream artifact | Policy | Reason |
| --- | --- | --- |
| `skills/beads/commands/*.md` | Approved after OpenCode adaptation | OpenCode has a native `Config.command` surface. The current adapter namespaces these as `/beads:*`, validates known adaptations, and records exact provenance. |
| `agents/task-agent.md` | Approved after OpenCode adaptation | OpenCode has a native `Config.agent` surface. The adapter registers one scoped `beads-task-agent` and supplies OpenCode-specific CLI guidance. |
| `skills/beads/SKILL.md` | Excluded | An npm package path is not discoverable as an OpenCode skill, no stable plugin API registers it, and copying it into user/project configuration would mutate files the plugin does not own. Its workflow overlaps `bd prime` and requires OpenCode-specific frontmatter and instruction review. |
| `skills/beads/adr/` | Excluded | The ADR is maintainership rationale for the upstream skill, not an independently discoverable OpenCode artifact. Its relevant conclusion, that `bd prime` is canonical, is implemented directly. |
| `skills/beads/resources/` | Excluded | The 15-file resource tree is reachable only through the excluded skill. It duplicates live CLI/workflow guidance, substantially increases package and review scope, and includes host-specific policy such as TodoWrite guidance that can conflict with managed project instructions. |
| Claude/Codex manifests and hooks | Excluded | `.claude-plugin` and `.codex-plugin` formats and lifecycle hooks are not OpenCode plugin registration formats. This adapter implements its own typed startup/message and compaction behavior. |
| Beads executable, complete CLI docs, server, or MCP integration | Excluded | The installed `bd` CLI remains the sole execution and data-management boundary. This package invokes it but does not redistribute, emulate, or replace it. |

## Discovery and collisions

Shipping `vendor/skills/beads/SKILL.md` would add bytes but no capability because OpenCode does not search that package path. Making it discoverable would require copying or linking it into a project/global skill directory. That is rejected because it would create install/uninstall ownership problems, write outside the package cache, bypass normal user control, and collide with a user-managed skill named `beads`. OpenCode requires unique skill names but does not document a package-plugin collision contract that this adapter could enforce deterministically.

The approved commands and agent use native configuration mutation and explicit names. Their collision policy is separate work owned by `opencode-beads-yui.10`; this decision does not change precedence or merge behavior.

## `bd prime` boundary

The plugin runs the active project's installed `bd prime` at initial context injection and after compaction. That output follows the installed CLI version and is therefore more current than copied skill prose or command reference material. Vendored commands provide optional OpenCode UX, while `bd prime` supplies session rules and `bd <command> --help` supplies live command details. Static artifacts must not restate the complete CLI or create a second source of truth.

The full `bd` command surface remains CLI-only. OpenCode receives no generated tool per subcommand, no embedded database API, and no bundled Beads binary.

## Provenance and package implications

The npm package should continue shipping only `src`, `vendor`, and `README.md`. Within `vendor`, only approved commands, the task agent, and their manifest belong in the package. `SKILL.md`, `adr/`, `resources/`, upstream plugin manifests, hooks, and executables must remain absent.

Any future artifact added to this policy must have all of the following before implementation:

- a native, documented OpenCode discovery or registration path;
- an explicit namespace and deterministic collision policy;
- review and adaptation for OpenCode semantics without duplicating `bd prime`;
- exact upstream repository, stable tag, commit, source-to-target mapping, sorted inventory, byte length, and checksum provenance;
- deterministic validation, package-content tests, and failure behavior;
- a documented owner and removal/upgrade path.

Reconsider the skill tree only if OpenCode adds a stable plugin API for package-owned skills or explicitly discovers skills inside npm plugins. Until then, package-local skill files are unsupported inert content and remain excluded.
