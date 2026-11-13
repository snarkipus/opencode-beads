import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const reviewedVersion = (await fs.readFile(join(root, ".github/opencode-reviewed-version"), "utf8")).trim();
const [major, minor, patch] = reviewedVersion.split(".");
const nextVersion = `${major}.${minor}.${Number(patch) + 1}`;
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

/** Exercise the actual workflow shell, mocking only GitHub retrieval and SDK commands. */
async function monitor(version: string, options: { sdkFailure?: boolean; unavailable?: boolean; prerelease?: boolean; noMatch?: boolean; crlf?: boolean } = {}) {
  let workflow = await fs.readFile(join(root, ".github/workflows/beads-contract.yml"), "utf8");
  if (options.crlf) workflow = workflow.replace(/\r?\n/g, "\r\n");
  workflow = workflow.replace(/\r\n/g, "\n");
  const job = workflow.split("  opencode-release:\n")[1]?.split("\n  source-comparison:\n")[0];
  expect(job, "the existing daily workflow must include an independent OpenCode release job").toBeDefined();
  const blocks = [...job!.matchAll(/        run: \|\n((?:          .*\n|\n)+)/g)]
    .map(match => match[1]!.replace(/^          /gm, ""));
  expect(blocks).toHaveLength(3);
  expect(job).toContain("always() && steps.opencode-release.outcome == 'success'");
  expect(job).not.toContain("needs:");

  const directory = await fs.mkdtemp(join(tmpdir(), "oc-release-monitor-"));
  directories.push(directory);
  const repo = join(directory, "repo");
  const bin = join(directory, "bin");
  const scratch = join(directory, "scratch");
  await Promise.all([fs.mkdir(join(repo, ".github"), { recursive: true }), fs.mkdir(bin), fs.mkdir(scratch)]);
  const manifest = JSON.stringify({ devDependencies: { "@opencode/plugin": "2.2.6" }, marker: "unchanged" });
  await fs.writeFile(join(repo, "package.json"), manifest);
  await fs.writeFile(join(repo, "bun.lock"), "original-lock\n");
  await fs.copyFile(join(root, ".github/opencode-reviewed-version"), join(repo, ".github/opencode-reviewed-version"));
  const git = async (...args: string[]) => {
    const p = Bun.spawn(["git", ...args], { cwd: repo, stdout: "pipe", stderr: "pipe" });
    expect(await p.exited, await new Response(p.stderr).text()).toBe(0);
  };
  await git("init", "--quiet");
  await git("add", ".");
  await git("-c", "user.name=Monitor fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "--no-verify", "-m", "Fixture baseline");
  await fs.writeFile(join(bin, "gh"), '#!/usr/bin/env bash\nif [[ "$GH_FAILURE" == 1 ]]; then exit 22; fi\nif [[ "$1" == api ]]; then printf "%s\\n" "$RELEASE_PAGES"; elif [[ "$3" == "$EXPECTED_TAG" ]]; then printf "%s\\n" "$RELEASE_JSON"; else printf "%s\\n" "$LEGACY_RELEASE_JSON"; fi\n', { mode: 0o755 });
  await fs.writeFile(join(bin, "bun"), '#!/usr/bin/env bash\nexec "$BUN_EXECUTABLE" "$SDK_STUB" "$@"\n', { mode: 0o755 });
  const stub = join(directory, "sdk-stub.ts");
  await fs.writeFile(stub, `
import * as fs from "node:fs/promises";
import { relative } from "node:path";
const args = process.argv.slice(2);
const manifest = JSON.parse(await fs.readFile("package.json", "utf8"));
if (args[0] === "install") {
  if (!args.includes("--ignore-scripts")) throw new Error("SDK installation must not run lifecycle scripts");
  if (!relative(process.cwd(), process.env.BUN_INSTALL_CACHE_DIR!).startsWith("..")) throw new Error("Cache must be outside source");
  await fs.mkdir("node_modules/@opencode/plugin", { recursive: true });
  await fs.writeFile("node_modules/@opencode/plugin/package.json", JSON.stringify({ version: manifest.devDependencies["@opencode/plugin"] }));
  await fs.writeFile("bun.lock", "candidate-lock");
}
const installed = JSON.parse(await fs.readFile("node_modules/@opencode/plugin/package.json", "utf8")).version;
await fs.appendFile(process.env.CALL_LOG!, JSON.stringify({ args, installed, declared: manifest.devDependencies["@opencode/plugin"], lock: await fs.readFile("bun.lock", "utf8") }) + "\\n");
if (process.env.SDK_FAILURE === "1" && args[0] === "test") process.exit(33);
`);
  const output = join(directory, "output");
  const summary = join(directory, "summary.md");
  const callLog = join(directory, "calls.jsonl");
  await fs.writeFile(output, "");
  const env = { ...process.env, PATH: `${bin}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`,
    GITHUB_WORKSPACE: repo, RUNNER_TEMP: scratch, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary,
    BUN_EXECUTABLE: process.execPath, SDK_STUB: stub, CALL_LOG: callLog,
    GH_FAILURE: options.unavailable ? "1" : "0", SDK_FAILURE: options.sdkFailure ? "1" : "0",
    REQUESTED: options.prerelease ? `v${version}` : "", EXPECTED_TAG: `v${version}`,
    LEGACY_RELEASE_JSON: JSON.stringify({ tagName: "v1.19.5", isDraft: false, isPrerelease: false, url: "https://github.com/anomalyco/opencode/releases/tag/v1.19.5" }),
    RELEASE_PAGES: JSON.stringify([
      { data: { repository: { releases: { nodes: [
        { tagName: "process-daemon-v0.5.2", isDraft: false, isPrerelease: false },
        { tagName: "v1.19.5", isDraft: false, isPrerelease: false },
        { tagName: "v9.0.0", isDraft: false, isPrerelease: true },
        { tagName: "v8.0.0", isDraft: true, isPrerelease: false },
        ...(options.noMatch ? [] : [{ tagName: `v${reviewedVersion}`, isDraft: false, isPrerelease: false }]),
      ] } } } },
      { data: { repository: { releases: { nodes: options.noMatch ? [] : [{ tagName: `v${version}`, isDraft: false, isPrerelease: false }] } } } },
    ]),
    RELEASE_JSON: JSON.stringify({ tagName: `v${version}`, isDraft: false, isPrerelease: options.prerelease ?? false,
      url: `https://github.com/anomalyco/opencode/releases/tag/v${version}` }) };
  async function shell(block: string, extra: Record<string, string> = {}) {
    const p = Bun.spawn(["bash", "-e", "-o", "pipefail", "-c", block], { cwd: repo, env: { ...env, ...extra }, stdout: "pipe", stderr: "pipe" });
    const [exitCode, stdout, stderr] = await Promise.all([p.exited, new Response(p.stdout).text(), new Response(p.stderr).text()]);
    return { exitCode, stdout, stderr };
  }
  const release = await shell(blocks[0]!);
  if (release.exitCode !== 0) {
    expect(await fs.readFile(output, "utf8")).toBe("");
    return { release, sdk: undefined, review: undefined, calls: [], summary: "" };
  }
  const outputs = Object.fromEntries((await fs.readFile(output, "utf8")).trim().split("\n").map(line => line.split("=")));
  expect(outputs.version).toBe(version);
  expect(outputs.reviewed).toBe(reviewedVersion);
  const sdk = await shell(blocks[1]!, { VERSION: outputs.version! });
  // Actions runs this always-step even if the SDK step failed.
  const review = await shell(blocks[2]!, { VERSION: outputs.version!, REVIEWED: outputs.reviewed!, SDK_OUTCOME: sdk.exitCode === 0 ? "success" : "failure" });
  const calls = (await fs.readFile(callLog, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  expect(await fs.readFile(join(repo, "package.json"), "utf8")).toBe(manifest);
  expect(await fs.readFile(join(repo, "bun.lock"), "utf8")).toBe("original-lock\n");
  expect((await fs.readFile(join(repo, ".github/opencode-reviewed-version"), "utf8")).trim()).toBe(reviewedVersion);
  expect((await fs.readdir(scratch)).sort()).toEqual(["opencode-release.json", "opencode-releases.json"]);
  return { release, sdk, review, calls, summary: await fs.readFile(summary, "utf8") };
}

describe("OpenCode stable-release monitoring", () => {
  test("already reviewed release runs exact SDK checks without advancing the pinned baseline", async () => {
    const result = await monitor(reviewedVersion, { crlf: true });
    expect(result.release.exitCode).toBe(0);
    expect(result.sdk?.exitCode).toBe(0);
    expect(result.review?.exitCode).toBe(0);
    expect(result.calls.map(call => call.args)).toEqual([["install", "--ignore-scripts"], ["test"], ["run", "typecheck"], ["run", "test:package"]]);
    expect(result.calls.every(call => call.installed === reviewedVersion)).toBeTrue();
    expect(result.calls.slice(1).every(call => call.declared === "2.2.6" && call.lock === "original-lock\n")).toBeTrue();
    expect(result.summary).toContain("SDK checks: success");
    expect(result.summary).toContain(`Release: [v${reviewedVersion}](https://github.com/anomalyco/opencode/releases/tag/v${reviewedVersion})`);
    expect(result.summary).toContain("not live-host/model qualification");
    expect(result.review?.stdout).not.toContain("::error::");
  });

  test("new stable release requires human review even when SDK checks pass", async () => {
    const result = await monitor(nextVersion);
    expect(result.sdk?.exitCode).toBe(0);
    expect(result.review?.exitCode).toBe(1);
    expect(result.review?.stdout).toContain(`::error::OpenCode ${nextVersion}`);
    expect(result.calls.every(call => call.installed === nextVersion)).toBeTrue();
    expect(result.summary).toContain("requires human review");
  });

  test("failed SDK checks remain failed and still produce a review summary", async () => {
    const result = await monitor(reviewedVersion, { sdkFailure: true });
    expect(result.sdk?.exitCode).toBe(33);
    expect(result.review?.exitCode).toBe(0);
    expect(result.calls.map(call => call.args)).toEqual([["install", "--ignore-scripts"], ["test"]]);
    expect(result.summary).toContain("SDK checks: failure");
  });

  test("unavailable or prerelease input cannot be reported as a completed stable comparison", async () => {
    for (const options of [{ unavailable: true }, { prerelease: true }]) {
      const result = await monitor(nextVersion, options);
      expect(result.release.exitCode).not.toBe(0);
      expect(result.sdk).toBeUndefined();
      expect(result.review).toBeUndefined();
    }
  });

  test("no matching stable release is unavailable rather than successful no-change", async () => {
    const result = await monitor(nextVersion, { noMatch: true });
    expect(result.release.exitCode).not.toBe(0);
    expect(result.sdk).toBeUndefined();
    expect(result.review).toBeUndefined();
  });

  test("new release still requires review when its SDK checks fail", async () => {
    const result = await monitor(nextVersion, { sdkFailure: true });
    expect(result.sdk?.exitCode).toBe(33);
    expect(result.review?.exitCode).toBe(1);
    expect(result.summary).toContain("SDK checks: failure");
    expect(result.summary).toContain("requires human review");
  });
});
