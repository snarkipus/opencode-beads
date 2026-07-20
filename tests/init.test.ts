import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OWNERSHIP_MANIFEST,
  runInitCommand,
  type InitCommand,
  type InitMutationFileSystem,
} from "../src/init";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.rm(path, { recursive: true, force: true })));
});

async function fixture() {
  const root = await fs.mkdtemp(join(tmpdir(), "opencode-beads-init-"));
  fixtures.push(root);
  const worktree = join(root, "worktree");
  const cwd = join(worktree, "packages", "app");
  const home = join(root, "home");
  await Promise.all([fs.mkdir(cwd, { recursive: true }), fs.mkdir(home)]);
  const inputs = { cwd, worktree, home, packageRoot, packageVersion: "0.7.0" };
  const run = (command: InitCommand, extra = {}) => runInitCommand(command, { ...inputs, ...extra });
  return { root, worktree, cwd, home, inputs, run, target: join(worktree, ".opencode/skills/beads") };
}

describe("managed skill lifecycle", () => {
  test("packages a discoverable OpenCode skill using the documented schema", async () => {
    const skillDirectory = join(packageRoot, "dist/init/artifacts/beads");
    const skill = await fs.readFile(join(skillDirectory, "SKILL.md"), "utf8");
    const match = skill.match(/^---\n([\s\S]*?)\n---\n\n# Beads\n/);
    expect(match).not.toBeNull();
    const frontmatter = match?.[1]?.split("\n") ?? [];
    expect(frontmatter.map((line) => line.slice(0, line.indexOf(":")))).toEqual([
      "name",
      "description",
    ]);
    expect(frontmatter[0]).toBe(`name: ${basename(skillDirectory)}`);
    expect(frontmatter[1]).toStartWith("description: Use when managing work with the bd CLI");
    expect(frontmatter[1]).not.toMatch(/\b(?:I|my|we|our|you|your)\b/i);
    expect(frontmatter[1]).toContain('"create task"');
    expect(frontmatter[1]).toContain('"what\'s ready"');
    expect(frontmatter[1]).toContain('"track this work"');

    for (const reference of ["DEPENDENCIES", "ISSUE_CREATION", "RESUMABILITY"]) {
      const relativePath = `references/${reference}.md`;
      expect(skill).toContain(`](${relativePath})`);
      expect((await fs.lstat(join(packageRoot, "dist/init/artifacts/beads", relativePath))).isFile()).toBeTrue();
    }

    const artifactManifest = JSON.parse(
      await fs.readFile(join(packageRoot, "dist/init/manifest.json"), "utf8")
    );
    expect(artifactManifest.sources).toEqual([
      {
        source: "plugins/beads/skills/beads/SKILL.md",
        sourceSha256: "01555fe65d19be401d820d9dec029cd048fb0791d433b4b575374477d6f1d827",
        target: "SKILL.md",
      },
      {
        source: "plugins/beads/skills/beads/resources/DEPENDENCIES.md",
        sourceSha256: "9c3327611bfbdc47124736dd0cc928bfeff1c135d4ae79d4ea46cba1900df335",
        target: "references/DEPENDENCIES.md",
      },
      {
        source: "plugins/beads/skills/beads/resources/ISSUE_CREATION.md",
        sourceSha256: "ff465ed1fb13fbb6c42b42ec15c1bd8fd677c4661237e4fc1675c179f7fca460",
        target: "references/ISSUE_CREATION.md",
      },
      {
        source: "plugins/beads/skills/beads/resources/RESUMABILITY.md",
        sourceSha256: "8a7db4e967ace1b4f60dc85e3fb2d02f70749a18056fe90c61b2685bb172d7df",
        target: "references/RESUMABILITY.md",
      },
    ]);
  });

  test("installs, checks, and removes only owned project payload", async () => {
    const item = await fixture();
    const missing = await item.run("check");
    expect(missing).toMatchObject({ state: "missing", ok: true, changed: false });

    const installed = await item.run("init");
    expect(installed).toMatchObject({ state: "missing", ok: true, changed: true });
    expect(installed.plan.at(-1)).toEqual({
      action: "write-manifest",
      path: join(item.target, OWNERSHIP_MANIFEST),
    });
    expect((await item.run("check")).state).toBe("current");

    const removed = await item.run("remove");
    expect(removed).toMatchObject({ state: "current", ok: true, changed: true });
    expect(await fs.exists(item.target)).toBe(false);
  });

  test("supports global scope while retaining project collision scanning", async () => {
    const item = await fixture();
    const global = { scope: "global" as const };
    expect((await item.run("init", global)).target).toBe(
      join(item.home, ".config/opencode/skills/beads")
    );
    expect((await item.run("check", global)).state).toBe("current");

    await fs.mkdir(join(item.cwd, ".agents/skills/beads"), { recursive: true });
    await fs.writeFile(join(item.cwd, ".agents/skills/beads/SKILL.md"), "foreign");
    const collision = await item.run("check", global);
    expect(collision.state).toBe("conflicting");
    expect(collision.collisions).toEqual([join(item.cwd, ".agents/skills/beads")]);
  });

  test("removes a verified-owned target despite unrelated discovery collisions", async () => {
    const item = await fixture();
    await item.run("init");
    const competing = join(item.home, ".config/opencode/skills/beads");
    await fs.mkdir(competing, { recursive: true });
    await fs.writeFile(join(competing, "SKILL.md"), "unmanaged competing skill");

    expect(await item.run("update")).toMatchObject({ state: "conflicting", ok: false });
    const removed = await item.run("remove");
    expect(removed).toMatchObject({ state: "current", ok: true, changed: true });
    expect(removed.collisions).toEqual([competing]);
    expect(await fs.exists(item.target)).toBeFalse();
    expect(await fs.exists(join(competing, "SKILL.md"))).toBeTrue();
  });

  test("updates stale content and refuses modified, foreign, and unmanaged targets", async () => {
    const stale = await fixture();
    await stale.run("init");
    const manifestPath = join(stale.target, OWNERSHIP_MANIFEST);
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    manifest.packageVersion = "0.6.0";
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    expect((await stale.run("check")).state).toBe("stale");
    expect(await stale.run("update")).toMatchObject({ state: "stale", ok: true, changed: true });
    expect((await stale.run("check")).state).toBe("current");

    await fs.writeFile(join(stale.target, "SKILL.md"), "changed");
    expect(await stale.run("update")).toMatchObject({ state: "modified", ok: false });
    expect(await stale.run("remove")).toMatchObject({ state: "modified", ok: false });

    const unmanaged = await fixture();
    await fs.mkdir(unmanaged.target, { recursive: true });
    expect(await unmanaged.run("init")).toMatchObject({ state: "conflicting", ok: false });

    const foreign = await fixture();
    await fs.mkdir(foreign.target, { recursive: true });
    await fs.writeFile(join(foreign.target, OWNERSHIP_MANIFEST), "{}\n");
    expect(await foreign.run("init")).toMatchObject({ state: "conflicting", ok: false });
  });

  test("updates a valid stale file-to-directory layout through a staged tree", async () => {
    const item = await fixture();
    await item.run("init");
    const manifestPath = join(item.target, OWNERSHIP_MANIFEST);
    const ownership = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const skill = await fs.readFile(join(item.target, "SKILL.md"));
    await fs.rm(join(item.target, "references"), { recursive: true });
    await fs.writeFile(join(item.target, "references"), skill);
    ownership.packageVersion = "0.6.0";
    ownership.files = [
      { path: "SKILL.md", sha256: createHash("sha256").update(skill).digest("hex") },
      { path: "references", sha256: createHash("sha256").update(skill).digest("hex") },
    ];
    await fs.writeFile(manifestPath, `${JSON.stringify(ownership, null, 2)}\n`);

    expect((await item.run("check")).state).toBe("stale");
    await item.run("update");
    expect((await fs.lstat(join(item.target, "references"))).isDirectory()).toBeTrue();
    expect((await item.run("check")).state).toBe("current");
  });

  test("rolls back injected staging and backup deletion failures", async () => {
    const writeFailure = await fixture();
    const failingWrite: InitMutationFileSystem = {
      ...fs,
      writeFile: async () => { throw new Error("injected write failure"); },
    };
    await expect(writeFailure.run("init", { mutationFileSystem: failingWrite })).rejects.toThrow(
      "injected write failure"
    );
    expect(await fs.exists(writeFailure.target)).toBeFalse();
    expect((await fs.readdir(dirname(writeFailure.target))).filter((name) => name.includes("opencode-beads"))).toEqual([]);

    const updateFailure = await fixture();
    await updateFailure.run("init");
    const updateManifestPath = join(updateFailure.target, OWNERSHIP_MANIFEST);
    const staleOwnership = JSON.parse(await fs.readFile(updateManifestPath, "utf8"));
    staleOwnership.packageVersion = "0.6.0";
    await fs.writeFile(updateManifestPath, `${JSON.stringify(staleOwnership, null, 2)}\n`);
    await expect(updateFailure.run("update", { mutationFileSystem: failingWrite })).rejects.toThrow(
      "injected write failure"
    );
    expect((await updateFailure.run("check")).state).toBe("stale");

    const deletionFailure = await fixture();
    await deletionFailure.run("init");
    let injected = false;
    const failingRemoval: InitMutationFileSystem = {
      ...fs,
      rm: async (path: Parameters<typeof fs.rm>[0], options?: Parameters<typeof fs.rm>[1]) => {
        if (!injected && String(path).includes("opencode-beads-backup")) {
          injected = true;
          throw new Error("injected delete failure");
        }
        return fs.rm(path, options);
      },
    };
    await expect(deletionFailure.run("remove", { mutationFileSystem: failingRemoval })).rejects.toThrow(
      "injected delete failure"
    );
    expect((await deletionFailure.run("check")).state).toBe("current");

    const setupFailure = await fixture();
    await setupFailure.run("init");
    const setupManifestPath = join(setupFailure.target, OWNERSHIP_MANIFEST);
    const setupOwnership = JSON.parse(await fs.readFile(setupManifestPath, "utf8"));
    setupOwnership.packageVersion = "0.6.0";
    await fs.writeFile(setupManifestPath, `${JSON.stringify(setupOwnership, null, 2)}\n`);
    let temporaryDirectoryCalls = 0;
    const failingSetup: InitMutationFileSystem = {
      ...fs,
      mkdtemp: async (prefix: string) => {
        temporaryDirectoryCalls += 1;
        if (temporaryDirectoryCalls === 3) throw new Error("injected setup failure");
        return fs.mkdtemp(prefix);
      },
    };
    await expect(
      setupFailure.run("update", { mutationFileSystem: failingSetup })
    ).rejects.toThrow("injected setup failure");
    expect((await setupFailure.run("check")).state).toBe("stale");
    expect(
      (await fs.readdir(dirname(setupFailure.target))).filter((name) =>
        name.includes("opencode-beads")
      )
    ).toEqual([]);
  });

  test("reports stale transaction siblings as conflicts without exposing them in plans", async () => {
    const item = await fixture();
    await fs.mkdir(dirname(item.target), { recursive: true });
    await fs.mkdir(join(dirname(item.target), ".beads.opencode-beads-stage-stale"));
    const result = await item.run("init", { dryRun: true });
    expect(result).toMatchObject({ state: "conflicting", ok: false, plan: [] });
    expect(result.collisions).toEqual([
      join(dirname(item.target), ".beads.opencode-beads-stage-stale"),
    ]);

    await fs.rm(join(dirname(item.target), ".beads.opencode-beads-stage-stale"), {
      recursive: true,
    });
    await item.run("init");
    await fs.mkdir(join(dirname(item.target), ".beads.opencode-beads-backup-stale"));
    expect(await item.run("remove")).toMatchObject({ state: "conflicting", ok: false });
  });

  test("detects ancestor collisions and cwd outside the worktree", async () => {
    const item = await fixture();
    const occupied = join(item.worktree, "packages/.claude/skills/beads");
    await fs.mkdir(occupied, { recursive: true });
    await fs.writeFile(join(occupied, "SKILL.md"), "occupied");
    expect(await item.run("init")).toMatchObject({ state: "conflicting", collisions: [occupied] });
    await expect(
      runInitCommand("check", { ...item.inputs, cwd: item.home })
    ).rejects.toThrow("cwd must be within worktree");
  });

  test("dry-run returns an exact deterministic plan without mutation", async () => {
    const item = await fixture();
    const first = await item.run("init", { dryRun: true });
    const second = await item.run("init", { dryRun: true });
    expect(first).toEqual(second);
    expect(first.plan.map(({ action }) => action)).toEqual([
      "mkdir",
      "mkdir",
      "write-payload",
      "write-payload",
      "write-payload",
      "write-payload",
      "write-manifest",
    ]);
    expect(await fs.exists(item.target)).toBe(false);
  });

  test("rejects unexpected files and symlinked managed payload", async () => {
    const item = await fixture();
    await item.run("init");
    await fs.writeFile(join(item.target, "unexpected.md"), "user");
    expect((await item.run("check")).state).toBe("modified");

    const linked = await fixture();
    await linked.run("init");
    await fs.rm(join(linked.target, "SKILL.md"));
    await fs.symlink("references/DEPENDENCIES.md", join(linked.target, "SKILL.md"));
    expect((await linked.run("check")).state).toBe("modified");
  });

  test("validates packaged artifact bytes before inspecting the target", async () => {
    const item = await fixture();
    const brokenPackage = join(item.root, "package");
    await fs.mkdir(brokenPackage);
    await fs.cp(join(packageRoot, "dist"), join(brokenPackage, "dist"), { recursive: true });
    await fs.writeFile(
      join(brokenPackage, "dist/init/artifacts/beads/SKILL.md"),
      "tampered"
    );

    await expect(item.run("check", { packageRoot: brokenPackage })).rejects.toThrow(
      "size or checksum mismatch"
    );
  });
});
