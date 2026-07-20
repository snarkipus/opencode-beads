interface Replacement {
  from: string;
  to: string;
}

const replacements: Readonly<Record<string, readonly Replacement[]>> = {
  "agents/task-agent.md": [
    { from: "Use the `ready` MCP tool to get unblocked tasks", to: "Run `bd ready --json` via bash to get unblocked tasks" },
    { from: "Use the `show` tool to get full task details", to: "Run `bd show <id> --json` via bash to get full task details" },
    { from: "Use the `claim` tool for atomic start-work semantics", to: "Run `bd update <id> --claim --json` via bash for atomic start-work semantics" },
    { from: "Use `create` tool to file new issues", to: "Run `bd create \"<title>\" ... --json` via bash to file new issues" },
    { from: "Use `dep` tool with `discovered-from` to link them", to: "Run `bd dep add <new-id> <current-id> --type discovered-from --json` via bash to link them" },
    { from: "Use `close` tool with a clear completion message", to: "Run `bd close <id> --reason \"<message>\" --json` via bash" },
    { from: "Always claim before working (MCP: `claim`; CLI: `--claim`) and close when done", to: "Always claim with `bd update <id> --claim --json` before working and close when done" },
    { from: "If blocked, use `update` to set status to `blocked` and explain why", to: "If blocked, run `bd update <id> --status blocked --json` and explain why" },
    {
      from: `# Available Tools

Via beads MCP server:
- \`ready\` - Find unblocked tasks
- \`show\` - Get task details
- \`claim\` - Atomically claim task for work
- \`update\` - Update task status/fields
- \`create\` - Create new issues
- \`dep\` - Manage dependencies
- \`close\` - Complete tasks
- \`blocked\` - Check blocked issues
- \`stats\` - View project stats`,
      to: `# Available Commands

Run the \`bd\` CLI via bash. Use \`--json\` when structured output improves reliability:
- \`bd ready --json\` - Find unblocked tasks
- \`bd show <id> --json\` - Get task details
- \`bd update <id> --claim --json\` - Atomically claim task for work
- \`bd create ... --json\` - Create new issues
- \`bd dep ... --json\` - Manage dependencies
- \`bd close <id> --reason \"...\" --json\` - Complete tasks
- \`bd blocked --json\` - Check blocked issues
- \`bd stats --json\` - View project stats`,
    },
  ],
  "commands/close.md": [
    { from: "Use the beads MCP `close` tool to close the issue.", to: "Run `bd close <id> --reason \"<reason>\" --json` via bash to close the issue." },
    { from: "(use `ready` tool)", to: "(run `bd ready --json`)" },
    { from: "(use `create` tool with `discovered-from` link)", to: "(run `bd create ... --deps discovered-from:<id> --json`)" },
  ],
  "commands/create.md": [
    { from: "Use the beads MCP `create` tool to create the issue.", to: "Run `bd create \"<title>\" --type <type> --priority <priority> --description \"<description>\" --json` via bash." },
  ],
  "commands/init.md": [
    { from: "Use the beads MCP `init` tool with the prefix parameter (if provided) to set up a new beads database.", to: "Run `bd init [--prefix <prefix>]` via bash to set up a new beads database." },
    { from: "show project stats using the `stats` tool", to: "show project stats by running `bd stats --json`" },
  ],
  "commands/ready.md": [
    { from: "Use the beads MCP server to find tasks that are ready to work on (no blocking dependencies).", to: "Run `bd ready --json` via bash to find tasks that are ready to work on (no blocking dependencies)." },
    { from: "Call the `ready` tool to get a list of unblocked issues.", to: "Use the command output to get a list of unblocked issues." },
    { from: "use the `claim` tool to start work atomically", to: "run `bd update <id> --claim --json` via bash to start work atomically" },
    { from: "checking `blocked` issues or creating a new issue with the `create` tool", to: "running `bd blocked --json` or creating a new issue with `bd create ... --json`" },
  ],
  "commands/search.md": [
    { from: "when accessed via MCP", to: "when using structured CLI output" },
    { from: "You're using an LLM/MCP and want to minimize context usage", to: "You're using an LLM and want to minimize context usage" },
  ],
  "commands/show.md": [
    { from: "Use the beads MCP `show` tool to retrieve issue details", to: "Run `bd show <id> --json` via bash to retrieve issue details" },
  ],
  "commands/stats.md": [
    { from: "Use the beads MCP `stats` tool to retrieve project metrics", to: "Run `bd stats --json` via bash to retrieve project metrics" },
  ],
  "commands/update.md": [
    { from: "Use the beads MCP `update` tool to apply the changes.", to: "Run the appropriate `bd update <id> ... --json` command via bash." },
  ],
  "commands/version.md": [
    {
      from: `Check the installed versions of beads components and verify compatibility.

**Note:** The MCP server automatically checks bd CLI version >= 0.9.0 on startup. This command provides detailed version info and update instructions.

Use the beads MCP tools to:
1. Run \`bd version\` via bash to get the CLI version
2. Check the plugin version (0.9.2)
3. Compare versions and report any mismatches

Display:
- bd CLI version (from \`bd version\`)
- Plugin version (0.9.2)
- MCP server version (0.9.2)
- MCP server status (from \`stats\` tool or connection test)
- Compatibility status (✓ compatible or ⚠️ update needed)

If versions are mismatched, provide instructions:
- Update bd CLI: \`curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash\`
- Update plugin: \`/plugin update beads\`
- Restart Claude Code after updating

Suggest checking for updates if the user is on an older version.`,
      to: `Check the installed Beads and OpenCode versions against this plugin's documented compatibility range.

Run \`bd version\` and \`opencode --version\` via bash. Report both versions and point to the opencode-beads README compatibility table. Do not infer compatibility from unrelated integration or upstream plugin versions.

If \`bd\` is outdated, link to the current Beads installation guide. If opencode-beads is pinned in the OpenCode configuration, explain that updating requires changing the pinned package version and restarting OpenCode.`,
    },
  ],
  "commands/workflow.md": [
    { from: "Use `/beads:ready` or the `ready` MCP tool", to: "Use `/beads:ready` or run `bd ready --json`" },
    { from: "- Via MCP tool: `claim` with `issue_id: \"<id>\"`", to: "- Via CLI: `bd update <id> --claim --json`" },
    { from: "- Create issues: `/beads:create` or `create` MCP tool", to: "- Create issues: `/beads:create` or `bd create ... --json`" },
    { from: "- Link them: Use `dep` MCP tool with `type: \"discovered-from\"`", to: "- Link them: `bd dep add <new-id> <current-id> --type discovered-from --json`" },
    { from: "- Via MCP tool: `close` with reason", to: "- Via CLI: `bd close <id> --reason \"<summary>\" --json`" },
    {
      from: `## MCP Tools Available
Use these via the beads MCP server:
- \`ready\`, \`list\`, \`show\`, \`create\`, \`claim\`, \`update\`, \`close\`
- \`dep\` (manage dependencies), \`blocked\`, \`stats\`
- \`init\` (initialize bd in a project)`,
      to: `## CLI Access
Run the \`bd\` CLI via bash for operations not covered by a slash command. Use \`bd <command> --help\` for current syntax and \`--json\` when structured output improves reliability.`,
    },
  ],
};

const unsupportedPattern = /\bmcp\b|claude code|\/plugin update beads/i;

/** Paths with explicit OpenCode adaptations, used as the expected inventory. */
export const adaptedVendorPaths = Object.freeze(Object.keys(replacements).sort());

/** Apply strict, reviewable OpenCode adaptations to one upstream prompt body. */
export function adaptVendorPrompt(relativePath: string, content: string): string {
  let adapted = content;

  for (const replacement of replacements[relativePath] ?? []) {
    const first = adapted.indexOf(replacement.from);
    const last = adapted.lastIndexOf(replacement.from);
    if (first === -1 || first !== last) {
      throw new Error(`Expected exactly one adaptation source in ${relativePath}: ${replacement.from}`);
    }
    adapted = adapted.replace(replacement.from, replacement.to);
  }

  const unsupported = adapted.match(unsupportedPattern)?.[0];
  if (unsupported) {
    throw new Error(`Unsupported ${unsupported} instruction remains in ${relativePath}`);
  }

  return adapted;
}
