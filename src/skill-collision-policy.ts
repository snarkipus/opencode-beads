import { lstat } from "node:fs/promises";
import { join, resolve } from "node:path";

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
  projectDirectory: string,
  homeDirectory: string
): SkillLocation[] {
  return [
    ...SKILL_ROOTS.map((root) => ({
      path: resolve(projectDirectory, root, "skills", "beads"),
      root,
      scope: "project" as const,
    })),
    ...SKILL_ROOTS.map((root) => ({
      path:
        root === ".opencode"
          ? join(homeDirectory, ".config", "opencode", "skills", "beads")
          : join(homeDirectory, root, "skills", "beads"),
      root,
      scope: "global" as const,
    })),
  ];
}

/** Inspect all discovery locations without mutating them. */
export async function inspectBeadsSkillLocations(
  projectDirectory: string,
  homeDirectory: string,
  inspectManaged: ManagedSkillInspector
): Promise<SkillLocationInspection[]> {
  return Promise.all(
    beadsSkillLocations(projectDirectory, homeDirectory).map(async (location) => {
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
    })
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
