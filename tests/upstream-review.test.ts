import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runSourceCheck } from "../scripts/check-beads-integration";

const baseline = "4a67d0d0288c1b4ee23e17fc896f47616931ba2d";
const candidate = "b".repeat(40);
const baseTree = "c".repeat(40);
const nextTree = "d".repeat(40);
const repository = "gastownhall/beads";
const api = `https://api.github.com/repos/${repository}`;
const script = resolve(import.meta.dir, "../scripts/check-beads-integration.ts");
const inventoryPath = resolve(import.meta.dir, "../docs/claude-code-integration-inventory.json");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function blob(path: string, id = "1", mode = "100644") {
  return { path, type: "blob", mode, sha: id.repeat(40) };
}

const entries = [
  blob("plugins/beads/edit.md"),
  blob("plugins/beads/delete.md", "2"),
  blob("plugins/beads/old.md", "3"),
  blob("internal/templates/skills/beads/SKILL.md", "4"),
  blob("cmd/bd/prime.go", "5"),
  blob(".claude-plugin/marketplace.json", "6"),
];
const inventory = {
  marketplace_main: {
    repository,
    commit: baseline,
    default_branch: "main",
    files: entries.map(({ path, sha }) => ({ path, git_blob: sha })),
  },
};

/** GitHub-shaped responses; no tag or local adaptation bytes enter the comparison. */
function responses(next = entries): Record<string, unknown> {
  return {
    [api]: { default_branch: "main" },
    [`${api}/commits/main`]: { sha: candidate, commit: { tree: { sha: nextTree } } },
    [`${api}/commits/${baseline}`]: { sha: baseline, commit: { tree: { sha: baseTree } } },
    [`${api}/git/trees/${baseTree}?recursive=1`]: { sha: baseTree, truncated: false, tree: entries },
    [`${api}/git/trees/${nextTree}?recursive=1`]: { sha: nextTree, truncated: false, tree: next },
  };
}

function fixtureFetch(data: Record<string, unknown>, calls: string[] = []) {
  return async (url: string) => {
    calls.push(url);
    if (!(url in data)) throw new Error("Unexpected fixture request");
    return new Response(JSON.stringify(data[url]), { status: 200 });
  };
}

async function run(data = responses(), sourceInventory: unknown = inventory) {
  const result = await runSourceCheck(sourceInventory, fixtureFetch(data));
  return { ...result, report: JSON.parse(result.stdout) };
}

/** Run the actual CLI with a temporary preload replacing only HTTP retrieval. */
async function entrypoint(data: Record<string, unknown>, args: string[] = []) {
  const directory = await fs.mkdtemp(join(tmpdir(), "oc-upstream-entrypoint-"));
  temporaryDirectories.push(directory);
  const preload = join(directory, "fetch.ts");
  await fs.writeFile(preload, `
const data = ${JSON.stringify(data)};
globalThis.fetch = async (url) => {
  if (!(String(url) in data)) throw new Error("Unexpected fixture request");
  return new Response(JSON.stringify(data[String(url)]), { status: 200 });
};
`);
  const proc = Bun.spawn([process.execPath, "--preload", preload, script, ...args], {
    cwd: directory,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, GH_TOKEN: "fixture-secret-never-print" },
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  expect(await fs.readdir(directory)).toEqual(["fetch.ts"]);
  return { exitCode, stdout, stderr, report: JSON.parse(stdout) };
}

describe("advisory marketplace MAIN source collector", () => {
  test("unchanged selection succeeds despite unrelated paths and prefix noise", async () => {
    const result = await run(responses([...entries,
      blob("README.md", "7"), blob("plugins/beads-extra/noise.md", "8"),
      blob("internal/templates/skills/beads-other/noise.md", "9"),
    ]));
    expect(result.exitCode).toBe(0);
    expect(result.report.kind).toBe("completed");
    expect(result.report.status).toBe("unchanged");
    expect(result.report.level).toBe("info");
    expect(result.report.changes).toEqual([]);
    expect(result.report.selectedFiles).toEqual({ baseline: 6, candidate: 6 });
  });

  test("complete membership detects add/delete/edit/exact rename and support edits, sorted and repeatable", async () => {
    const next = [
      blob("plugins/beads/new.md", "3"),
      blob("plugins/beads/edit.md", "7"),
      blob("plugins/beads/added.md", "8"),
      blob("internal/templates/skills/beads/SKILL.md", "4", "100755"),
      blob("cmd/bd/prime.go", "9"),
      entries[5]!,
    ];
    const data = responses(next);
    const result = await run(data);
    expect(result.exitCode).toBe(0);
    expect(result.report.status).toBe("changed");
    expect(result.report.changes.map((c: { kind: string; path: string; previousPath?: string }) =>
      [c.kind, c.path, c.previousPath ?? null])).toEqual([
      ["edited", "cmd/bd/prime.go", null],
      ["edited", "internal/templates/skills/beads/SKILL.md", null],
      ["added", "plugins/beads/added.md", null],
      ["deleted", "plugins/beads/delete.md", null],
      ["edited", "plugins/beads/edit.md", null],
      ["renamed", "plugins/beads/new.md", "plugins/beads/old.md"],
    ]);
    expect(result.report.baselineCommit).toBe(baseline);
    expect(result.report.candidateCommit).toBe(candidate);
    expect(result.report.reviewUrl).toContain(`${baseline}..${candidate}`);
    expect(result.report.changes.every((c: { beforeUrl?: string; afterUrl?: string }) =>
      c.beforeUrl?.includes(baseline) || c.afterUrl?.includes(candidate))).toBeTrue();
    expect((await run(responses([...next].reverse()))).stdout).toBe(result.stdout);
    expect((await run(data)).stdout).toBe(result.stdout);
    expect(inventory.marketplace_main.commit).toBe(baseline);
  });

  test("resolves the actual default branch and immutable candidate only once", async () => {
    const data = responses();
    data[api] = { default_branch: "development" };
    data[`${api}/commits/development`] = data[`${api}/commits/main`];
    delete data[`${api}/commits/main`];
    const calls: string[] = [];
    const result = await runSourceCheck(inventory, fixtureFetch(data, calls));
    expect(result.exitCode).toBe(0);
    expect(calls.filter((url) => url.endsWith("/commits/development"))).toHaveLength(1);
    expect(calls).toHaveLength(5);
    expect(calls.some((url) => /tags|releases|compare/.test(url))).toBeFalse();
  });

  test("reads an explicitly revised reviewed inventory without advancing the original baseline", async () => {
    const reviewedInventory = structuredClone(inventory);
    reviewedInventory.marketplace_main.commit = candidate;
    const calls: string[] = [];
    const result = await runSourceCheck(reviewedInventory, fixtureFetch(responses(), calls));
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).baselineCommit).toBe(candidate);
    expect(JSON.parse(result.stdout).status).toBe("unchanged");
    expect(calls).toHaveLength(3);
    expect(inventory.marketplace_main.commit).toBe(baseline);
    expect(reviewedInventory.marketplace_main.commit).toBe(candidate);
  });

  test("incomplete, malformed or failed retrieval is unavailable, never unchanged", async () => {
    const treeUrl = `${api}/git/trees/${nextTree}?recursive=1`;
    for (const invalid of [
      { sha: nextTree, truncated: true, tree: entries },
      { sha: nextTree, tree: entries },
      { sha: nextTree, truncated: false },
      { sha: baseTree, truncated: false, tree: entries },
      { sha: nextTree, truncated: false, tree: [{ path: "plugins/beads/x", type: "blob" }] },
      { sha: nextTree, truncated: false, tree: [blob("plugins/beads/x", "1", "invalid")] },
      { sha: nextTree, truncated: false, tree: [...entries, entries[0]] },
    ]) {
      const data = responses();
      data[treeUrl] = invalid;
      const result = await run(data);
      expect(result.exitCode).toBe(2);
      expect(result.report.kind).toBe("unavailable");
      expect(result.report.status).toBeUndefined();
      expect(result.report.changes).toBeUndefined();
    }
    for (const fetchSource of [
      async () => new Response('{"message":"denied"}', { status: 403 }),
      async () => new Response("not JSON"),
      async () => { throw new Error("network unavailable"); },
      fixtureFetch({ [api]: {} }),
    ]) {
      const result = await runSourceCheck(inventory, fetchSource);
      expect(result.exitCode).toBe(2);
      expect(JSON.parse(result.stdout).kind).toBe("unavailable");
    }
    const missingBaseline = responses();
    missingBaseline[`${api}/git/trees/${baseTree}?recursive=1`] = { sha: baseTree, truncated: false, tree: [] };
    expect((await run(missingBaseline)).exitCode).toBe(2);
    const missingCommit = responses();
    missingCommit[`${api}/commits/main`] = { sha: candidate };
    expect((await run(missingCommit)).exitCode).toBe(2);
    expect((await run(responses(), { marketplace_main: { commit: "main" } })).exitCode).toBe(2);
  });

  test("actual entrypoint: changed MAIN with the same tagged CLI result stays informational/0 and read-only", async () => {
    const actualInventory = await fs.readFile(inventoryPath, "utf8");
    const packagePath = resolve(import.meta.dir, "../package.json");
    const actualPackage = await fs.readFile(packagePath, "utf8");
    const main = JSON.parse(actualInventory).marketplace_main;
    const selected = main.files.map((f: { path: string; git_blob: string }) => ({
      path: f.path, sha: f.git_blob, type: "blob", mode: "100644",
    }));
    const stableCLIResult = Object.freeze({ taggedRelease: "v1.3.1", compatible: true, exitCode: 0 });
    const stableCLIFailure = Object.freeze({ taggedRelease: "v1.3.1", compatible: false, exitCode: 1 });
    const before = JSON.stringify({ stableCLIResult, stableCLIFailure });
    const data = responses(selected);
    data[`${api}/git/trees/${baseTree}?recursive=1`] = { sha: baseTree, truncated: false, tree: selected };
    const unchanged = await entrypoint(data);
    expect(unchanged.exitCode).toBe(0);
    expect(unchanged.report.status).toBe("unchanged");
    data[`${api}/git/trees/${nextTree}?recursive=1`] = {
      sha: nextTree, truncated: false, tree: [...selected, blob("plugins/beads/new-main-work.md", "a")],
    };
    const changed = await entrypoint(data);
    expect(changed.exitCode).toBe(0);
    expect(changed.report.status).toBe("changed");
    expect(changed.report.channel).toBe("development-source");
    expect(changed.report.level).toBe("info");
    expect(changed.stderr).toBe("");
    expect(changed.stdout).not.toMatch(/::(?:error|warning)::|fixture-secret-never-print/);
    expect(changed.report).not.toHaveProperty("compatible");
    expect(changed.report).not.toHaveProperty("taggedRelease");
    expect((await entrypoint(data)).stdout).toBe(changed.stdout);
    expect(JSON.stringify({ stableCLIResult, stableCLIFailure })).toBe(before);
    expect(stableCLIFailure.exitCode).toBe(1);
    expect(await fs.readFile(inventoryPath, "utf8")).toBe(actualInventory);
    data[`${api}/git/trees/${nextTree}?recursive=1`] = { sha: nextTree, truncated: true, tree: selected };
    const unavailable = await entrypoint(data);
    expect(unavailable.exitCode).toBe(2);
    expect(unavailable.report.kind).toBe("unavailable");
    expect(unavailable.report.status).toBeUndefined();
    expect(unavailable.stderr).toBe("");
    expect(JSON.stringify({ stableCLIResult, stableCLIFailure })).toBe(before);
    const blindAdvancement = await entrypoint({}, ["--advance-baseline", candidate]);
    expect(blindAdvancement.exitCode).toBe(2);
    expect(blindAdvancement.report.kind).toBe("unavailable");
    expect(await fs.readFile(inventoryPath, "utf8")).toBe(actualInventory);
    expect(await fs.readFile(packagePath, "utf8")).toBe(actualPackage);
  });
});
