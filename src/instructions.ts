/**
 * Minimal Beads instructions while prime is attached, matching Claude Code's integration.
 *
 * `bd setup claude` writes only a short pointer into CLAUDE.md because its hooks run `bd prime`.
 * OpenCode projects instead get bd's full-profile AGENTS.md section (and often a Codex section),
 * which repeats what injected prime already provides on every request. When this plugin attaches
 * prime, those bd-managed blocks are replaced in the outgoing system text only; files are untouched.
 */

/** Replaces bd-managed blocks whose content duplicates injected prime. */
export const MINIMAL_BEADS_POINTER =
  "Beads (bd) workflow context for this project is provided by the opencode-beads plugin in the <beads-context> block, from `bd prime`.";

// bd's full-profile integration block and its Codex setup block. Minimal-profile blocks are already
// equivalent to Claude Code's pointer and are left alone.
const DUPLICATE_BLOCKS: readonly RegExp[] = [
  /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:full\b[^>]*-->[\s\S]*?<!-- END BEADS INTEGRATION -->/g,
  /<!-- BEGIN BEADS CODEX SETUP\b[^>]*-->[\s\S]*?<!-- END BEADS CODEX SETUP -->/g,
];

/** Return `text` with duplicate bd blocks collapsed into one pointer, and how many were replaced. */
export function minimizeBeadsInstructions(text: string): { text: string; replaced: number } {
  let replaced = 0;
  let pointerPlaced = false;
  let result = text;
  for (const pattern of DUPLICATE_BLOCKS) {
    result = result.replace(pattern, () => {
      replaced++;
      if (pointerPlaced) return "";
      pointerPlaced = true;
      return MINIMAL_BEADS_POINTER;
    });
  }
  return { text: result, replaced };
}

/** Apply {@link minimizeBeadsInstructions} to each text system part in place. */
export function minimizeSystemParts(parts: Array<{ type: string; text?: string }>): number {
  let replaced = 0;
  for (const part of parts) {
    if (part.type !== "text" || typeof part.text !== "string") continue;
    const minimized = minimizeBeadsInstructions(part.text);
    if (minimized.replaced > 0) {
      part.text = minimized.text;
      replaced += minimized.replaced;
    }
  }
  return replaced;
}
