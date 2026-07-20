/**
 * Vendor file loaders for beads plugin.
 *
 * The vendor directory contains beads command definitions and agent prompts
 * synced from the upstream beads repository via scripts/sync-beads.sh.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentConfig, Config } from "@opencode-ai/sdk";
import { adaptVendorPrompt } from "./vendor-adaptations";

function getVendorDir(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.join(__dirname, "..", "vendor");
}

interface ParsedMarkdown {
  frontmatter: Record<string, string>;
  body: string;
}

const DOCUMENT_ONLY_COMMANDS = new Set(["commands/prime.md", "commands/template.md"]);
const COMMAND_FRONTMATTER_FIELDS = new Set([
  "agent",
  "argument-hint",
  "description",
  "model",
  "subtask",
]);
const AGENT_FRONTMATTER_FIELDS = new Set([
  "color",
  "description",
  "disable",
  "maxSteps",
  "mode",
  "model",
  "temperature",
  "top_p",
]);

function vendorError(relativePath: string, reason: string): Error {
  return new Error(`Invalid vendor artifact ${relativePath}: ${reason}`);
}

function parseMarkdownWithFrontmatter(content: string, relativePath: string): ParsedMarkdown {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) throw vendorError(relativePath, "missing or malformed frontmatter delimiters");

  const frontmatterStr = match[1];
  const body = match[2];

  if (frontmatterStr === undefined || body === undefined) {
    throw vendorError(relativePath, "missing frontmatter or body");
  }

  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex <= 0) throw vendorError(relativePath, `malformed frontmatter line: ${trimmed}`);

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();
    if (Object.hasOwn(frontmatter, key)) {
      throw vendorError(relativePath, `duplicate frontmatter field: ${key}`);
    }

    // Handle quoted strings
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (value.startsWith('"') || value.startsWith("'")) {
      throw vendorError(relativePath, `unterminated quoted value for ${key}`);
    }

    // Handle empty array syntax like []
    if (value === "[]") {
      value = "";
    }

    frontmatter[key] = value;
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) throw vendorError(relativePath, "body must not be empty");
  return { frontmatter, body: trimmedBody };
}

async function readVendorFile(vendorDirectory: string, relativePath: string): Promise<string> {
  try {
    const fullPath = path.join(vendorDirectory, relativePath);
    return await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw vendorError(relativePath, `cannot read file: ${reason}`);
  }
}

async function manifestPaths(vendorDirectory: string): Promise<string[]> {
  const content = await readVendorFile(vendorDirectory, "manifest.json");
  let manifest: unknown;
  try {
    manifest = JSON.parse(content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw vendorError("manifest.json", `invalid JSON: ${reason}`);
  }

  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("files" in manifest) ||
    !Array.isArray(manifest.files)
  ) {
    throw vendorError("manifest.json", "files must be an array");
  }
  const paths = manifest.files.map((file, index) => {
    if (
      typeof file !== "object" ||
      file === null ||
      !("path" in file) ||
      typeof file.path !== "string"
    ) {
      throw vendorError("manifest.json", `files[${index}].path must be a string`);
    }
    return file.path;
  });
  if (new Set(paths).size !== paths.length) {
    throw vendorError("manifest.json", "file paths must be unique");
  }
  return paths.sort();
}

function requiredString(
  frontmatter: Record<string, string>,
  field: string,
  relativePath: string
): string {
  const value = frontmatter[field];
  if (!value?.trim()) throw vendorError(relativePath, `${field} must be a non-empty string`);
  return value;
}

function parseBoolean(value: string, field: string, relativePath: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw vendorError(relativePath, `${field} must be true or false`);
}

function parseNumber(value: string, field: string, relativePath: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw vendorError(relativePath, `${field} must be a number`);
  return parsed;
}

function rejectUnsupportedFields(
  frontmatter: Record<string, string>,
  supported: ReadonlySet<string>,
  relativePath: string
): void {
  const unsupported = Object.keys(frontmatter).find((field) => !supported.has(field));
  if (unsupported) throw vendorError(relativePath, `unsupported frontmatter field: ${unsupported}`);
}

const BEADS_CLI_USAGE = `## CLI Usage

**IMPORTANT:** There is no \`bd\` tool in this environment. You must use the \`bash\` tool to run the \`bd\` command.

**Do not try to call a tool named \`bd\` directly.** It does not exist.
**Do not try to call MCP tools (like \`ready\`, \`create\`) directly.** They do not exist.

Instead, use the \`bash\` tool for all beads operations:

- \`bd init [--prefix <prefix>]\` - Initialize beads
- \`bd ready\` - List ready tasks
- \`bd show <id>\` - Show task details
- \`bd create "title" -t bug|feature|task -p 0-4\` - Create issue
- \`bd update <id> --status in_progress\` - Update status
- \`bd close <id> --reason "message"\` - Close issue
- \`bd reopen <id>\` - Reopen issue
- \`bd dep add <from> <to> --type blocks|discovered-from\` - Add dependency
- \`bd list --status open\` - List issues
- \`bd blocked\` - Show blocked issues
- \`bd stats\` - Show statistics

If a tool is not listed above, try \`bd <tool> --help\`.

Use the default command output unless \`--json\` would make a task easier or more reliable. If you parse command output, distinguish parsing errors from command failures.`;

const BEADS_SUBAGENT_CONTEXT = `## Subagent Context

You are called as a subagent. Your **final message** is what gets returned to the calling agent - make it count.

**Your purpose:** Handle both status queries AND autonomous task completion.

**For status/overview requests** ("what's next", "show me blocked work"):
- Run the necessary \`bd\` commands to gather data
- Process the JSON output internally
- Return a **concise, human-readable summary** with key information
- Use tables or lists to organize information clearly
- Example: "You have 3 ready tasks (2 P0, 1 P1), 5 in-progress, and 8 blocked by Epic X"

**For task completion requests** ("complete ready work", "work on issues"):
- Find ready work, claim it, execute it, close it
- Report progress as you work
- End with a summary of what was accomplished

**Critical:** Do NOT dump raw JSON in your final response. Parse it, summarize it, make it useful.`;

export const BEADS_GUIDANCE = `<beads-guidance>
${BEADS_CLI_USAGE}

## Agent Delegation

**Default to the agent.** For ANY beads work involving multiple commands or context gathering, use the \`task\` tool with \`subagent_type: "beads-task-agent"\`:
- Status overviews ("what's next", "what's blocked", "show me progress")
- Exploring the issue graph (ready + in-progress + blocked queries)
- Finding and completing ready work
- Working through multiple issues in sequence
- Any request that would require 2+ bd commands

**Use CLI directly ONLY for single, atomic operations:**
- Creating exactly one issue: \`bd create "title" ...\`
- Closing exactly one issue: \`bd close <id> ...\`
- Updating one specific field: \`bd update <id> --status ...\`
- When user explicitly requests a specific command

**Why delegate?** The agent processes multiple commands internally and returns only a concise summary. Running bd commands directly dumps hundreds of lines of raw JSON into context, wasting tokens and making the conversation harder to follow.
</beads-guidance>`;

export async function loadAgent(vendorDirectory = getVendorDir()): Promise<Config["agent"]> {
  const relativePath = "agents/task-agent.md";
  const paths = await manifestPaths(vendorDirectory);
  if (!paths.includes(relativePath)) {
    throw vendorError("manifest.json", `missing required file record: ${relativePath}`);
  }
  const content = await readVendorFile(vendorDirectory, relativePath);
  const parsed = parseMarkdownWithFrontmatter(content, relativePath);
  const { frontmatter } = parsed;
  rejectUnsupportedFields(frontmatter, AGENT_FRONTMATTER_FIELDS, relativePath);
  if (frontmatter.mode !== undefined && frontmatter.mode !== "subagent") {
    throw vendorError(relativePath, "mode must be subagent when provided");
  }

  const agent: AgentConfig = {
    description: requiredString(frontmatter, "description", relativePath),
    prompt:
      BEADS_CLI_USAGE +
      "\n\n" +
      BEADS_SUBAGENT_CONTEXT +
      "\n\n" +
      adaptVendorPrompt(relativePath, parsed.body),
    mode: "subagent",
  };
  if (frontmatter.model) agent.model = frontmatter.model;
  if (frontmatter.temperature) {
    agent.temperature = parseNumber(frontmatter.temperature, "temperature", relativePath);
  }
  if (frontmatter.top_p) agent.top_p = parseNumber(frontmatter.top_p, "top_p", relativePath);
  if (frontmatter.disable) {
    agent.disable = parseBoolean(frontmatter.disable, "disable", relativePath);
  }
  if (frontmatter.color) agent.color = frontmatter.color;
  if (frontmatter.maxSteps) {
    agent.maxSteps = parseNumber(frontmatter.maxSteps, "maxSteps", relativePath);
  }

  return { "beads-task-agent": agent };
}

export async function loadCommands(vendorDirectory = getVendorDir()): Promise<Config["command"]> {
  const paths = await manifestPaths(vendorDirectory);
  const commandPaths = paths.filter((file) => file.startsWith("commands/") && file.endsWith(".md"));
  if (commandPaths.length === 0) {
    throw vendorError("manifest.json", "no command Markdown files are recorded");
  }
  const commands: Config["command"] = {};

  for (const relativePath of commandPaths) {
    const content = await readVendorFile(vendorDirectory, relativePath);
    if (DOCUMENT_ONLY_COMMANDS.has(relativePath)) continue;
    const parsed = parseMarkdownWithFrontmatter(content, relativePath);
    const { frontmatter } = parsed;
    rejectUnsupportedFields(frontmatter, COMMAND_FRONTMATTER_FIELDS, relativePath);
    const file = path.basename(relativePath);
    const name = `beads:${file.replace(".md", "")}`;

    const argHint = frontmatter["argument-hint"];
    const baseDescription = requiredString(frontmatter, "description", relativePath);
    const description = argHint
      ? `${baseDescription} (${argHint})`
      : baseDescription;

    const command: NonNullable<Config["command"]>[string] = {
      description,
      template: adaptVendorPrompt(relativePath, parsed.body),
    };
    if (frontmatter.agent) command.agent = frontmatter.agent;
    if (frontmatter.model) command.model = frontmatter.model;
    if (frontmatter.subtask) {
      command.subtask = parseBoolean(frontmatter.subtask, "subtask", relativePath);
    }
    commands[name] = command;
  }

  return commands;
}
