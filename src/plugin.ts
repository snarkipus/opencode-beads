/** OpenCode adapter for the Beads issue tracker. */

import type { Plugin } from "@opencode-ai/plugin";
import {
  createBeadsController,
  resolveProjectDirectory,
  type PluginRuntime,
} from "./plugin-core";

export const BeadsPlugin: Plugin = async ({ client, $, directory, worktree }) => {
  const projectDirectory = resolveProjectDirectory(directory, worktree);
  const runtime: PluginRuntime = {
    async getMessages(projectDirectory, sessionID, limit) {
      const response = await client.session.messages({
        path: { id: sessionID },
        query: { directory: projectDirectory, limit },
      });
      return response.data;
    },

    async getAgents(projectDirectory) {
      const response = await client.app.agents({ query: { directory: projectDirectory } });
      return response.data;
    },

    async prompt(projectDirectory, sessionID, body) {
      await client.session.prompt({
        path: { id: sessionID },
        query: { directory: projectDirectory },
        body,
      });
    },

    async prime(projectDirectory) {
      return $`bd prime`.cwd(projectDirectory).text();
    },
  };

  const controller = await createBeadsController(runtime, projectDirectory);

  return {
    "chat.message": async (_input, output) => {
      await controller.onMessage({
        sessionID: output.message.sessionID,
        model: output.message.model,
        agent: output.message.agent,
      });
    },

    event: async ({ event }) => {
      if (event.type === "session.compacted") {
        await controller.onCompacted(event.properties.sessionID);
      }
    },

    config: async (config) => {
      controller.configure(config);
    },
  };
};
