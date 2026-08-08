/** OpenCode adapter for the Beads issue tracker. */

import type { Plugin } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";
import {
  createBeadsController,
  isBeadsContextEnvelope,
  resolveProjectDirectory,
} from "./plugin-core";
import { createOpenCodeRuntime } from "./opencode-runtime";

/** Prevent the synthetic no-reply prompt from recursively triggering its own injection. */
function isBeadsContextInjection(parts: ReadonlyArray<Part>): boolean {
  return parts.some(
    (part) =>
      part.type === "text" &&
      part.synthetic === true &&
      isBeadsContextEnvelope(part.text)
  );
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
      } else if (event.type === "session.deleted") {
        controller.onSessionDeleted(event.properties.info.id);
      }
    },

    config: async (config) => {
      await controller.configure(config);
    },
  };
};
