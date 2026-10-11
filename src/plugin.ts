/** OpenCode V2 adapter for the Beads issue tracker. */

import type { Plugin } from "@opencode/plugin";
import { setupBeads } from "./host";

// A plain object satisfies Plugin.define's identity contract without a runtime import.
const BeadsPlugin: Plugin.Plugin = {
  id: "opencode-beads",
  setup: (ctx) => setupBeads(ctx),
};

export default BeadsPlugin;
