import type { Plugin } from "@opencode/plugin";
import { loadAgent } from "./vendor";

export const BEADS_TASK_AGENT = "beads-task-agent";
export const BEADS_TASK_AGENT_LUNA = "beads-task-agent-luna";
export const BEADS_TASK_AGENTS: ReadonlySet<string> = new Set([
  BEADS_TASK_AGENT,
  BEADS_TASK_AGENT_LUNA,
]);

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
}

// V1 frontmatter fields with no V2 Agent.Info equivalent; reject rather than silently drop.
const UNMAPPED_AGENT_FIELDS = ["temperature", "top_p", "color", "model", "disable"] as const;

/** Build the task-agent definitions from the vendored artifact and plugin options. */
export async function loadBeadsAgents(
  options: BeadsAgentOptions = {}
): Promise<Record<string, BeadsAgentDefinition>> {
  const vendored = (await loadAgent())?.[BEADS_TASK_AGENT];
  if (!vendored?.description || !vendored.prompt) {
    throw new Error("Vendored beads task agent is missing its description or prompt");
  }
  const unmapped = UNMAPPED_AGENT_FIELDS.filter((field) => vendored[field] !== undefined);
  if (unmapped.length > 0) {
    throw new Error(`Vendored beads task agent sets unsupported V2 fields: ${unmapped.join(", ")}`);
  }

  const base: BeadsAgentDefinition = {
    description: vendored.description,
    system: vendored.prompt,
  };
  if (vendored.maxSteps !== undefined) base.steps = vendored.maxSteps;

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
    });
  }
}
