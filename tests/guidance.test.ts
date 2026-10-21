import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { beadsAgents } from "../src/agents";
import {
  BEADS_TASK_AGENT_DESCRIPTION,
  BEADS_TASK_AGENT_PROMPT,
  beadsGuidance,
} from "../src/guidance";

const unsupportedPattern = /beads mcp|mcp server|via mcp|\bmcp\b|claude code|\/plugin update beads/i;

describe("project-owned task-agent contract", () => {
  test("describes read-only analysis and execution within an authorized scope", () => {
    expect(BEADS_TASK_AGENT_DESCRIPTION).toContain("authorized task, batch or goal");
    expect(BEADS_TASK_AGENT_DESCRIPTION).toContain("read-only");
    expect(BEADS_TASK_AGENT_DESCRIPTION).not.toMatch(/autonomous|finds and completes ready tasks/i);
    expect(BEADS_TASK_AGENT_DESCRIPTION).not.toMatch(unsupportedPattern);
    expect(beadsAgents()["beads-task-agent"]?.description).toBe(BEADS_TASK_AGENT_DESCRIPTION);
  });

  test("keeps exact assignments bounded while allowing authorized continuation", () => {
    const prompt = BEADS_TASK_AGENT_PROMPT;
    expect(prompt).not.toMatch(unsupportedPattern);
    expect(prompt).toContain("Full `bd prime` workflow context is injected");
    expect(prompt).toContain(
      "For status or graph analysis, never claim, update, close, or modify a bead. Return the analysis and stop."
    );
    expect(prompt).toContain("An exact assignment or explicit one-bead mode ends with that bead");
    expect(prompt).toContain("already-authorized batch or goal");
    expect(prompt).toContain("Readiness is not dispatch permission");
    const showIndex = prompt.indexOf("`bd show <id> --json --sandbox`");
    const claimIndex = prompt.indexOf("`bd update <id> --claim --json --actor='<executor-actor>' --sandbox`");
    expect(showIndex).toBeGreaterThanOrEqual(0);
    expect(claimIndex).toBeGreaterThan(showIndex);
    expect(prompt).toContain(
      "If an assigned bead is closed, blocked, unsuitable, missing, or otherwise not actionable, report and return without mutation or substitution."
    );
    expect(prompt).toContain("claim fails or readback does not confirm your assignment, stop");
    expect(prompt).toContain("Discovery does not add execution authority");
    expect(prompt).toContain("discovered-from:<current-id>");
    expect(prompt).toContain("Append per-bead checkpoints");
    expect(prompt).toContain("unresolved acceptance or failed validation remains incomplete");
    expect(prompt).toContain("If the parent owns acceptance or closure, return evidence and leave the bead open");
    expect(prompt).toContain("permission denial, cancellation, deliberate stop");
    expect(prompt).toContain("concise results, not raw JSON");
    expect(prompt).not.toContain("Agent Delegation");
    expect(prompt).not.toContain("otherwise choose one highest-priority ready bead");
  });

  test("carries executor attribution and separates planning/review acceptance", () => {
    for (const text of [BEADS_TASK_AGENT_PROMPT, beadsGuidance("primary"), BEADS_TASK_AGENT_PROMPT + beadsGuidance("task-agent")]) {
      expect(text).toContain("command-scoped");
      expect(text).toContain("heartbeat");
      expect(text).toContain("created_by");
      expect(text).toContain("owner");
      expect(text).toContain("assignee");
      expect(text).toContain("human Git identity");
      expect(text).toContain("deliberate handoff");

    }
    const planning = readFileSync(new URL("../assets/oc-beads/resources/WORKFLOWS.md", import.meta.url), "utf8");
    expect(planning).toContain("same review item");
    expect(planning).toContain("owner acceptance");
    expect(beadsGuidance("primary")).not.toContain("same review item");
    expect(beadsGuidance("task-agent")).not.toContain("## Executor and work ownership");
  });

  test("shares one guidance layer and adds delegation only for primary agents", () => {
    const primary = beadsGuidance("primary");
    const taskAgent = beadsGuidance("task-agent");
    for (const guidance of [primary, taskAgent]) {
      expect(guidance).toMatch(/^<beads-guidance>\n[\s\S]*\n<\/beads-guidance>$/);
      expect(guidance).toContain("Native shell is direct-only");
      expect(guidance).toContain("Do not commit, push, or run Dolt synchronization automatically");
    }
    expect(primary).toContain("through the `subagent` tool");
    expect(primary).toContain("normal blocking child return");
    expect(primary).toContain("NO_TEXT");
    expect(primary).toContain("actual executor actor");
    expect(primary).not.toMatch(/Delegate multi-command|only single atomic operations/);
    expect(taskAgent).not.toContain("## Delegation");
  });

  test("names OpenCode V2's `shell` tool, not V1's `bash`", () => {
    for (const text of [BEADS_TASK_AGENT_PROMPT, beadsGuidance("primary"), beadsGuidance("task-agent")]) {
      expect(text).toContain("shell");
      expect(text).not.toContain("`bash`");
    }
  });

  test("gives the Luna profile the same prompt and description", () => {
    const agents = beadsAgents({ luna: true });
    expect(agents["beads-task-agent-luna"]).toEqual({
      description: BEADS_TASK_AGENT_DESCRIPTION,
      system: BEADS_TASK_AGENT_PROMPT,
      model: { providerID: "openai", id: "gpt-6-luna", variant: "max" },
      steps: 100,
    });
    expect(Object.keys(beadsAgents())).toEqual(["beads-task-agent"]);
  });
});
