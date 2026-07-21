import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { adaptVendorPrompt, adaptedVendorPaths } from "../src/vendor-adaptations";
import { loadAgent, loadCommands } from "../src/vendor";

const expectedAdaptedPaths = [
  "agents/task-agent.md",
  "commands/close.md",
  "commands/create.md",
  "commands/init.md",
  "commands/ready.md",
  "commands/search.md",
  "commands/show.md",
  "commands/stats.md",
  "commands/update.md",
  "commands/version.md",
  "commands/workflow.md",
];

const expectedCommands = [
  "beads:audit",
  "beads:blocked",
  "beads:close",
  "beads:comments",
  "beads:compact",
  "beads:create",
  "beads:decision",
  "beads:delete",
  "beads:dep",
  "beads:epic",
  "beads:export",
  "beads:import",
  "beads:init",
  "beads:label",
  "beads:list",
  "beads:quickstart",
  "beads:ready",
  "beads:rename-prefix",
  "beads:reopen",
  "beads:restore",
  "beads:search",
  "beads:setup",
  "beads:show",
  "beads:stats",
  "beads:sync",
  "beads:update",
  "beads:version",
  "beads:workflow",
];

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
  test("maintains an explicit adaptation and command inventory", async () => {
    expect(adaptedVendorPaths).toEqual(expectedAdaptedPaths);
    expect(Object.keys((await loadCommands()) ?? {}).sort()).toEqual(expectedCommands);
  });

  test("emits only CLI-compatible OpenCode prompts", async () => {
    const commands = (await loadCommands()) ?? {};
    for (const [name, command] of Object.entries(commands)) {
      expect(command.template, name).not.toMatch(unsupportedPattern);
      expect(Object.keys(command).sort(), name).toEqual(["description", "template"]);
    }
    const packageManifest = JSON.parse(await fs.readFile("package.json", "utf8")) as {
      name: string;
      version: string;
    };
    const packageIdentity = `${packageManifest.name}@${packageManifest.version}`;
    const setup = commands["beads:setup"]?.template ?? "";
    for (const invocation of [
      "init",
      "init --global",
      "check",
      "update",
      "remove",
    ]) {
      expect(setup).toContain(`bunx ${packageIdentity} ${invocation}`);
    }
    expect(setup).toContain("package CLI is canonical");
    expect(setup).toContain("`/beads:init` is DB-only");

    const agents = (await loadAgent()) ?? {};
    const taskAgent = agents["beads-task-agent"];
    expect(taskAgent).toBeDefined();
    expect(taskAgent?.prompt).not.toMatch(unsupportedPattern);
    expect(Object.keys(taskAgent ?? {}).sort()).toEqual(["description", "mode", "prompt"]);
    expect(taskAgent?.prompt).toContain("concise human-readable results");
    expect(taskAgent?.prompt).not.toContain("Agent Delegation");
    expect(taskAgent?.prompt?.length).toBeLessThan(500);
  });

  test("rejects missing, duplicated, and uninventoryed source semantics", async () => {
    const ready = await fs.readFile("vendor/commands/ready.md", "utf-8");
    expect(adaptVendorPrompt("commands/ready.md", ready)).toBe(
      adaptVendorPrompt("commands/ready.md", ready)
    );
    expect(() => adaptVendorPrompt("commands/ready.md", ready.replace("MCP server", "CLI"))).toThrow(
      "Expected exactly one adaptation source"
    );
    expect(() => adaptVendorPrompt("commands/ready.md", `${ready}\n${ready}`)).toThrow(
      "Expected exactly one adaptation source"
    );
    expect(() => adaptVendorPrompt("commands/new.md", "Use the MCP server")).toThrow(
      "Unsupported MCP instruction"
    );
    expect(() => adaptVendorPrompt("commands/new.md", "Use the mcp server")).toThrow(
      "Unsupported mcp instruction"
    );
  });

  test("fails with artifact paths for missing and malformed required commands", async () => {
    const missing = await vendorFixture({ "commands/missing.md": "" });
    await fs.rm(path.join(missing, "commands", "missing.md"));
    await expect(loadCommands(missing)).rejects.toThrow("commands/missing.md: cannot read file");

    const malformed = await vendorFixture({
      "commands/broken.md": "description: missing delimiters\n\nbody",
    });
    await expect(loadCommands(malformed)).rejects.toThrow(
      "commands/broken.md: missing or malformed frontmatter delimiters"
    );

    const missingDescription = await vendorFixture({
      "commands/broken.md": "---\nargument-hint: [id]\n---\nbody",
    });
    await expect(loadCommands(missingDescription)).rejects.toThrow(
      "commands/broken.md: description must be a non-empty string"
    );
  });

  test("rejects malformed manifests and unsupported frontmatter", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-beads-vendor-"));
    fixtures.push(directory);
    await fs.writeFile(path.join(directory, "manifest.json"), "not json");
    await expect(loadCommands(directory)).rejects.toThrow("manifest.json: invalid JSON");

    const unsupported = await vendorFixture({
      "commands/custom.md": "---\ndescription: Custom\nunknown: value\n---\nbody",
    });
    await expect(loadCommands(unsupported)).rejects.toThrow(
      "commands/custom.md: unsupported frontmatter field: unknown"
    );
  });

  test("preserves supported command metadata and validates scalar types", async () => {
    const directory = await vendorFixture({
      "commands/custom.md":
        "---\ndescription: Custom command\nargument-hint: [id]\nagent: build\nmodel: provider/model\nsubtask: true\n---\nRun it",
    });

    expect((await loadCommands(directory))?.["beads:custom"]).toEqual({
      description: "Custom command ([id])",
      template: "Run it",
      agent: "build",
      model: "provider/model",
      subtask: true,
    });

    const invalid = await vendorFixture({
      "commands/custom.md": "---\ndescription: Custom\nsubtask: sometimes\n---\nRun it",
    });
    await expect(loadCommands(invalid)).rejects.toThrow(
      "commands/custom.md: subtask must be true or false"
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

    const missing = await vendorFixture({ "commands/custom.md": "---\ndescription: X\n---\nX" });
    await expect(loadAgent(missing)).rejects.toThrow(
      "manifest.json: missing required file record: agents/task-agent.md"
    );
  });
});
