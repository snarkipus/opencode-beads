/** OpenCode adapter for the Beads issue tracker. */

import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Agent, Part, SessionMessagesResponse } from "@opencode-ai/sdk";
import {
  createBeadsController,
  resolveProjectDirectory,
  type PluginRuntime,
} from "./plugin-core";
import { runBdPrime } from "./prime";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSessionMessage(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !isRecord(value.info) ||
    (value.info.role !== "user" && value.info.role !== "assistant") ||
    (value.info.agent !== undefined && typeof value.info.agent !== "string") ||
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
      (part.text === undefined || typeof part.text === "string")
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
      part.text.includes("<beads-context>")
  );
}

/** Adapt the official OpenCode client to the controller's small deterministic boundary. */
export function createOpenCodeRuntime(client: PluginInput["client"]): PluginRuntime {
  return {
    async getMessages(projectDirectory, sessionID, limit) {
      const response = await client.session.messages({
        path: { id: sessionID },
        query: { directory: projectDirectory, limit },
      });
      if (response.error !== undefined) throw response.error;
      if (!Array.isArray(response.data) || !response.data.every(isSessionMessage)) {
        throw new Error("OpenCode returned malformed session messages");
      }
      return response.data satisfies SessionMessagesResponse;
    },

    async getAgents(projectDirectory) {
      const response = await client.app.agents({ query: { directory: projectDirectory } });
      if (response.error !== undefined) throw response.error;
      if (!Array.isArray(response.data) || !response.data.every(isAgent)) {
        throw new Error("OpenCode returned malformed agents");
      }
      return response.data satisfies Agent[];
    },

    async prompt(projectDirectory, sessionID, body) {
      const response = await client.session.prompt({
        path: { id: sessionID },
        query: { directory: projectDirectory },
        body,
      });
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
      const response = await client.app.log({
        query: { directory: diagnostic.directory },
        body: {
          service: "opencode-beads",
          level: "warn",
          message: diagnostic.code,
          extra,
        },
      });
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

      await controller.onMessage({
        sessionID: input.sessionID,
        model: input.model,
        agent: input.agent,
      });
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
