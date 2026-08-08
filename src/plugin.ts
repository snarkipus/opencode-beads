/** OpenCode adapter for the Beads issue tracker. */

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Agent, Part, SessionMessagesResponse } from "@opencode-ai/sdk";
import {
  createBeadsController,
  isBeadsContextEnvelope,
  resolveProjectDirectory,
  type PluginRuntime,
} from "./plugin-core";
import { runBdPrime } from "./prime";

export const DEFAULT_OPENCODE_REQUEST_TIMEOUT_MS = 5_000;
export const DEFAULT_OPENCODE_DIAGNOSTIC_TIMEOUT_MS = 1_000;

export class OpenCodeTimeoutError extends Error {
  constructor(readonly operation: string, readonly timeoutMs: number) {
    super(`OpenCode ${operation} timed out after ${timeoutMs}ms`);
    this.name = "OpenCodeTimeoutError";
  }
}

export interface OpenCodeRuntimeOptions {
  requestTimeoutMs?: number;
  diagnosticTimeoutMs?: number;
}

async function withDeadline<T>(
  operation: string,
  timeoutMs: number,
  execute: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  let rejectTimeout: (error: OpenCodeTimeoutError) => void = () => {};
  const timeout = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject;
  });
  const timer = setTimeout(() => {
    const error = new OpenCodeTimeoutError(operation, timeoutMs);
    controller.abort(error);
    rejectTimeout(error);
  }, timeoutMs);

  try {
    return await Promise.race([execute(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSessionMessage(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !isRecord(value.info) ||
    (value.info.role !== "user" && value.info.role !== "assistant") ||
    (value.info.agent !== undefined && typeof value.info.agent !== "string") ||
    (value.info.system !== undefined && typeof value.info.system !== "string") ||
    (value.info.model !== undefined &&
      (!isRecord(value.info.model) ||
        typeof value.info.model.providerID !== "string" ||
        typeof value.info.model.modelID !== "string"))
  ) {
    return false;
  }
  if (!Array.isArray(value.parts)) return false;

  return value.parts.every(
    (part) =>
      isRecord(part) &&
      typeof part.type === "string" &&
      (part.text === undefined || typeof part.text === "string") &&
      (part.synthetic === undefined || typeof part.synthetic === "boolean")
  );
}

function isAgent(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    (value.mode === "subagent" || value.mode === "primary" || value.mode === "all")
  );
}

/** Prevent the synthetic no-reply prompt from recursively triggering its own injection. */
function isBeadsContextInjection(parts: ReadonlyArray<Part>): boolean {
  return parts.some(
    (part) =>
      part.type === "text" &&
      part.synthetic === true &&
      isBeadsContextEnvelope(part.text)
  );
}

/** Adapt the official OpenCode client to the controller's small deterministic boundary. */
export function createOpenCodeRuntime(
  client: PluginInput["client"],
  options: OpenCodeRuntimeOptions = {}
): PluginRuntime {
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_OPENCODE_REQUEST_TIMEOUT_MS;
  const diagnosticTimeoutMs =
    options.diagnosticTimeoutMs ?? DEFAULT_OPENCODE_DIAGNOSTIC_TIMEOUT_MS;

  return {
    async getMessages(projectDirectory, sessionID, limit) {
      const response = await withDeadline("session.messages", requestTimeoutMs, (signal) =>
        client.session.messages({
          path: { id: sessionID },
          query: { directory: projectDirectory, limit },
          signal,
        })
      );
      if (response.error !== undefined) throw response.error;
      if (!Array.isArray(response.data) || !response.data.every(isSessionMessage)) {
        throw new Error("OpenCode returned malformed session messages");
      }
      return response.data satisfies SessionMessagesResponse;
    },

    async getAgents(projectDirectory) {
      const response = await withDeadline("app.agents", requestTimeoutMs, (signal) =>
        client.app.agents({ query: { directory: projectDirectory }, signal })
      );
      if (response.error !== undefined) throw response.error;
      if (!Array.isArray(response.data) || !response.data.every(isAgent)) {
        throw new Error("OpenCode returned malformed agents");
      }
      return response.data satisfies Agent[];
    },

    async prompt(projectDirectory, sessionID, body) {
      const response = await withDeadline("session.prompt", requestTimeoutMs, (signal) =>
        client.session.prompt({
          path: { id: sessionID },
          query: { directory: projectDirectory },
          body,
          signal,
        })
      );
      if (response.error !== undefined) throw response.error;
      if (response.data === undefined) throw new Error("OpenCode returned no prompt result");
    },

    async prime(projectDirectory) {
      return runBdPrime(projectDirectory);
    },

    async diagnose(diagnostic) {
      const extra =
        diagnostic.code === "config_collision"
          ? { surface: diagnostic.surface, names: diagnostic.names }
          : { sessionID: diagnostic.sessionID };
      const response = await withDeadline("app.log", diagnosticTimeoutMs, (signal) =>
        client.app.log({
          query: { directory: diagnostic.directory },
          body: {
            service: "opencode-beads",
            level: "warn",
            message: diagnostic.code,
            extra,
          },
          signal,
        })
      );
      if (response.error !== undefined) throw response.error;
      if (response.data === undefined) throw new Error("OpenCode returned no log result");
    },
  };
}

export const BeadsPlugin: Plugin = async ({ client, directory, worktree }) => {
  const projectDirectory = resolveProjectDirectory(directory, worktree);
  const runtime = createOpenCodeRuntime(client);

  const controller = await createBeadsController(runtime, projectDirectory);

  return {
    "chat.message": async (input, output) => {
      if (isBeadsContextInjection(output.parts)) return;

      await controller.onMessage(
        {
          sessionID: input.sessionID,
          model: input.model,
          agent: input.agent,
        },
        (context) => {
          output.message.system = output.message.system
            ? `${output.message.system}\n\n${context}`
            : context;
        }
      );
    },

    event: async ({ event }) => {
      if (event.type === "session.compacted") {
        await controller.onCompacted(event.properties.sessionID);
      }
    },

    config: async (config) => {
      await controller.configure(config);
    },
  };
};
