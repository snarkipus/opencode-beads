import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { adaptVendorPrompt, adaptedVendorPaths } from "../src/vendor-adaptations";
import { loadAgent } from "../src/vendor";

const unsupportedPattern = /beads mcp|mcp server|via mcp|claude code|\/plugin update beads/i;
const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => fs.rm(fixture, { recursive: true })));
});

async function vendorFixture(files: Record<string, string>): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-beads-vendor-"));
  fixtures.push(directory);
  const paths = Object.keys(files).sort();
  await fs.writeFile(
    path.join(directory, "manifest.json"),
    JSON.stringify({ files: paths.map((file) => ({ path: file })) })
  );
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(directory, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  return directory;
}

describe("vendor prompt adaptations", () => {
  test("maintains an explicit adaptation inventory of only the task agent", async () => {
    expect(adaptedVendorPaths).toEqual(["agents/task-agent.md"]);
    expect((await fs.readdir("vendor")).sort()).toEqual(["agents", "manifest.json"]);
  });

  test("emits only CLI-compatible OpenCode prompts", async () => {
    const agents = (await loadAgent()) ?? {};
    const taskAgent = agents["beads-task-agent"];
    expect(taskAgent).toBeDefined();
    expect(taskAgent?.prompt).not.toMatch(unsupportedPattern);
    expect(Object.keys(taskAgent ?? {}).sort()).toEqual(["description", "mode", "prompt"]);
    expect(taskAgent?.prompt).toContain("Full `bd prime` workflow context is injected");
    expect(taskAgent?.prompt).toContain(
      "For status or graph analysis, never claim, update, close, or modify a bead. Return the analysis and stop."
    );
    expect(taskAgent?.prompt).toContain("For completion, process exactly one bead.");
    expect(taskAgent?.prompt).toContain(
      "Use a caller-supplied ID; otherwise choose one highest-priority ready bead."
    );
    expect(taskAgent?.prompt).toContain("`bd show <id> --json`");
    expect(taskAgent?.prompt).toContain(
      "confirm it is open, actionable, and appropriate; then claim"
    );
    expect(taskAgent?.prompt).toContain("`bd update <id> --claim --json`");
    const showIndex = taskAgent?.prompt?.indexOf("`bd show <id> --json`") ?? -1;
    const claimIndex =
      taskAgent?.prompt?.indexOf("`bd update <id> --claim --json`") ?? -1;

    expect(showIndex).toBeGreaterThanOrEqual(0);
    expect(claimIndex).toBeGreaterThan(showIndex);
    expect(taskAgent?.prompt).toContain(
      "If an assigned bead is closed, blocked, unsuitable, missing, or otherwise not actionable, report and return without mutation or substitution."
    );
    expect(taskAgent?.prompt).toContain(
      "Create discoveries with `discovered-from:<current-id>`"
    );
    expect(taskAgent?.prompt).toContain("a parent only when structurally obvious");
    expect(taskAgent?.prompt).toContain(
      "Never claim or implement work created this invocation; it may be eligible later."
    );
    expect(taskAgent?.prompt).toContain(
      "Close or block the current bead, report discoveries, and return without seeking more work."
    );
    expect(taskAgent?.prompt).toContain("concise results, not raw JSON");
    expect(taskAgent?.prompt).not.toContain("Agent Delegation");
    expect(taskAgent?.prompt?.length).toBeLessThan(1_000);
  });

  test("rejects missing, duplicated, and uninventoryed source semantics", async () => {
    const agent = await fs.readFile("vendor/agents/task-agent.md", "utf-8");
    expect(adaptVendorPrompt("agents/task-agent.md", agent)).toBe(
      adaptVendorPrompt("agents/task-agent.md", agent)
    );
    expect(() =>
      adaptVendorPrompt("agents/task-agent.md", agent.replace("Use the `ready` MCP tool", "Use ready"))
    ).toThrow("Expected exactly one adaptation source");
    expect(() => adaptVendorPrompt("agents/task-agent.md", `${agent}\n${agent}`)).toThrow(
      "Expected exactly one adaptation source"
    );
    expect(() => adaptVendorPrompt("agents/new.md", "Use the MCP server")).toThrow(
      "Unsupported MCP instruction"
    );
    expect(() => adaptVendorPrompt("agents/new.md", "Use the mcp server")).toThrow(
      "Unsupported mcp instruction"
    );
  });

  test("fails with artifact paths for missing and malformed task agents", async () => {
    const missing = await vendorFixture({ "agents/task-agent.md": "" });
    await fs.rm(path.join(missing, "agents", "task-agent.md"));
    await expect(loadAgent(missing)).rejects.toThrow("agents/task-agent.md: cannot read file");

    const malformed = await vendorFixture({
      "agents/task-agent.md": "description: missing delimiters\n\nbody",
    });
    await expect(loadAgent(malformed)).rejects.toThrow(
      "agents/task-agent.md: missing or malformed frontmatter delimiters"
    );

    const missingDescription = await vendorFixture({
      "agents/task-agent.md": "---\nmode: subagent\n---\nbody",
    });
    await expect(loadAgent(missingDescription)).rejects.toThrow(
      "agents/task-agent.md: description must be a non-empty string"
    );
  });

  test("rejects malformed manifests and unsupported frontmatter", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-beads-vendor-"));
    fixtures.push(directory);
    await fs.writeFile(path.join(directory, "manifest.json"), "not json");
    await expect(loadAgent(directory)).rejects.toThrow("manifest.json: invalid JSON");

    const unsupported = await vendorFixture({
      "agents/task-agent.md": "---\ndescription: Custom\nunknown: value\n---\nbody",
    });
    await expect(loadAgent(unsupported)).rejects.toThrow(
      "agents/task-agent.md: unsupported frontmatter field: unknown"
    );
  });

  test("requires and preserves supported task-agent metadata", async () => {
    const source = await fs.readFile("vendor/agents/task-agent.md", "utf8");
    const withMetadata = source.replace(
      "description: Autonomous agent that finds and completes ready tasks",
      "description: Autonomous agent that finds and completes ready tasks\nmodel: provider/model\ntemperature: 0.2\ndisable: false\ncolor: '#123456'\nmaxSteps: 12"
    );
    const directory = await vendorFixture({ "agents/task-agent.md": withMetadata });

    const agent = (await loadAgent(directory))?.["beads-task-agent"];
    expect(agent).toMatchObject({
      model: "provider/model",
      temperature: 0.2,
      disable: false,
      color: "#123456",
      maxSteps: 12,
      mode: "subagent",
    });

    const missing = await vendorFixture({ "agents/other.md": "---\ndescription: X\n---\nX" });
    await expect(loadAgent(missing)).rejects.toThrow(
      "manifest.json: missing required file record: agents/task-agent.md"
    );
  });
});
