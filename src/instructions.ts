/**
 * Minimal Beads instructions while prime is attached, matching Claude Code's integration.
 *
 * `bd setup claude` writes only a short pointer into CLAUDE.md because its hooks run `bd prime`.
 * OpenCode projects instead get bd's full-profile AGENTS.md section (and often a Codex section),
 * which can repeat injected prime. Only demonstrably duplicated complete bodies are replaced in
 * outgoing system text; customized blocks and files are untouched.
 */

/** Replaces bd-managed blocks whose content duplicates injected prime. */
export const MINIMAL_BEADS_POINTER =
  "Beads (bd) workflow context for this project is provided by the opencode-beads plugin in the <beads-context> block, from `bd prime`.";

// bd's full-profile integration block and its Codex setup block. Minimal-profile blocks are already
// equivalent to Claude Code's pointer and are left alone.
const DUPLICATE_BLOCKS: readonly RegExp[] = [
  /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:full\b[^>]*-->([\s\S]*?)<!-- END BEADS INTEGRATION -->/g,
  /<!-- BEGIN BEADS CODEX SETUP\b[^>]*-->([\s\S]*?)<!-- END BEADS CODEX SETUP -->/g,
];

/**
 * Replace complete duplicated managed blocks with one pointer and count all replaced blocks.
 * @param text One outgoing text part; no repository file is edited.
 * @param suppliedContext Context actually attached to this request; empty context never triggers replacement.
 */
export function minimizeBeadsInstructions(text: string, suppliedContext = ""): { text: string; replaced: number } {
  let replaced = 0;
  let pointerPlaced = false;
  let result = text;
  for (const pattern of DUPLICATE_BLOCKS) {
    result = result.replace(pattern, (block: string, body: string) => {
      // Markers prove ownership, not duplication. Keep customized policy unless the complete
      // body is already present in the context actually attached to this request.
      if (!body.trim() || !suppliedContext.includes(body.trim())) return block;
      replaced++;
      if (pointerPlaced) return "";
      pointerPlaced = true;
      return MINIMAL_BEADS_POINTER;
    });
  }
  return { text: result, replaced };
}

/**
 * Minimize each eligible part in place, keeping one pointer per changed part.
 * @param parts Transient system parts; non-text parts are left alone.
 * @param suppliedContext Context actually attached to this request.
 * @returns Total number of replaced blocks across the parts.
 */
export function minimizeSystemParts(parts: Array<{ type: string; text?: string }>, suppliedContext = ""): number {
  let replaced = 0;
  for (const part of parts) {
    if (part.type !== "text" || typeof part.text !== "string") continue;
    const minimized = minimizeBeadsInstructions(part.text, suppliedContext);
    if (minimized.replaced > 0) {
      part.text = minimized.text;
      replaced += minimized.replaced;
    }
  }
  return replaced;
}

/**
 * Count complete recognized managed blocks, whether or not their bodies duplicate context.
 * @param text Outgoing instruction text to account for before minimization.
 */
export function countManagedBlocks(text: string): { full: number; minimal: number; codex: number } {
  return {
    full: [
      ...text.matchAll(
        /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:full\b[^>]*-->[\s\S]*?<!-- END BEADS INTEGRATION -->/g,
      ),
    ].length,
    minimal: [
      ...text.matchAll(
        /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:minimal\b[^>]*-->[\s\S]*?<!-- END BEADS INTEGRATION -->/g,
      ),
    ].length,
    codex: [...text.matchAll(/<!-- BEGIN BEADS CODEX SETUP\b[^>]*-->[\s\S]*?<!-- END BEADS CODEX SETUP -->/g)].length,
  };
}
