import type { Config } from "@opencode-ai/sdk";
import { BEADS_GUIDANCE, loadAgent, loadCommands } from "./vendor";

const BEADS_TASK_AGENT = "beads-task-agent";

export interface ModelContext {
  providerID: string;
  modelID: string;
}

export interface MessageContext {
  sessionID: string;
  agent?: string;
  model?: ModelContext;
}

export interface SessionMessage {
  info: {
    role: string;
    agent?: string;
    model?: ModelContext;
  };
  parts?: ReadonlyArray<{
    type: string;
    text?: string;
  }>;
}

export interface AgentInfo {
  name: string;
  mode: string;
}

export interface PromptBody {
  noReply: true;
  model?: ModelContext;
  agent?: string;
  parts: Array<{
    type: "text";
    text: string;
    synthetic: true;
  }>;
}

export interface PluginRuntime {
  getMessages(
    directory: string,
    sessionID: string,
    limit?: number
  ): Promise<ReadonlyArray<SessionMessage> | undefined>;
  getAgents(directory: string): Promise<ReadonlyArray<AgentInfo> | undefined>;
  prompt(directory: string, sessionID: string, body: PromptBody): Promise<void>;
  prime(directory: string): Promise<string>;
}

export interface MutablePluginConfig {
  command?: Config["command"];
  agent?: Config["agent"];
}

export interface BeadsController {
  onMessage(message: MessageContext): Promise<void>;
  onCompacted(sessionID: string): Promise<void>;
  configure(config: MutablePluginConfig): void;
}

/** Resolve OpenCode project scope without falling back to the process directory. */
export function resolveProjectDirectory(directory: string, worktree: string): string {
  if (directory.trim()) return directory;
  if (worktree.trim()) return worktree;
  throw new Error("OpenCode did not provide a project directory or worktree");
}

/** Select the newest eligible user context from OpenCode's oldest-first message list. */
function latestSessionContext(messages: ReadonlyArray<SessionMessage> | undefined) {
  if (!messages) return undefined;

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message?.info.role === "user" && message.info.model) {
      return { model: message.info.model, agent: message.info.agent };
    }
  }

  return undefined;
}

/** Create the stateful Beads behavior behind the OpenCode hook adapter. */
export async function createBeadsController(
  runtime: PluginRuntime,
  directory: string
): Promise<BeadsController> {
  const [commands, agents] = await Promise.all([loadCommands(), loadAgent()]);
  const injectedSessions = new Set<string>();
  const injectionAttempts = new Map<string, Promise<void>>();

  async function shouldInject(agentName: string | undefined): Promise<boolean> {
    if (!agentName || agentName === BEADS_TASK_AGENT) return true;

    const availableAgents = await runtime.getAgents(directory).catch(() => undefined);
    const agent = availableAgents?.find((candidate) => candidate.name === agentName);
    return agent ? agent.mode === "primary" || agent.mode === "all" : true;
  }

  async function inject(
    sessionID: string,
    context?: { model?: ModelContext; agent?: string }
  ): Promise<boolean> {
    try {
      const primeOutput = await runtime.prime(directory);
      if (!primeOutput?.trim()) return false;

      await runtime.prompt(directory, sessionID, {
        noReply: true,
        model: context?.model,
        agent: context?.agent,
        parts: [
          {
            type: "text",
            text: `<beads-context>\n${primeOutput.trim()}\n</beads-context>\n\n${BEADS_GUIDANCE}`,
            synthetic: true,
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  async function performInitialInjection(message: MessageContext): Promise<void> {
    if (!(await shouldInject(message.agent))) {
      injectedSessions.add(message.sessionID);
      return;
    }

    try {
      const existing = await runtime.getMessages(directory, message.sessionID);
      const hasBeadsContext = existing?.some((item) =>
        item.parts?.some(
          (part) => part.type === "text" && part.text?.includes("<beads-context>")
        )
      );
      if (hasBeadsContext) {
        injectedSessions.add(message.sessionID);
        return;
      }
    } catch {
      // Message lookup is advisory; injection remains the safe fallback.
    }

    if (await inject(message.sessionID, message)) {
      injectedSessions.add(message.sessionID);
    }
  }

  return {
    async onMessage(message) {
      if (injectedSessions.has(message.sessionID)) return;

      const pending = injectionAttempts.get(message.sessionID);
      if (pending) return pending;

      const attempt = performInitialInjection(message);
      injectionAttempts.set(message.sessionID, attempt);
      try {
        await attempt;
      } finally {
        if (injectionAttempts.get(message.sessionID) === attempt) {
          injectionAttempts.delete(message.sessionID);
        }
      }
    },

    async onCompacted(sessionID) {
      const context = latestSessionContext(
        await runtime.getMessages(directory, sessionID, 50).catch(() => undefined)
      );
      if (await shouldInject(context?.agent)) {
        await inject(sessionID, context);
      }
    },

    configure(config) {
      config.command = { ...config.command, ...commands };
      config.agent = { ...config.agent, ...agents };
    },
  };
}
