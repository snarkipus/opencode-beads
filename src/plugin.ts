/** OpenCode adapter for the Beads issue tracker. */

import type { Plugin } from "@opencode-ai/plugin";
import { resolveProjectDirectory } from "./plugin-core";
import { createBeadsHooks } from "./plugin-hooks";
import { createOpenCodeRuntime } from "./opencode-runtime";

export const BeadsPlugin: Plugin = async ({ client, directory, worktree }) => {
  const projectDirectory = resolveProjectDirectory(directory, worktree);
  const runtime = createOpenCodeRuntime(client);
  return createBeadsHooks(runtime, projectDirectory);
};
