import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMissingIssue, matchesAssigneeView } from "../scripts/bd-contract";
import { PrimeProcessError } from "../src/prime";

test("named assignee views require the native list shape and expected issue", () => {
  for (const value of [undefined, null, {}, { id: "contract-1" }, "[]", [null]]) {
    expect(matchesAssigneeView(value, "ready", "contract-1")).toBe(false);
  }
  expect(matchesAssigneeView([], "ready", "contract-1")).toBe(true);
  for (const view of ["list", "search"] as const) {
    expect(matchesAssigneeView([{ id: "contract-1" }], view, "contract-1")).toBe(true);
    expect(matchesAssigneeView({ id: "contract-1" }, view, "contract-1")).toBe(false);
    expect(matchesAssigneeView([{ id: "contract-2" }], view, "contract-1")).toBe(false);
  }
});

test("missing issue requires the native exit status and both diagnostics", () => {
  const id = "contract-not-found";
  const stdout = JSON.stringify({ error: "no issues found matching the provided IDs", schema_version: 1 });
  const stderr = `Issue ${id} not found\nHint: fixture\n`;
  expect(isMissingIssue(new PrimeProcessError(1, stderr, "bd show", stdout), id)).toBe(true);
  for (const error of [
    new Error("failed to start"),
    new PrimeProcessError(2, stderr, "bd show", stdout),
    new PrimeProcessError(1, stderr, "bd show", "{"),
    new PrimeProcessError(1, stderr, "bd show", '{"error":"database unavailable"}'),
    new PrimeProcessError(1, "Issue other-id not found", "bd show", stdout),
    new PrimeProcessError(1, "", "bd show", stdout),
  ]) {
    expect(isMissingIssue(error, id)).toBe(false);
  }
});

test.skipIf(process.platform === "win32")("only the allocator cleans scratch after fixture setup fails", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "contract-ownership-test-"));
  try {
    const scratch = join(directory, "scratch");
    const unowned = join(directory, "unowned");
    const bin = join(directory, "bin");
    await Promise.all([scratch, unowned, bin].map((dir) => fs.mkdir(dir)));
    await fs.writeFile(join(unowned, "sentinel"), "keep");
    await fs.writeFile(
      join(bin, "git"),
      '#!/bin/sh\nprintf "%s|%s|%s|%s|%s|%s\\n" "$PWD" "$HOME" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "${BEADS_DIR-unset}" "$TMPDIR" > "${0%/*}/observed"\nexit 1\n',
      { mode: 0o755 },
    );
    const child = Bun.spawnSync(
      [process.execPath, fileURLToPath(new URL("../scripts/bd-contract.ts", import.meta.url))],
      {
        cwd: directory,
        env: {
          PATH: `${bin}:/usr/bin:/bin`,
          HOME: unowned,
          TMPDIR: scratch,
          BD_CONTRACT_ROOT: unowned,
          BEADS_DIR: unowned,
        },
      },
    );
    expect(child.exitCode).toBe(1);
    expect(child.stderr.toString()).toContain("git init -q failed");
    const [repo, home, config, data, beadsDir, fixtureTemp] = (await fs.readFile(join(bin, "observed"), "utf8"))
      .trim()
      .split("|");
    expect(repo).toStartWith(`${scratch}/bd-contract-`);
    expect(repo).toBe(`${home?.replace(/\/home$/, "")}/repo`);
    expect(config).toBe(`${home}/.config`);
    expect(data).toBe(`${home}/.local/share`);
    expect(beadsDir).toBe("unset");
    expect(repo).toBe(join(fixtureTemp ?? "", "repo"));
    expect(await fs.readdir(scratch)).toEqual([]);
    expect(await fs.readdir(unowned)).toEqual(["sentinel"]);
    expect(await fs.readFile(join(unowned, "sentinel"), "utf8")).toBe("keep");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
