import { describe, expect, test } from "bun:test";
import { beadsAgents } from "../src/agents";
import {
  BEADS_TASK_AGENT_DESCRIPTION,
  BEADS_TASK_AGENT_PROMPT,
  beadsGuidance,
} from "../src/guidance";

const unsupportedPattern = /beads mcp|mcp server|via mcp|\bmcp\b|claude code|\/plugin update beads/i;

describe("fork-owned task-agent contract", () => {
  test("describes the bounded one-bead worker, not upstream's autonomous loop", () => {
    expect(BEADS_TASK_AGENT_DESCRIPTION).toContain("exactly one bead per invocation");
    expect(BEADS_TASK_AGENT_DESCRIPTION).not.toMatch(/autonomous|finds and completes ready tasks/i);
    expect(BEADS_TASK_AGENT_DESCRIPTION).not.toMatch(unsupportedPattern);
    expect(beadsAgents()["beads-task-agent"]?.description).toBe(BEADS_TASK_AGENT_DESCRIPTION);
  });

  test("keeps the bounded workflow in a compact CLI-only prompt", () => {
    const prompt = BEADS_TASK_AGENT_PROMPT;
    expect(prompt).not.toMatch(unsupportedPattern);
    expect(prompt).toContain("Full `bd prime` workflow context is injected");
    expect(prompt).toContain(
      "For status or graph analysis, never claim, update, close, or modify a bead. Return the analysis and stop."
    );
    expect(prompt).toContain("For completion, process exactly one bead.");
    expect(prompt).toContain("Use a caller-supplied ID; otherwise choose one highest-priority ready bead.");
    expect(prompt).toContain("confirm it is open, actionable, and appropriate; then claim");
    const showIndex = prompt.indexOf("`bd show <id> --json`");
    const claimIndex = prompt.indexOf("`bd update <id> --claim --json`");
    expect(showIndex).toBeGreaterThanOrEqual(0);
    expect(claimIndex).toBeGreaterThan(showIndex);
    expect(prompt).toContain(
      "If an assigned bead is closed, blocked, unsuitable, missing, or otherwise not actionable, report and return without mutation or substitution."
    );
    expect(prompt).toContain("Create discoveries with `discovered-from:<current-id>`");
    expect(prompt).toContain("a parent only when structurally obvious");
    expect(prompt).toContain(
      "Never claim or implement work created this invocation; it may be eligible later."
    );
    expect(prompt).toContain(
      "Close or block the current bead, report discoveries, and return without seeking more work."
    );
    expect(prompt).toContain("concise results, not raw JSON");
    expect(prompt).not.toContain("Agent Delegation");
    expect(prompt.length).toBeLessThan(1_000);
  });

  test("shares one guidance layer and adds delegation only for primary agents", () => {
    const primary = beadsGuidance("primary");
    const taskAgent = beadsGuidance("task-agent");
    for (const guidance of [primary, taskAgent]) {
      expect(guidance).toMatch(/^<beads-guidance>\n[\s\S]*\n<\/beads-guidance>$/);
      expect(guidance).toContain("Run `bd` through `bash`");
      expect(guidance).toContain("Do not commit, push, or run Dolt synchronization automatically");
    }
    expect(primary).toContain("through the `subagent` tool");
    expect(taskAgent).not.toContain("## Delegation");
  });

  test("gives the Luna profile the same prompt and description", () => {
    const agents = beadsAgents({ luna: true });
    expect(agents["beads-task-agent-luna"]).toEqual({
      description: BEADS_TASK_AGENT_DESCRIPTION,
      system: BEADS_TASK_AGENT_PROMPT,
      model: { providerID: "openai", id: "gpt-6-luna", variant: "max" },
    });
    expect(Object.keys(beadsAgents())).toEqual(["beads-task-agent"]);
  });
});
