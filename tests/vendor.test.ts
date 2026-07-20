import * as fs from "node:fs/promises";
import { describe, expect, test } from "bun:test";
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
  "beads:show",
  "beads:stats",
  "beads:sync",
  "beads:update",
  "beads:version",
  "beads:workflow",
];

const unsupportedPattern = /beads mcp|mcp server|via mcp|claude code|\/plugin update beads/i;

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

    const agents = (await loadAgent()) ?? {};
    const taskAgent = agents["beads-task-agent"];
    expect(taskAgent).toBeDefined();
    expect(taskAgent?.prompt).not.toMatch(unsupportedPattern);
    expect(Object.keys(taskAgent ?? {}).sort()).toEqual(["description", "mode", "prompt"]);
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
});
