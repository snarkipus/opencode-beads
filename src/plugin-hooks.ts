import type { Hooks } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";
import {
  createBeadsController,
  isBeadsContextEnvelope,
  type PluginRuntime,
} from "./plugin-core";

/** Prevent the synthetic no-reply prompt from recursively triggering its own injection. */
function isBeadsContextInjection(parts: ReadonlyArray<Part>): boolean {
  return parts.some(
    (part) =>
      part.type === "text" &&
      part.synthetic === true &&
      isBeadsContextEnvelope(part.text)
  );
}

/** Build OpenCode hooks around an explicit runtime boundary. */
export async function createBeadsHooks(
  runtime: PluginRuntime,
  projectDirectory: string
): Promise<Hooks> {
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
}
