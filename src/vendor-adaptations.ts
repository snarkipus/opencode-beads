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
