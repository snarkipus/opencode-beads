# Beads Artifact Policy

Status: revised for the 0.9.0 contract by `opencode-beads-98l`; the 0.8.0 companion lifecycle decision is retired.

## Evidence

- Currently packaged artifact baseline: Beads `v1.1.0`, commit `8e4e59d39f3459a43cf21a3236a13eca4dd874f7`, under `plugins/beads/`.
- OpenCode baseline: minimum plugin/SDK `1.18.3` and reviewed stable `1.18.4`, as recorded in [the SDK contract](opencode-sdk-contract.md).
- OpenCode's [skill documentation](https://opencode.ai/docs/skills) limits automatic discovery to `skills/<name>/SKILL.md` under project or global `.opencode`, `.claude`, and `.agents` configuration trees. It does not scan npm package internals.
- OpenCode's [plugin documentation](https://opencode.ai/docs/plugins) and reviewed plugin types expose native command, agent, tool, hook, and configuration integration, but no hook or configuration field for registering a package-local skill or resource tree.
- The upstream [`SKILL.md`](https://github.com/gastownhall/beads/blob/v1.1.0/plugins/beads/skills/beads/SKILL.md) is declared for Claude Code and Codex, uses frontmatter fields OpenCode ignores, targets `bd` 0.60.0, and tells newer clients to use `bd prime` because the skill may be stale.
- Upstream [ADR-0001](https://github.com/gastownhall/beads/blob/v1.1.0/plugins/beads/skills/beads/adr/0001-bd-prime-as-source-of-truth.md) makes full `bd prime` the canonical dynamic context source.
- The Beads `v1.0.5` and `v1.1.0` Claude Code plugin manifests both run full `bd prime` at `SessionStart` and `PreCompact`, while bundling the Beads skill and command templates as static discovery surfaces.
- The Codex hook implementation expresses the target lifecycle: `SessionStart` injects full prime, `PreCompact` uses `--memories-only` only to check context availability, and `PostCompact` plus the next `UserPromptSubmit` refreshes full prime. The `v1.0.5` plugin manifest incorrectly referenced `./hooks/hooks.json`; `v1.1.0` corrected the operational path to `./.codex-plugin/hooks/hooks.json`. OpenCode follows the lifecycle behavior, not the broken older manifest path.

## Decision

| Upstream artifact | Policy | Reason |
| --- | --- | --- |
| `skills/beads/commands/*.md` | Approved after OpenCode adaptation | OpenCode has a native `Config.command` surface. The current adapter namespaces these as `/beads:*`, validates known adaptations, and records exact provenance. |
| `agents/task-agent.md` | Approved after OpenCode adaptation | OpenCode has a native `Config.agent` surface. The adapter validates the upstream prompt and registers a compact role-specific `beads-task-agent` with the same layered shape as upstream: a bounded static command/recovery reference plus full prime injected once per session and after compaction. |
| `skills/beads/SKILL.md`, `skills/beads/adr/`, and `skills/beads/resources/` | Excluded | `bd init` owns per-project initialization. Its automatic Codex project integration creates the canonical shared skill at `.agents/skills/beads`, which OpenCode discovers. This package does not fork, install, update, or remove that skill. |
| Claude/Codex manifests and hooks | Excluded | `.claude-plugin` and `.codex-plugin` formats and lifecycle hooks are not OpenCode plugin registration formats. This adapter implements its own typed startup/message and compaction behavior. |
| Beads executable, complete CLI docs, server, or MCP integration | Excluded | The installed `bd` CLI remains the sole execution and data-management boundary. This package invokes it but does not redistribute, emulate, or replace it. |

## Skill ownership

OpenCode does not search npm package internals, so this package ships no skill payload. Projects install `bd` once on the host, create a Git worktree when necessary, and run `bd init` in each project. The canonical `.agents/skills/beads` is created by `bd init`'s automatic Codex project integration, not by `bd setup opencode` and not by this plugin.

Users upgrading from 0.8.0 must remove its old `.opencode/skills/beads` installation with `bunx @snarkipus/opencode-beads@0.8.0 remove` before upgrading. The 0.9.0 package has no companion executable, `/beads:setup` command, ownership manifest, collision policy, or `dist/init` payload.

The approved commands and agent use native configuration mutation and explicit names. Their collision policy is separate work owned by `opencode-beads-yui.10`; this decision does not change precedence or merge behavior.

## `bd prime` boundary

The plugin runs the active project's installed full `bd prime` at initial context injection and after compaction for eligible primary agents and `beads-task-agent`. This mirrors the behavioral contract of the upstream Claude Code and Codex integrations using OpenCode's typed `chat.message`, `session.compacted`, and synthetic `noReply` prompt surfaces rather than host-specific hook files. Full prime supplies the canonical current workflow, command guidance, and persistent memories. The shared injected layer adds only OpenCode CLI safety and primary-agent delegation; regular subagents remain excluded.

The registered task agent also carries a bounded static quick reference, analogous to Codex's managed `AGENTS.md` section and Claude Code's bundled skill, so it can discover `ready`, `show`, atomic claim, discovered follow-up, validation before closure, close, and manual `bd prime` recovery without consumer-owned instructions. The shared runtime layer additionally prohibits automatic commit, push, or Dolt synchronization unless current instructions or repository policy explicitly require it. It does not embed the complete prime workflow. If full prime fails or returns no content, automatic injection remains retryable; vendored commands and the task-agent fallback remain available.

The full `bd` command surface remains CLI-only. OpenCode receives no generated tool per subcommand, no embedded database API, and no bundled Beads binary.

## Provenance and package implications

The npm package ships only the runtime adapter source and the reviewed command and task-agent artifacts under `vendor/`. `vendor/manifest.json` pins Beads `v1.1.0` at `8e4e59d39f3459a43cf21a3236a13eca4dd874f7` and records exact source paths, sorted inventory, byte lengths, and SHA-256 checksums. Strict package tests reject a companion bin, `dist/init` content, missing runtime artifacts, or unexpected files.

Any future artifact added to this policy must have all of the following before implementation:

- a native, documented OpenCode discovery or registration path;
- an explicit namespace and deterministic collision policy;
- review and adaptation for OpenCode semantics without duplicating `bd prime`;
- exact upstream repository, stable tag, commit, source-to-target mapping, sorted inventory, byte length, and checksum provenance;
- deterministic validation, package-content tests, and failure behavior;
- a documented owner and removal/upgrade path.
