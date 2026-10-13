import type { Plugin } from "@opencode/plugin";
import { BEADS_TASK_AGENT_DESCRIPTION, BEADS_TASK_AGENT_PROMPT } from "./guidance";

export const BEADS_TASK_AGENT = "beads-task-agent";
export const BEADS_TASK_AGENT_LUNA = "beads-task-agent-luna";
export const BEADS_TASK_AGENTS: ReadonlySet<string> = new Set([
  BEADS_TASK_AGENT,
  BEADS_TASK_AGENT_LUNA,
]);

/** Default hard cap on worker steps; a backstop for "one bead, then return", not a target. */
export const DEFAULT_TASK_AGENT_STEPS = 100;

/**
 * Enforce the no-automatic-commit/push/sync policy with OpenCode permissions rather than prompt
 * text alone. Appended after OpenCode's defaults, so these `ask` rules win; compound commands are
 * checked per command, so `cd x && git push` is caught too. Each subcommand has a second rule for
 * global options before it (`git -C dir push`, `bd --json dolt push`). That also asks for a few
 * harmless commands such as `git log --grep push`; asking too often is the safe direction. This is
 * a guardrail against routine sync, not a sandbox: wrappers, aliases, and scripts still bypass it.
 */
export const TASK_AGENT_PERMISSIONS = [
  { action: "shell", resource: "git commit *", effect: "ask" },
  { action: "shell", resource: "git * commit *", effect: "ask" },
  { action: "shell", resource: "git push *", effect: "ask" },
  { action: "shell", resource: "git * push *", effect: "ask" },
  { action: "shell", resource: "bd dolt push *", effect: "ask" },
  { action: "shell", resource: "bd * dolt push *", effect: "ask" },
  { action: "shell", resource: "bd dolt pull *", effect: "ask" },
  { action: "shell", resource: "bd * dolt pull *", effect: "ask" },
  { action: "shell", resource: "bd sync *", effect: "ask" },
  { action: "shell", resource: "bd * sync *", effect: "ask" },
] as const;

/** Routing for the opt-in Luna profile, `provider/model#variant` in OpenCode terms. */
export const LUNA_MODEL = { providerID: "openai", id: "gpt-6-luna", variant: "max" } as const;

export interface BeadsAgentDefinition {
  description: string;
  system: string;
  model?: typeof LUNA_MODEL;
  steps?: number;
}

export interface BeadsAgentOptions {
  /** Register the Luna Max profile alongside the default task agent. */
  luna?: boolean;
  /** Hard cap on worker steps; 0 removes the cap. */
  steps?: number;
}

/** Build the task-agent definitions from plugin options. */
export function beadsAgents(options: BeadsAgentOptions = {}): Record<string, BeadsAgentDefinition> {
  const base: BeadsAgentDefinition = {
    description: BEADS_TASK_AGENT_DESCRIPTION,
    system: BEADS_TASK_AGENT_PROMPT,
  };
  const steps = options.steps ?? DEFAULT_TASK_AGENT_STEPS;
  if (Number.isInteger(steps) && steps > 0) base.steps = steps;
  const agents: Record<string, BeadsAgentDefinition> = { [BEADS_TASK_AGENT]: base };
  if (options.luna) agents[BEADS_TASK_AGENT_LUNA] = { ...base, model: LUNA_MODEL };
  return agents;
}

type AgentEditor = Parameters<Parameters<Plugin.Context["agent"]["transform"]>[0]>[0];

/**
 * Register task agents. `update` creates unknown agents from OpenCode defaults (including the
 * default permission ruleset); user `agents` config entries still override these fields one by one.
 */
export function applyBeadsAgents(
  editor: AgentEditor,
  agents: Record<string, BeadsAgentDefinition>
): void {
  for (const [id, definition] of Object.entries(agents)) {
    editor.update(id, (agent) => {
      // DeepMutable widens branded string IDs into object types; the runtime values are strings.
      agent.name = id as unknown as typeof agent.name;
      agent.description = definition.description;
      agent.system = definition.system;
      agent.mode = "subagent";
      if (definition.model) agent.model = { ...definition.model } as unknown as typeof agent.model;
      if (definition.steps !== undefined) agent.steps = definition.steps;
      agent.permissions = [
        ...(agent.permissions ?? []),
        ...TASK_AGENT_PERMISSIONS.map((rule) => ({ ...rule })),
      ] as unknown as typeof agent.permissions;
    });
  }
}
