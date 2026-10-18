# Beads Artifact Policy

Status: current implementation policy, under review in the [full integration decision packet](claude-code-integration-analysis.md); owner selections for an opt-in beta/next redesign are recorded, but no product implementation has occurred. Revised for 1.0.0 by `opencode-beads-w5y`. The package vendors no upstream Beads artifacts. Earlier revisions were the OpenCode V2 port (`opencode-beads-2zs`), the 0.9.0 contract (`opencode-beads-98l`), and the retired 0.8.0 companion lifecycle decision.

## Evidence

Upstream host integrations at Beads `v1.3.1` (commit `c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c`), compared with this adapter:

| Host | Integration source | Context lifecycle | Commands | Task agent |
| --- | --- | --- | --- | --- |
| Claude Code | `plugins/beads/.claude-plugin/plugin.json` | `SessionStart` and `PreCompact` hooks run plain `bd prime` (MCP-sensitive) | `skills/beads/commands/*.md` | `plugins/beads/agents/task-agent.md` (`@task-agent`), discovered by convention: an autonomous loop that finds, claims, and completes ready work through MCP-style tool names |
| Codex | `plugins/beads/.codex-plugin/plugin.json` and `.codex-plugin/hooks/hooks.json` | `SessionStart`, `PreCompact`, `PostCompact`, and `UserPromptSubmit` hooks | none | none |
| OpenCode (this adapter) | `@snarkipus/opencode-beads` | Session context hook attaches full `bd prime` to each request, behind the schema migration guard | none | Project-owned `beads-task-agent`: one bead per invocation |

- The upstream task agent is consumed only by the Claude Code plugin (`docs/integrations/claude-code-plugin.md`, `cmd/bd/setup/plugin_layout_test.go`). Codex ships skills and hooks but no agent.
- Upstream [ADR-0001](https://github.com/gastownhall/beads/blob/v1.3.1/plugins/beads/skills/beads/adr/0001-bd-prime-as-source-of-truth.md) makes full `bd prime` the canonical dynamic context source.
- The Beads `v1.0.5` and `v1.1.0` Claude Code plugin manifests both run full `bd prime` at `SessionStart` and `PreCompact`, while bundling the Beads skill and command templates as static discovery surfaces.
- The Codex hook implementation expresses the target lifecycle: `SessionStart` injects full prime, `PreCompact` uses `--memories-only` only to check context availability, and `PostCompact` plus the next `UserPromptSubmit` refreshes full prime. The `v1.0.5` plugin manifest incorrectly referenced `./hooks/hooks.json`; `v1.1.0` corrected the operational path to `./.codex-plugin/hooks/hooks.json`. OpenCode follows the lifecycle behavior, not the broken older manifest path.
- OpenCode V2's [skill documentation](https://opencode.ai/v2/docs/skills/) discovers skills under project and global `.opencode/skills`, `.claude/skills`, and `.agents/skills`, plus configured directories or URLs. It does not scan npm package internals.
- OpenCode V2's [plugin guide](https://opencode.ai/v2/docs/build/plugins/) exposes agent, command, skill, tool, and session-hook domains. Plugin commands are executable code, and plugin skills require a `path`.

## Decision

| Upstream artifact | Policy | Reason |
| --- | --- | --- |
| `skills/beads/commands/*.md` | Retired in 1.0.0 (`opencode-beads-2zs.4`) | Claude Code command templates, not part of the native OpenCode or Codex install. They largely wrap single `bd` subcommands and duplicate `bd prime` plus the canonical `.agents/skills/beads` skill, which OpenCode V2 discovers natively. V2 plugin command registration uses executable code, but native Markdown and JSON prompt commands are also supported. Retirement was a package policy choice, not a limitation of all V2 commands; see the [full integration analysis](claude-code-integration-analysis.md). |
| `agents/task-agent.md` | Retired in 1.0.0 (`opencode-beads-w5y`) | A Claude Code-only artifact whose autonomous multi-task loop this adapter deliberately does not adopt. Before retirement, its body was never executed: the runtime prompt was already a project-owned bounded OpenCode adaptation, and only the upstream description string reached users, misdescribing the one-bead worker. The task agent's prompt and description now live in `src/guidance.ts`. It does not execute upstream's autonomous multi-task loop. |
| `skills/beads/SKILL.md`, `skills/beads/adr/`, and `skills/beads/resources/` | Excluded | `bd init` owns per-project initialization. Its automatic Codex project integration creates the canonical shared skill at `.agents/skills/beads`, which OpenCode discovers. This package does not fork, install, update, or remove that skill. |
| Claude/Codex manifests and hooks | Excluded | `.claude-plugin` and `.codex-plugin` formats and lifecycle hooks are not OpenCode plugin registration formats. This adapter implements the equivalent lifecycle through OpenCode V2's session context hook and session events. |
| Beads executable, complete CLI docs, server, or MCP integration | Excluded | The installed `bd` CLI remains the sole execution and data-management boundary. This package invokes it but does not redistribute, emulate, or replace it. |

### Rationale for retiring vendoring

Until 1.0.0 a daily workflow synced the upstream task agent into `vendor/` with a manifest of tag, commit, inventory, and checksums, and validated reviewed text replacements. After the command templates were retired, that machinery (sync script, provenance module, validator, and their tests) existed for one file. That file contributed only metadata, provenance, and compatibility validation, and its one user-visible effect was the wrong description. Its drift tripwire signalled edits to a Claude Code prompt this adapter does not run. Upstream changes that matter here (`bd prime` output, `bd where --json`, `.beads/.local_version`, schema migrations, the commands the task-agent prompt names, and `bd setup opencode`) reach the adapter through the installed CLI. Vendoring never tested any of them; the bd contract check does.

### Consequences

- No `vendor/` directory, sync workflow, or provenance manifest. Packages contain only `src/`, `README.md`, `LICENSE`, and `package.json`.
- `scripts/bd-contract.ts` exercises a real `bd` in a disposable repository: version parsing and the supported minimum, `bd where --json`, the `.beads/.local_version` contract the guard relies on, `bd prime --full` under a Claude Code MCP configuration, and every command named by the task-agent prompt. It runs the plugin's own guard code.
- CI runs the contract against `beads.validated` from `package.json`. The scheduled `beads-contract` workflow runs it daily against the latest stable Beads release and fails when a release breaks the contract or has not been reviewed yet, replacing the sync PRs as the new-release signal. After reviewing a release's upgrade notes against the surfaces above, the maintainer updates `beads.validated` and the README compatibility table, and records any follow-up work in Beads.
- The task-agent contract is tested directly against the project-owned prompt and description.
- The contract also guards this plugin's reason to exist. The plugin gives OpenCode the integration shape `bd setup claude` gives Claude Code, and assumes users run plain `bd init` (minimal `AGENTS.md` pointer) but never `bd setup opencode`. The check fails with a `REASSESS:` message if `bd init` starts writing OpenCode integration files, if `bd setup opencode` changes anything besides `AGENTS.md`, or if the `opencode` recipe stops being an `AGENTS.md` section. Any of these would mean upstream may now cover OpenCode natively, and the plugin's scope should be reviewed rather than patched.

## Skill ownership

OpenCode does not search npm package internals, so this package ships no skill payload. Projects install `bd` once on the host, create a Git worktree when necessary, and run `bd init` in each project. The canonical `.agents/skills/beads` is created by `bd init`'s automatic Codex project integration, not by `bd setup opencode` and not by this plugin.

Users upgrading from 0.8.0 must remove its old `.opencode/skills/beads` installation with `bunx @snarkipus/opencode-beads@0.8.0 remove` before upgrading. The 0.9.0 package has no companion executable, `/beads:setup` command, ownership manifest, collision policy, or `dist/init` payload.

The task agent is registered under an explicit name through OpenCode's agent transform; user configuration overrides its fields one by one.

## `bd prime` boundary

The plugin runs the active project's installed `bd prime --full` once per session (`--full` overrides bd's MCP detection, which reads Claude Code's settings), attaches it to each model request for eligible primary agents and `beads-task-agent`, and refreshes it after compaction. This mirrors the behavioral contract of the upstream Claude Code and Codex integrations through OpenCode V2's session context hook and `session.compaction.ended` event rather than host-specific hook files. Before running prime, a schema migration guard confirms that `bd` is 1.3.0 or later and that `.beads/.local_version` is current; otherwise it withholds prime with an agent-facing notice so the plugin never applies an irreversible store migration unattended. Full prime supplies the canonical current workflow, command guidance, and persistent memories. The shared injected layer adds only OpenCode CLI safety and primary-agent delegation. Known regular subagents remain excluded; agent lookup failures fail open for context injection so unknown custom primary agents remain compatible.

This is context-preserving atomic delegation: the primary OpenCode thread retains planning context, decisions, and control while `beads-task-agent` processes exactly one Bead per invocation. In the absence of an external orchestrator, that boundary intentionally favors Bead atomicity and context preservation over broad autonomous execution. An orchestrator may repeat the one-Bead cycle, but should preserve the worker boundary.

The registered task agent also carries a bounded static quick reference, analogous to Codex's managed `AGENTS.md` section and Claude Code's bundled skill, so it can discover `ready`, `show`, atomic claim, discovered follow-up, validation before closure, close, and manual `bd prime` recovery without consumer-owned instructions. The shared runtime layer additionally prohibits automatic commit, push, or Dolt synchronization unless current instructions or repository policy explicitly require it. It does not embed the complete prime workflow. If full prime fails or returns no content, automatic injection is retried later, and the task-agent fallback remains available.

The full `bd` command surface remains CLI-only. OpenCode receives no generated tool per subcommand, no embedded database API, and no bundled Beads binary.

## Provenance history

- 0.9.x through 0.10.x vendored upstream artifacts. The last reviewed baselines were Beads `v1.3.0` (commit `f45b249ce6b40ba62aecc03949e6371e8f7c79d8`) and, for the V2 branch, `v1.3.1`. Earlier baselines were Beads `v1.2.2`, commit `6c124203e771433a3550c348771a5b5e27fd3c21`, whose non-manifest vendor bytes matched the tested v1.1.2 baseline at local repository commit `e51b8fe`.
- The 0.9.3 package contained withdrawn upstream v1.2.1 command guidance. This adapter did not bundle the `bd` binary or implement database migrations, but its context injection could invoke a consumer-installed v1.2.1 binary through `bd prime`. Even one v1.2.1 execution could migrate the database from schema v53 to v65. Users must upgrade the plugin package to 0.9.4; if v1.2.1 was installed and may have run, they must additionally follow [upstream v1.2.2 database recovery guidance](https://github.com/gastownhall/beads/blob/v1.2.2/docs/RECOVERY-1.2.1.md). This repository does not perform database recovery.

Any future upstream artifact proposed for inclusion must first show:

- a native, documented OpenCode discovery or registration path;
- that it is executed or rendered as shipped, rather than replaced by a project-owned adaptation;
- that it does not duplicate `bd prime` or the canonical skill;
- deterministic validation, package-content tests, and failure behavior;
- a documented owner and removal or upgrade path.

## Selected beta/next planning exception (not implemented)

The [owner record](../openspec/changes/improve-beads-workflow-parity/owner-decisions.md) selects package-owned `oc-beads` skill/resources, `oc-beads:<command>` workflows, N1 continuity tools and scope-bounded continuation on OpenCode `>=2.0.32 <3`. This is an opt-in redesign; the current implementation policies above remain historical/current-stable descriptions, not prohibitions against the selected future assets. No upstream shared skill or user file is overwritten, and bd remains executable/data owner. Delivery is complete through npm with native registration/disposal; no manual rich-skill installation.

Source drift will fail a distinct check/job for unreviewed changes, with separate `::error::` diagnostics for drift and retrieval/comparison failure, reusing the existing scheduled check output with immutable marketplace-main comparisons across inventory roots/support paths, separately from stable CLI compatibility. No GitHub issues, issue-write permissions, automatic copying, baseline advancement or releases. Human review selects subsequent Beads execution work. This planning reconciliation does not edit the workflow or package.

The future SKILL.md explicitly links all 15 resources plus ADR; host auto-listing of ten files is insufficient. Package fixtures verify installed-base links, and live acceptance honors external-directory ask/deny without concealing unreachable guidance. User command preservation remains mandatory across rebuilds: withhold affected colliding entries where possible and stop the affected path if preservation cannot be established. Before the prerelease compatibility change reaches stable main, separately authorized release work must settle a stable 1.0.x maintenance branch strategy; no branch/release action or present source-work blocker is implied.
