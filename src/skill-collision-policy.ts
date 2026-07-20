import { lstat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const SKILL_ROOTS = [".opencode", ".agents", ".claude"] as const;

export type SkillScope = "global" | "project";
export type ManagedSkillState = "current" | "modified" | "stale";
export type SkillLocationState =
  | "absent"
  | "differently-managed"
  | "managed-current"
  | "managed-modified"
  | "managed-stale"
  | "unmanaged";

export interface SkillLocation {
  path: string;
  root: (typeof SKILL_ROOTS)[number];
  scope: SkillScope;
}

export interface SkillLocationInspection extends SkillLocation {
  state: SkillLocationState;
}

export type ManagedSkillInspector = (
  location: SkillLocation
) => Promise<ManagedSkillState | "differently-managed" | undefined>;

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

/** Resolve every project and global discovery location for a skill named beads. */
export function beadsSkillLocations(
  cwd: string,
  worktree: string,
  homeDirectory: string,
  opencodeConfigDirectory = join(homeDirectory, ".config", "opencode")
): SkillLocation[] {
  const canonicalCwd = resolve(cwd);
  const canonicalWorktree = resolve(worktree);
  const fromWorktree = relative(canonicalWorktree, canonicalCwd);
  if (fromWorktree === ".." || fromWorktree.startsWith(`..${sep}`) || isAbsolute(fromWorktree)) {
    throw new Error(`cwd must be within worktree: ${canonicalCwd}`);
  }

  const projectDirectories: string[] = [];
  for (let current = canonicalCwd; ; current = dirname(current)) {
    projectDirectories.push(current);
    if (current === canonicalWorktree) break;
  }

  const locations = [
    ...projectDirectories.flatMap((directory) =>
      SKILL_ROOTS.map((root) => ({
        path: resolve(directory, root, "skills", "beads"),
        root,
        scope: "project" as const,
      }))
    ),
    ...SKILL_ROOTS.map((root) => ({
      path:
        root === ".opencode"
          ? join(opencodeConfigDirectory, "skills", "beads")
          : join(homeDirectory, root, "skills", "beads"),
      root,
      scope: "global" as const,
    })),
  ];
  const uniqueLocations: SkillLocation[] = [];
  const seenPaths = new Set<string>();
  for (const location of locations) {
    if (seenPaths.has(location.path)) continue;
    seenPaths.add(location.path);
    uniqueLocations.push(location);
  }
  return uniqueLocations;
}

/** Inspect all discovery locations without mutating them. */
export async function inspectBeadsSkillLocations(
  cwd: string,
  worktree: string,
  homeDirectory: string,
  inspectManaged: ManagedSkillInspector,
  opencodeConfigDirectory = join(homeDirectory, ".config", "opencode")
): Promise<SkillLocationInspection[]> {
  return Promise.all(
    beadsSkillLocations(cwd, worktree, homeDirectory, opencodeConfigDirectory).map(
      async (location) => {
        let stats;
        try {
          stats = await lstat(location.path);
        } catch (error) {
          if (isMissing(error)) return { ...location, state: "absent" as const };
          return { ...location, state: "unmanaged" as const };
        }

        if (!stats.isDirectory() || stats.isSymbolicLink()) {
          return { ...location, state: "unmanaged" as const };
        }

        const managedState = await inspectManaged(location).catch(() => undefined);
        let state: SkillLocationState = "unmanaged";
        if (managedState === "differently-managed") {
          state = managedState;
        } else if (managedState) {
          state = `managed-${managedState}`;
        }
        return { ...location, state };
      }
    )
  );
}

/** Return every location that prevents a managed operation at the requested target. */
export function blockingSkillCollisions(
  inspections: ReadonlyArray<SkillLocationInspection>,
  target: string
): SkillLocationInspection[] {
  const resolvedTarget = resolve(target);
  return inspections.filter((inspection) => {
    if (inspection.state === "absent") return false;
    if (resolve(inspection.path) !== resolvedTarget) return true;
    return inspection.state !== "managed-current" && inspection.state !== "managed-stale";
  });
}
