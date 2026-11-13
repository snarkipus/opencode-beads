import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { beadsAgents } from "../src/agents";
import {
  BEADS_TASK_AGENT_DESCRIPTION,
  BEADS_TASK_AGENT_PROMPT,
  beadsGuidance,
  capabilityGuidance,
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
    expect(prompt).toContain("current-state handoff");
    expect(prompt).toContain("--notes");
    expect(prompt).toContain("authorized corrections or clarifications");
    expect(prompt).toContain("oc-beads");
    expect(prompt).toContain("unresolved acceptance or failed validation remains incomplete");
    expect(prompt).toContain("If the parent owns acceptance or closure, return evidence and leave the bead open");
    expect(prompt).toContain("permission denial, cancellation, deliberate stop");
    expect(prompt).toContain("concise results, not raw JSON");
    expect(prompt).not.toContain("Agent Delegation");
    expect(prompt).not.toContain("otherwise choose one highest-priority ready bead");
  });

  test("distinguishes new claims from resumption and parent handoff", () => {
    for (const text of [BEADS_TASK_AGENT_PROMPT, beadsGuidance("primary")]) {
      expect(text).toContain("When starting new work, confirm it is open");
      expect(text).toContain("continue without reopening or claiming it again");
      expect(text).toContain("retains in_progress while qualification or review is outstanding");
    }
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
      expect(guidance).toContain("--append-notes");
      expect(guidance).toContain("--notes");
      expect(guidance).toContain("current-state handoff");
      expect(guidance).toContain("authorized corrections or clarifications");
      expect(guidance).toContain("oc-beads");
      expect(guidance).toContain("Native shell is direct-only");
      expect(guidance).toContain("Do not commit, push, or run Dolt synchronization automatically");
      expect(guidance).toContain("explicit command invocation is the invoking user's bounded request");
      expect(guidance).toContain("incidental automation");
    }
    expect(primary).toContain("through the `subagent` tool");
    expect(primary).toContain("launch handle");
    expect(primary).toContain("later and repeated idle reports");
    expect(primary).toContain("accepted task completion");
    expect(primary).toContain("Host-owned transport");
    expect(primary).not.toContain("normal blocking child return");
    expect(BEADS_TASK_AGENT_PROMPT).toContain("additional background or nested automation");
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

  test("describes composed, direct-leaf, shell, and wholly denied requests separately", () => {
    const composed = capabilityGuidance({ typed: "registered-execute-visible", execute: true, shell: true, direct: false });
    expect(composed).toContain("Beads namespace is registered and execute is visible");
    expect(composed).toContain("Each operation still checks its own permissions");
    expect(composed).toContain("rejected operation is not success");
    expect(composed).toContain("Stop/Cancel");
    expect(composed).toContain("Do not call tools.shell inside execute");

    const direct = capabilityGuidance({ typed: "registered-direct-visible", execute: false, shell: false, direct: true });
    expect(direct).toContain("Native Beads leaf tools are directly visible");
    expect(direct).toContain("Use only the listed direct leaves");
    expect(direct).toContain("rejected operation is not success");
    expect(direct).toContain("Stop/Cancel");

    const shell = capabilityGuidance({ typed: "unavailable", execute: false, shell: true, direct: false });
    expect(shell).toContain("independently available direct shell tool");
    expect(shell).toContain("Shell cannot run inside execute");

    const denied = capabilityGuidance({ typed: "unavailable", execute: false, shell: false, direct: false });
    expect(denied).toContain("Neither native Beads leaves nor direct shell access");
    expect(denied).toContain("do not route around it");
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
