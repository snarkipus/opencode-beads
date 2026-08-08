import type { Hooks } from "@opencode-ai/plugin";
import type {
  Agent,
  SessionMessagesResponse,
  SessionPromptData,
  TextPart,
  TextPartInput,
  UserMessage,
} from "@opencode-ai/sdk";
import { PrimeTimeoutError } from "./prime";
import { beadsGuidance, loadAgent, loadCommands } from "./vendor";

const BEADS_TASK_AGENT = "beads-task-agent";

type ChatMessageInput = Parameters<NonNullable<Hooks["chat.message"]>>[0];
type SessionMessageResponse = SessionMessagesResponse[number];
type SessionPromptBody = NonNullable<SessionPromptData["body"]>;

export type ModelContext = NonNullable<ChatMessageInput["model"]>;
export type MessageContext = Pick<ChatMessageInput, "sessionID" | "agent" | "model">;
export type ContextSink = (context: string) => void | Promise<void>;

// The controller only needs this projection; the OpenCode adapter validates the full response.
export type SessionMessage = {
  info: Pick<SessionMessageResponse["info"], "role"> &
    Partial<Pick<UserMessage, "agent" | "model" | "system">>;
  parts?: ReadonlyArray<
    Pick<SessionMessageResponse["parts"][number], "type"> &
      Partial<Pick<TextPart, "text" | "synthetic">>
  >;
};

export type AgentInfo = Pick<Agent, "name" | "mode">;

export type PromptBody = Omit<SessionPromptBody, "noReply" | "parts"> & {
  noReply: true;
  parts: Array<TextPartInput & { synthetic: true }>;
};

export interface PluginRuntime {
  getMessages(
    directory: string,
    sessionID: string,
    limit?: number
  ): Promise<ReadonlyArray<SessionMessage> | undefined>;
  getAgents(directory: string): Promise<ReadonlyArray<AgentInfo> | undefined>;
  prompt(directory: string, sessionID: string, body: PromptBody): Promise<void>;
  prime(directory: string): Promise<string>;
  diagnose(diagnostic: PluginDiagnostic): Promise<void>;
}

export type DiagnosticCode =
  | "agents_lookup_failed"
  | "config_collision"
  | "messages_lookup_failed"
  | "prime_failed"
  | "prime_timeout"
  | "prompt_failed";

export type PluginDiagnostic =
  | {
      code: Exclude<DiagnosticCode, "config_collision">;
      directory: string;
      sessionID: string;
    }
  | {
      code: "config_collision";
      directory: string;
      surface: "agent" | "command";
      names: string[];
    };

export interface ControllerOptions {
  diagnosticIntervalMs?: number;
  now?: () => number;
}

export type MutablePluginConfig = Parameters<NonNullable<Hooks["config"]>>[0];

export interface BeadsController {
  onMessage(message: MessageContext, sink: ContextSink): Promise<void>;
  onCompacted(sessionID: string): Promise<void>;
  onSessionDeleted(sessionID: string): void;
  configure(config: MutablePluginConfig): Promise<void>;
}

type InjectionAudience = "primary" | "task-agent";
const BEADS_CONTEXT_HEADER = /^<beads-context(?: audience="(primary|task-agent)")?>\n/;

/** Recognize only the complete envelope emitted by this plugin. */
export function isBeadsContextEnvelope(text: string): boolean {
  const trimmed = text.trim();
  return BEADS_CONTEXT_HEADER.test(trimmed) && trimmed.includes("\n</beads-context>");
}

function beadsContextAudience(text: string): InjectionAudience | undefined {
  const audience = text.trim().match(BEADS_CONTEXT_HEADER)?.[1];
  return audience === "primary" || audience === "task-agent" ? audience : undefined;
}

function injectionAudience(agentName: string | undefined): InjectionAudience {
  return agentName === BEADS_TASK_AGENT ? "task-agent" : "primary";
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
  directory: string,
  options: ControllerOptions = {}
): Promise<BeadsController> {
  const [loadedCommands, loadedAgents] = await Promise.all([loadCommands(), loadAgent()]);
  const commands = loadedCommands ?? {};
  const agents = loadedAgents ?? {};
  const injectedAudiences = new Map<string, Set<InjectionAudience>>();
  const injectionAttempts = new Map<string, { promise: Promise<void>; cancelled: boolean }>();
  const diagnosticTimes = new Map<string, number>();
  const diagnosticIntervalMs = options.diagnosticIntervalMs ?? 60_000;
  const now = options.now ?? Date.now;

  async function diagnose(diagnostic: PluginDiagnostic, key: string): Promise<void> {
    const currentTime = now();
    const previousTime = diagnosticTimes.get(key);
    if (previousTime !== undefined && currentTime - previousTime < diagnosticIntervalMs) return;

    diagnosticTimes.set(key, currentTime);
    void Promise.resolve()
      .then(() => runtime.diagnose(diagnostic))
      .catch(() => undefined);
  }

  async function diagnoseSession(
    code: Exclude<DiagnosticCode, "config_collision">,
    sessionID: string
  ): Promise<void> {
    await diagnose({ code, directory, sessionID }, `${code}:${sessionID}`);
  }

  async function shouldInject(
    agentName: string | undefined,
    sessionID: string
  ): Promise<boolean> {
    if (!agentName || agentName === BEADS_TASK_AGENT) return true;

    const availableAgents = await runtime.getAgents(directory).catch(async () => {
      await diagnoseSession("agents_lookup_failed", sessionID);
      return undefined;
    });
    const agent = availableAgents?.find((candidate) => candidate.name === agentName);
    return agent ? agent.mode === "primary" || agent.mode === "all" : true;
  }

  async function renderContext(
    sessionID: string,
    context?: { model?: ModelContext; agent?: string }
  ): Promise<string | undefined> {
    let output: string;
    try {
      output = (await runtime.prime(directory)).trim();
    } catch (error) {
      const code = error instanceof PrimeTimeoutError ? "prime_timeout" : "prime_failed";
      await diagnoseSession(code, sessionID);
      return undefined;
    }
    if (!output) return undefined;

    const audience = injectionAudience(context?.agent);
    return `<beads-context audience="${audience}">\n${output}\n</beads-context>\n\n${beadsGuidance(audience)}`;
  }

  function markInjected(sessionID: string, audience: InjectionAudience): void {
    const audiences = injectedAudiences.get(sessionID) ?? new Set<InjectionAudience>();
    audiences.add(audience);
    injectedAudiences.set(sessionID, audiences);
  }

  async function injectPrompt(
    sessionID: string,
    context?: { model?: ModelContext; agent?: string }
  ): Promise<boolean> {
    const rendered = await renderContext(sessionID, context);
    if (!rendered) return false;

    try {
      await runtime.prompt(directory, sessionID, {
        noReply: true,
        model: context?.model,
        agent: context?.agent,
        parts: [
          {
            type: "text",
            text: rendered,
            synthetic: true,
          },
        ],
      });
      return true;
    } catch {
      await diagnoseSession("prompt_failed", sessionID);
      return false;
    }
  }

  async function performInitialInjection(
    message: MessageContext,
    sink: ContextSink,
    isActive: () => boolean
  ): Promise<void> {
    if (!(await shouldInject(message.agent, message.sessionID))) return;

    const audience = injectionAudience(message.agent);
    const knownAudiences = injectedAudiences.get(message.sessionID);
    if (knownAudiences?.has(audience)) return;

    // On plugin reload there is no local audience state, so consult persisted envelopes.
    if (!knownAudiences) {
      try {
        const existing = await runtime.getMessages(directory, message.sessionID);
        const hasBeadsContext = existing?.some(
          (item) =>
            (item.info.system !== undefined &&
              beadsContextAudience(item.info.system) === audience) ||
            item.parts?.some(
              (part) =>
                part.type === "text" &&
                part.synthetic === true &&
                part.text !== undefined &&
                beadsContextAudience(part.text) === audience
            )
        );
        if (hasBeadsContext) {
          if (isActive()) markInjected(message.sessionID, audience);
          return;
        }
      } catch {
        await diagnoseSession("messages_lookup_failed", message.sessionID);
        // Message lookup is advisory; injection remains the safe fallback.
      }
    }

    const rendered = await renderContext(message.sessionID, message);
    if (!rendered) return;

    try {
      await sink(rendered);
      if (isActive()) markInjected(message.sessionID, audience);
    } catch {
      await diagnoseSession("prompt_failed", message.sessionID);
    }
  }

  return {
    async onMessage(message, sink) {
      const audience = injectionAudience(message.agent);
      if (injectedAudiences.get(message.sessionID)?.has(audience)) return;

      const attemptKey = `${message.sessionID}\0${audience}`;
      const pending = injectionAttempts.get(attemptKey);
      if (pending) return pending.promise;

      const attempt = { promise: Promise.resolve(), cancelled: false };
      attempt.promise = performInitialInjection(message, sink, () => !attempt.cancelled);
      injectionAttempts.set(attemptKey, attempt);
      try {
        await attempt.promise;
      } finally {
        if (injectionAttempts.get(attemptKey) === attempt) {
          injectionAttempts.delete(attemptKey);
        }
      }
    },

    async onCompacted(sessionID) {
      const messages = await runtime.getMessages(directory, sessionID, 50).catch(async () => {
        await diagnoseSession("messages_lookup_failed", sessionID);
        return undefined;
      });
      const context = latestSessionContext(messages);
      if (await shouldInject(context?.agent, sessionID)) {
        await injectPrompt(sessionID, context);
      }
    },

    onSessionDeleted(sessionID) {
      injectedAudiences.delete(sessionID);
      for (const [key, attempt] of injectionAttempts) {
        if (key.startsWith(`${sessionID}\0`)) {
          attempt.cancelled = true;
          injectionAttempts.delete(key);
        }
      }
      for (const key of diagnosticTimes.keys()) {
        if (key.endsWith(`:${sessionID}`)) diagnosticTimes.delete(key);
      }
    },

    async configure(config) {
      const commandCollisions = Object.keys(config.command ?? {})
        .filter(
          (name) =>
            Object.hasOwn(commands, name) && config.command?.[name] !== commands[name]
        )
        .sort();
      const agentCollisions = Object.keys(config.agent ?? {})
        .filter(
          (name) => Object.hasOwn(agents, name) && config.agent?.[name] !== agents[name]
        )
        .sort();

      await Promise.all(
        ([
          ["command", commandCollisions],
          ["agent", agentCollisions],
        ] as const).map(async ([surface, names]) => {
          if (names.length === 0) return;
          await diagnose(
            { code: "config_collision", directory, surface, names },
            `config_collision:${surface}:${names.join("\0")}`
          );
        })
      );

      config.command = { ...commands, ...config.command };
      config.agent = { ...agents, ...config.agent };
    },
  };
}
