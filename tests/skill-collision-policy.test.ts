import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  beadsSkillLocations,
  blockingSkillCollisions,
  inspectBeadsSkillLocations,
  type ManagedSkillState,
} from "../src/skill-collision-policy";

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true })));
});

async function createFixture(): Promise<{ home: string; project: string }> {
  const fixture = await mkdtemp(join(tmpdir(), "opencode-beads-collisions-"));
  fixtures.push(fixture);
  const project = join(fixture, "project");
  const home = join(fixture, "home");
  await Promise.all([mkdir(project), mkdir(home)]);
  return { project, home };
}

describe("skill collision policy", () => {
  test("resolves all project and global discovery roots deterministically", async () => {
    const { project, home } = await createFixture();

    expect(beadsSkillLocations(project, project, home)).toEqual([
      { path: join(project, ".opencode/skills/beads"), root: ".opencode", scope: "project" },
      { path: join(project, ".agents/skills/beads"), root: ".agents", scope: "project" },
      { path: join(project, ".claude/skills/beads"), root: ".claude", scope: "project" },
      {
        path: join(home, ".config/opencode/skills/beads"),
        root: ".opencode",
        scope: "global",
      },
      { path: join(home, ".agents/skills/beads"), root: ".agents", scope: "global" },
      { path: join(home, ".claude/skills/beads"), root: ".claude", scope: "global" },
    ]);
  });

  test("classifies absent, managed, modified, differently managed, and unmanaged locations", async () => {
    const { project, home } = await createFixture();
    const locations = beadsSkillLocations(project, project, home);
    const states: Array<ManagedSkillState | "differently-managed"> = [
      "current",
      "stale",
      "modified",
      "differently-managed",
    ];
    for (const [index, state] of states.entries()) {
      const location = locations[index];
      if (!location) throw new Error("missing fixture location");
      await mkdir(location.path, { recursive: true });
      await writeFile(join(location.path, "ownership"), state);
    }
    const unmanaged = locations[4];
    if (!unmanaged) throw new Error("missing unmanaged fixture location");
    await mkdir(unmanaged.path, { recursive: true });
    await writeFile(join(unmanaged.path, "SKILL.md"), "user content");

    const inspections = await inspectBeadsSkillLocations(
      project,
      project,
      home,
      async (location) => {
        const value = await readFile(join(location.path, "ownership"), "utf8");
        return value as ManagedSkillState | "differently-managed";
      }
    );

    expect(inspections.map(({ state }) => state)).toEqual([
      "managed-current",
      "managed-stale",
      "managed-modified",
      "differently-managed",
      "unmanaged",
      "absent",
    ]);
    expect(await readFile(join(unmanaged.path, "SKILL.md"), "utf8")).toBe("user content");
  });

  test("blocks every occupied non-target and unsafe target without changing files", async () => {
    const { project, home } = await createFixture();
    const locations = beadsSkillLocations(project, project, home);
    const target = locations[0];
    const other = locations[3];
    if (!target || !other) throw new Error("missing fixture locations");
    await mkdir(target.path, { recursive: true });
    await mkdir(other.path, { recursive: true });
    await writeFile(join(target.path, "ownership"), "stale");
    await writeFile(join(other.path, "ownership"), "current");

    const inspections = await inspectBeadsSkillLocations(
      project,
      project,
      home,
      async (location) =>
        (await readFile(join(location.path, "ownership"), "utf8")) as ManagedSkillState
    );

    expect(blockingSkillCollisions(inspections, target.path).map(({ path }) => path)).toEqual([
      other.path,
    ]);
    expect(await readFile(join(target.path, "ownership"), "utf8")).toBe("stale");
    expect(await readFile(join(other.path, "ownership"), "utf8")).toBe("current");
  });

  test("scans each cwd ancestor through the worktree and rejects an outside cwd", async () => {
    const { project, home } = await createFixture();
    const cwd = join(project, "packages", "app");
    await mkdir(cwd, { recursive: true });

    expect(beadsSkillLocations(cwd, project, home).slice(0, 9).map(({ path }) => path)).toEqual([
      join(cwd, ".opencode/skills/beads"),
      join(cwd, ".agents/skills/beads"),
      join(cwd, ".claude/skills/beads"),
      join(project, "packages/.opencode/skills/beads"),
      join(project, "packages/.agents/skills/beads"),
      join(project, "packages/.claude/skills/beads"),
      join(project, ".opencode/skills/beads"),
      join(project, ".agents/skills/beads"),
      join(project, ".claude/skills/beads"),
    ]);
    expect(() => beadsSkillLocations(home, project, home)).toThrow("cwd must be within worktree");
  });

  test("uses the effective OpenCode config root without moving compatibility roots", async () => {
    const { project, home } = await createFixture();
    const config = join(home, "xdg", "opencode");
    const globals = beadsSkillLocations(project, project, home, config).slice(-3);

    expect(globals.map(({ path }) => path)).toEqual([
      join(config, "skills/beads"),
      join(home, ".agents/skills/beads"),
      join(home, ".claude/skills/beads"),
    ]);
  });
});
