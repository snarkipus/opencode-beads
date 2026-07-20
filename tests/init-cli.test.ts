import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.rm(path, { recursive: true, force: true })));
});

async function cli(
  args: string[],
  cwd: string,
  home: string,
  options: { packageRoot?: string; path?: string; xdgConfigHome?: string } = {}
) {
  const child = Bun.spawn([process.execPath, join(options.packageRoot ?? packageRoot, "src/init-cli.ts"), ...args], {
    cwd,
    env: {
      ...Bun.env,
      HOME: home,
      XDG_CONFIG_HOME: options.xdgConfigHome ?? "",
      ...(options.path === undefined ? {} : { PATH: options.path }),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe("companion CLI", () => {
  test("emits deterministic offline JSON and documented exit codes", async () => {
    const root = await fs.mkdtemp(join(tmpdir(), "opencode-beads-cli-"));
    fixtures.push(root);
    const worktree = join(root, "worktree");
    const home = join(root, "home");
    await Promise.all([fs.mkdir(worktree), fs.mkdir(home)]);
    const git = Bun.spawn(["git", "init", "--quiet"], { cwd: worktree });
    expect(await git.exited).toBe(0);

    const dry = await cli(["init", "--dry-run", "--json"], worktree, home);
    expect(dry.exitCode).toBe(0);
    expect(dry.stderr).toBe("");
    expect(dry.stdout.endsWith("\n")).toBe(true);
    expect(JSON.parse(dry.stdout)).toMatchObject({ state: "missing", changed: true, dryRun: true });
    expect(await fs.exists(join(worktree, ".opencode/skills/beads"))).toBe(false);

    const check = await cli(["check", "--json"], worktree, home);
    expect(check.exitCode).toBe(1);
    expect(JSON.parse(check.stdout).state).toBe("missing");
    expect((await cli(["unknown"], worktree, home))).toMatchObject({ exitCode: 2 });
  });

  test("uses one stdout JSON object for usage, git, refusal, and package failures", async () => {
    const root = await fs.mkdtemp(join(tmpdir(), "opencode-beads-cli-errors-"));
    fixtures.push(root);
    const worktree = join(root, "worktree");
    const home = join(root, "home");
    await Promise.all([fs.mkdir(worktree), fs.mkdir(home)]);

    const usage = await cli(["unknown", "--json"], worktree, home);
    expect(usage).toEqual({
      exitCode: 2,
      stderr: "",
      stdout: '{"ok":false,"code":"USAGE","message":"Usage: opencode-beads <init|check|update|remove> [--global] [--dry-run] [--json]"}\n',
    });

    const noGit = await cli(["check", "--json"], worktree, home, { path: "" });
    expect(noGit.stderr).toBe("");
    expect(JSON.parse(noGit.stdout)).toEqual({
      ok: false,
      code: "GIT_DISCOVERY_FAILED",
      message: "Unable to discover git worktree from cwd",
    });

    expect(await Bun.spawn(["git", "init", "--quiet"], { cwd: worktree }).exited).toBe(0);
    await fs.mkdir(join(worktree, ".opencode/skills/beads"), { recursive: true });
    const refusal = await cli(["init", "--json"], worktree, home);
    expect(refusal.stderr).toBe("");
    expect(JSON.parse(refusal.stdout)).toMatchObject({ ok: false, code: "LIFECYCLE_REFUSED" });

    const brokenPackage = join(root, "package");
    await fs.cp(join(packageRoot, "src"), join(brokenPackage, "src"), { recursive: true });
    await fs.cp(join(packageRoot, "dist"), join(brokenPackage, "dist"), { recursive: true });
    await fs.copyFile(join(packageRoot, "package.json"), join(brokenPackage, "package.json"));
    await fs.writeFile(join(brokenPackage, "dist/init/artifacts/beads/SKILL.md"), "corrupt");
    await fs.rm(join(worktree, ".opencode"), { recursive: true });
    const corrupt = await cli(["check", "--json"], worktree, home, { packageRoot: brokenPackage });
    expect(corrupt.stderr).toBe("");
    expect(JSON.parse(corrupt.stdout)).toEqual({
      ok: false,
      code: "PACKAGED_ARTIFACT_INVALID",
      message: "Packaged artifacts failed validation",
    });
  });

  test("uses an absolute XDG OpenCode config directory and rejects relative values", async () => {
    const root = await fs.mkdtemp(join(tmpdir(), "opencode-beads-cli-xdg-"));
    fixtures.push(root);
    const worktree = join(root, "worktree");
    const home = join(root, "home");
    const xdgConfigHome = join(root, "xdg");
    await Promise.all([fs.mkdir(worktree), fs.mkdir(home), fs.mkdir(xdgConfigHome)]);
    expect(await Bun.spawn(["git", "init", "--quiet"], { cwd: worktree }).exited).toBe(0);

    const result = await cli(["init", "--global", "--dry-run", "--json"], worktree, home, {
      xdgConfigHome,
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).target).toBe(
      join(xdgConfigHome, "opencode/skills/beads")
    );
    expect(await fs.exists(join(home, ".config/opencode/skills/beads"))).toBeFalse();

    const fallbackTarget = join(home, ".config/opencode/skills/beads");
    for (const xdgConfigHome of ["relative", ""]) {
      const fallback = await cli(
        ["init", "--global", "--dry-run", "--json"],
        worktree,
        home,
        { xdgConfigHome }
      );
      expect(fallback.exitCode).toBe(0);
      expect(JSON.parse(fallback.stdout).target).toBe(fallbackTarget);
    }
  });
});
