import { describe, expect, mock, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkBeadsStore,
  createGuardRuntime,
  guardNotice,
  parseVersion,
  type GuardRuntime,
} from "../src/guard";

const WHERE = JSON.stringify({ path: "/project/.beads", database_path: "/project/.beads/embeddeddolt" });

function runtime(options: {
  version?: string | Error;
  where?: string | Error;
  marker?: string | Error;
}): GuardRuntime & { bd: ReturnType<typeof mock>; readText: ReturnType<typeof mock> } {
  const bd = mock(async (_directory: string, args: readonly string[]) => {
    const value = args[0] === "version" ? options.version : options.where;
    if (value instanceof Error) throw value;
    return value ?? "";
  });
  const readText = mock(async (_path: string) => {
    if (options.marker instanceof Error) throw options.marker;
    return options.marker;
  });
  return { bd, readText };
}

describe("parseVersion", () => {
  test("reads bd version output and markers", () => {
    expect(parseVersion("bd version 1.3.1 (c1c4b642a: HEAD@c1c4b642ac1c)")).toEqual([1, 3, 1]);
    expect(parseVersion("1.2.2\n")).toEqual([1, 2, 2]);
    expect(parseVersion("1.3.1-rc.2")).toEqual([1, 3, 1]);
    expect(parseVersion("unknown")).toBeUndefined();
  });
});

describe("checkBeadsStore", () => {
  test("is ready when the store marker matches the installed binary", async () => {
    const fake = runtime({ version: "bd version 1.3.1 (abc)", where: WHERE, marker: "1.3.1\n" });
    expect(await checkBeadsStore("/project", fake)).toEqual({ kind: "ready" });
    expect(fake.bd).toHaveBeenCalledWith("/project", ["version"]);
    expect(fake.bd).toHaveBeenCalledWith("/project", ["where", "--json"]);
    expect(fake.readText).toHaveBeenCalledWith(path.join("/project/.beads", ".local_version"));
  });

  test("never invokes a command that opens the store", async () => {
    const fake = runtime({ version: "bd version 1.3.1", where: WHERE, marker: "1.2.2" });
    await checkBeadsStore("/project", fake);
    const commands = fake.bd.mock.calls.map((call) => (call[1] as string[])[0]);
    expect(commands).toEqual(["version", "where"]);
  });

  test("reports a pending migration for an older store marker", async () => {
    const fake = runtime({ version: "bd version 1.3.1", where: WHERE, marker: "1.2.2" });
    expect(await checkBeadsStore("/project", fake)).toEqual({
      kind: "migration-pending",
      installed: "1.3.1",
      store: "1.2.2",
    });
  });

  test("treats a missing or unreadable marker as possibly pending", async () => {
    expect(
      await checkBeadsStore("/p", runtime({ version: "bd version 1.3.1", where: WHERE }))
    ).toEqual({ kind: "migration-pending", installed: "1.3.1", store: undefined });
    expect(
      await checkBeadsStore(
        "/p",
        runtime({ version: "bd version 1.3.1", where: WHERE, marker: new Error("EACCES") })
      )
    ).toEqual({ kind: "migration-pending", installed: "1.3.1", store: undefined });
  });

  test("lets autoMigrate opt out of the marker check", async () => {
    const fake = runtime({ version: "bd version 1.3.1", where: WHERE, marker: "1.2.2" });
    expect(await checkBeadsStore("/project", fake, { autoMigrate: true })).toEqual({ kind: "ready" });
    expect(fake.readText).not.toHaveBeenCalled();
  });

  test("rejects binaries older than the supported minimum before locating the store", async () => {
    const fake = runtime({ version: "bd version 1.2.2 (6c124203e)", where: WHERE, marker: "1.2.2" });
    expect(await checkBeadsStore("/project", fake, { autoMigrate: true })).toEqual({
      kind: "unsupported",
      installed: "1.2.2",
    });
    expect(fake.bd).toHaveBeenCalledTimes(1);
  });

  test("treats a missing workspace as uninitialized", async () => {
    const noWorkspace = JSON.stringify({ error: "no_beads_directory", schema_version: 1 });
    expect(
      await checkBeadsStore("/p", runtime({ version: "bd version 1.3.1", where: noWorkspace }))
    ).toEqual({ kind: "uninitialized" });
    expect(
      await checkBeadsStore("/p", runtime({ version: "bd version 1.3.1", where: new Error("exit 1") }))
    ).toEqual({ kind: "uninitialized" });
    expect(
      await checkBeadsStore("/p", runtime({ version: "bd version 1.3.1", where: "not json" }))
    ).toEqual({ kind: "uninitialized" });
  });

  test("treats a missing or unparsable bd as unavailable", async () => {
    expect(await checkBeadsStore("/p", runtime({ version: new Error("ENOENT") }))).toEqual({
      kind: "unavailable",
    });
    expect(await checkBeadsStore("/p", runtime({ version: "garbage" }))).toEqual({
      kind: "unavailable",
    });
  });
});

describe("createGuardRuntime", () => {
  test("reads present markers and resolves undefined for missing ones", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "beads-guard-"));
    try {
      await writeFile(path.join(directory, ".local_version"), "1.3.1\n");
      const guardRuntime = createGuardRuntime(async () => "");
      expect(await guardRuntime.readText(path.join(directory, ".local_version"))).toBe("1.3.1\n");
      expect(await guardRuntime.readText(path.join(directory, "missing"))).toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("guardNotice", () => {
  test("tells the agent not to run bd while a migration may be pending", () => {
    const notice = guardNotice({ kind: "migration-pending", installed: "1.3.1", store: "1.2.2" });
    expect(notice).toContain("<beads-notice>");
    expect(notice).toContain("Do not run bd commands");
    expect(notice).toContain("bd migrate schema");
    expect(notice).toContain('"autoMigrate": true');
    expect(notice).toContain("bd 1.2.2");
  });

  test("names the minimum version for unsupported binaries", () => {
    const notice = guardNotice({ kind: "unsupported", installed: "1.2.2" });
    expect(notice).toContain("bd 1.2.2");
    expect(notice).toContain("1.3.0");
  });

  test("adds nothing for ready, uninitialized, or unavailable states", () => {
    expect(guardNotice({ kind: "ready" })).toBeUndefined();
    expect(guardNotice({ kind: "uninitialized" })).toBeUndefined();
    expect(guardNotice({ kind: "unavailable" })).toBeUndefined();
  });
});
