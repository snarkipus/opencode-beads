import { describe, expect, mock, test } from "bun:test";
import type { ToolContext } from "@opencode/plugin/promise/tool";
import { createContinuityTools, executorActor, type ContinuityDependencies, type ContinuityHost } from "../src/continuity";
import { PrimeProcessError, PrimeTimeoutError, type PrimeExecutionOptions } from "../src/prime";

const invocation = (signal = new AbortController().signal) => ({
  sessionID: "session-1", agent: "restricted-worker", messageID: "message-1", id: "call-1", signal,
  progress: async () => {},
}) as unknown as ToolContext;

function fixture() {
  let output = JSON.stringify({key: 'lesson', value: 'first\nsecond', action: 'remembered'});
  let directory = "/project";
  let workspace = "/project/.beads";
  const permission = mock(async (_input: unknown) => {});
  const acknowledged = mock((_sessionID: string, _result: unknown) => {});
  const bd = mock(async (_cwd: string, args: readonly string[], _options?: PrimeExecutionOptions) => {
    if (args[0] === "version") return "bd version 1.3.1";
    if (args[0] === "context") return JSON.stringify({ beads_dir: workspace, backend: "dolt", dolt_mode: "embedded", database: "beads" });
    return output;
  });
  const host = {
    location: { directory: "/project", project: { directory: "/project" } },
    permission: { assert: permission },
    session: { get: async () => ({ location: { directory } }) },
  } as unknown as ContinuityHost;
  const dependencies: ContinuityDependencies = {
    bd, acknowledged,
    realpath: async (path) => path,
    readText: async () => "1.3.1",
  };
  const tools = createContinuityTools(host, dependencies);
  const execute = (name: string, input: unknown, context = invocation()) => {
    const tool = tools.find((tool) => tool.name === `beads_${name}`);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool.execute(input, context);
  };
  return { tools, execute, bd, permission, acknowledged, dependencies,
    output: (value: string) => { output = value; },
    move: (value: string) => { directory = value; },
    workspace: (value: string) => { workspace = value; },
  };
}

describe("continuity adapter (plugin fixtures, not host qualification)", () => {
  test("derives stable audit attribution from actual session and executor, independently of Git identity", () => {
    expect(executorActor(invocation())).toBe("opencode:restricted-worker:960defe988fd");
    expect(executorActor({ ...invocation(), id: "another-call" } as unknown as ToolContext)).toBe(executorActor(invocation()));
    expect(executorActor({ ...invocation(), agent: "another-worker" } as unknown as ToolContext)).not.toBe(executorActor(invocation()));
    expect(executorActor({ ...invocation(), sessionID: "another-session" } as unknown as ToolContext)).not.toBe(executorActor(invocation()));
    expect(() => executorActor({ ...invocation(), agent: "" } as ToolContext)).toThrow("executor");
  });
  test("executes fixed checkpoint/show operations in actual project context with explicit write attribution", async () => {
    const f = fixture();
    f.output(JSON.stringify([{ id: "task-1", notes: "previous\nfirst\nsecond" }]));
    expect((await f.execute("checkpoint", { id: "task-1", text: "first\nsecond" })).output).toMatchObject({ status: "acknowledged", reference: "task-1" });
    expect(f.bd.mock.calls.at(-1)).toEqual(["/project", ["update", "task-1", "--append-notes", "first\nsecond", "--json", "--actor", "opencode:restricted-worker:960defe988fd", "--sandbox"], expect.anything()]);
    expect(f.permission).toHaveBeenCalledWith(expect.objectContaining({ action: "shell", agent: "restricted-worker", sessionID: "session-1", save: [], source: { type: "tool", messageID: "message-1", id: "call-1" }, resources: [expect.stringMatching(/^bd update task-1 --append-notes /)] }));
    expect((await f.execute("show", { id: "task-1" })).output).toMatchObject({ status: "acknowledged", reference: "task-1" });
    expect(f.bd.mock.calls.at(-1)).toEqual(["/project", ["show", "task-1", "--json", "--sandbox"], expect.anything()]);
    expect(f.bd.mock.calls.filter(([, args]) => args[0] === "update")).toHaveLength(1);
    expect(f.acknowledged).toHaveBeenCalledTimes(1);
  });
  test("uses fixed multiline argv, actual invocation permission identity and explicit executor actor", async () => {
    const f = fixture();
    expect(f.tools.map((tool) => tool.options?.permission)).toEqual(Array(5).fill("shell"));
    const result = await f.execute("remember", { key: "lesson", text: "first\nsecond" });
    expect(f.bd.mock.calls.at(-1)).toEqual(["/project", ["remember", "--key", "lesson", "--json", "--actor", "opencode:restricted-worker:960defe988fd", "--sandbox", "--", "first\nsecond"], expect.anything()]);
    expect(f.permission).toHaveBeenCalledWith(expect.objectContaining({
      action: "shell", agent: "restricted-worker", sessionID: "session-1", save: [],
      source: { type: "tool", messageID: "message-1", id: "call-1" },
      resources: [expect.stringMatching(/^bd remember --key lesson /)],
    }));
    expect(result.output).toMatchObject({ status: "acknowledged", reference: "lesson" });
    expect(f.acknowledged).toHaveBeenCalledTimes(1);
  });

  test("rejects denied access, missing executor attribution and model supplied actor before mutation", async () => {
    const f = fixture();
    await expect(f.execute("remember", { key: "lesson", text: "hello" }, { ...invocation(), agent: "" } as ToolContext)).rejects.toThrow("executor");
    await expect(f.execute("remember", { key: "lesson", text: "hello", actor: "human" })).rejects.toThrow("actor");
    const denial = new Error("permission rejected");
    f.permission.mockImplementation(async () => { throw denial; });
    await expect(f.execute("checkpoint", { id: "task-1", text: "hello" })).rejects.toBe(denial);
    await expect(f.execute("show", { id: "task-1" })).rejects.toBe(denial);
    expect(f.bd.mock.calls.every(([, args]) => ["version", "context"].includes(args[0] ?? ""))).toBeTrue();
  });

  test("rechecks cancellation and actual session location after approval", async () => {
    const f = fixture();
    const abort = new AbortController();
    f.permission.mockImplementation(async () => { abort.abort(); });
    await expect(f.execute("checkpoint", { id: "task-1", text: "hello" }, invocation(abort.signal))).rejects.toHaveProperty("name", "AbortError");
    f.permission.mockImplementation(async () => { f.move("/elsewhere"); });
    await expect(f.execute("show", { id: "task-1" })).rejects.toThrow("location");
    expect(f.bd.mock.calls.some(([, args]) => args[0] === "recall")).toBeFalse();
  });

  test("preserves migration holds before and after shell approval", async () => {
    const f = fixture();
    f.dependencies.readText = async () => "1.2.0";
    await expect(f.execute("checkpoint", { id: "task-1", text: "progress" })).rejects.toThrow("held");
    const afterApproval = fixture();
    let marker = "1.3.1";
    afterApproval.dependencies.readText = async () => marker;
    afterApproval.permission.mockImplementation(async () => { marker = "1.2.0"; });
    await expect(afterApproval.execute("show", { id: "task-1" })).rejects.toThrow("held");
    for (const candidate of [f, afterApproval]) {
      expect(candidate.bd.mock.calls.some(([, args]) => ["update", "show"].includes(args[0] ?? ""))).toBeFalse();
    }
  });

  test("checks external access for the explicit resolved invocation directory, preserving denial and save:[]", async () => {
    const f = fixture();
    const host = {
      location: { directory: "/project", project: { directory: "/project" } },
      permission: { assert: f.permission },
      session: { get: async () => ({ location: { directory: "/project" } }) },
    } as unknown as ContinuityHost;
    const tools = createContinuityTools(host, { ...f.dependencies, realpath: async (path) => path === "/project" ? "/external/work" : path });
    const show = tools.find((tool) => tool.name === "beads_show")!;
    f.output('[{"id":"task-1"}]');
    await show.execute({ id: "task-1" }, invocation());
    expect(f.permission).toHaveBeenCalledWith(expect.objectContaining({ action: "external_directory", resources: ["/external/work/*"], save: [], agent: "restricted-worker" }));
    f.permission.mockImplementation(async (input) => {
      if ((input as { action: string }).action === "external_directory") throw new Error("external denied");
    });
    await expect(show.execute({ id: "task-1" }, invocation())).rejects.toThrow("external denied");
    expect(f.bd.mock.calls.filter(([, args]) => args[0] === "show")).toHaveLength(1);
  });

  test("leaves inherited Beads routing and backend choice to the installed CLI", async () => {
    const f = fixture();
    const previous = process.env.BEADS_DIR;
    f.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/shared/.beads","backend":"dolt","dolt_mode":"server","database":"team"}';
      return '[{"id":"task-1"}]';
    });
    try {
      f.permission.mockImplementation(async () => { process.env.BEADS_DIR = "/shared/.beads"; });
      expect((await f.execute("show", { id: "task-1" })).output).toMatchObject({ status: "acknowledged", reference: "task-1" });
      expect(process.env.BEADS_DIR).toBe("/shared/.beads");
      expect(f.bd.mock.calls.at(-1)).toEqual(["/project", ["show", "task-1", "--json", "--sandbox"], expect.anything()]);
      expect(f.permission.mock.calls.every(([input]) => (input as { action: string }).action === "shell")).toBeTrue();
    } finally {
      if (previous === undefined) delete process.env.BEADS_DIR;
      else process.env.BEADS_DIR = previous;
    }
  });

  test("unload aborts a pending approval and a later approval cannot spawn", async () => {
    const f = fixture();
    const abort = new AbortController();
    let approve: () => void = () => {};
    f.permission.mockImplementation(() => new Promise<void>((resolve) => { approve = resolve; }));
    const pending = f.execute("recall", { key: "lesson" }, invocation(abort.signal));
    for (let i = 0; i < 20 && f.permission.mock.calls.length === 0; i++) await new Promise((resolve) => setTimeout(resolve, 0));
    abort.abort();
    await expect(pending).rejects.toHaveProperty("name", "AbortError");
    approve();
    await Promise.resolve();
    expect(f.bd.mock.calls.some(([, args]) => args[0] === "recall")).toBeFalse();
  });

  test("keeps quoted multiline content as a single argv value and exposes no force or arbitrary execution fields", async () => {
    const f = fixture();
    const text = "first\n'quoted' $(echo never) `never` --force";
    f.output(JSON.stringify({ key: "lesson", value: text, action: "remembered" }));
    await f.execute("remember", { key: "lesson", text });
    const argv = f.bd.mock.calls.at(-1)?.[1];
    expect(argv).toEqual(["remember", "--key", "lesson", "--json", "--actor", "opencode:restricted-worker:960defe988fd", "--sandbox", "--", text]);
    await expect(f.execute("remember", { key: "lesson", text: "hello", force: true })).rejects.toThrow("force");
    await expect(f.execute("recall", { key: "lesson", cwd: "/elsewhere" })).rejects.toThrow("cwd");
    f.output("{}");
    expect((await f.execute("memories", { search: "--force" })).output).toMatchObject({ status: "acknowledged", data: {} });
    expect(f.bd.mock.calls.at(-1)?.[1]).toEqual(["memories", "--json", "--sandbox", "--", "--force"]);
  });

  test("treats exit zero without a matching acknowledgement as uncertain and never retries", async () => {
    const f = fixture();
    f.output("{}");
    expect((await f.execute("checkpoint", { id: "task-1", text: "hello" })).output).toMatchObject({ status: "uncertain" });
    expect(f.bd.mock.calls.filter(([, args]) => args[0] === "update")).toHaveLength(1);
  });

  test("distinguishes landed but uncommitted memory and interrupted writes without retry", async () => {
    const f = fixture();
    f.output(JSON.stringify({ key: "lesson", value: "validated finding", action: "remembered", committed: false, commit_error: "dirty keys", commit_indeterminate: true }));
    expect((await f.execute("remember", { key: "lesson", text: "validated finding" })).output).toMatchObject({ status: "landed-uncommitted", reference: "lesson", commitIndeterminate: true });
    f.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads","backend":"dolt","dolt_mode":"embedded","database":"beads"}';
      throw new PrimeTimeoutError(1);
    });
    expect((await f.execute("checkpoint", { id: "task-1", text: "hello" })).output).toMatchObject({ status: "uncertain" });
    expect(f.bd.mock.calls.filter(([, args]) => args[0] === "update")).toHaveLength(1);
  });

  test("distinguishes empty found memory, missing-key exit and CLI failure", async () => {
    const f = fixture();
    f.output('{"key":"lesson","value":"","found":true}');
    expect((await f.execute("recall", { key: "lesson" })).output).toMatchObject({ status: "found", value: "" });
    f.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads","backend":"dolt","dolt_mode":"embedded","database":"beads"}';
      throw new PrimeProcessError(1, "", "bd recall", '{"key":"lesson","value":"","found":false}');
    });
    expect((await f.execute("recall", { key: "lesson" })).output).toMatchObject({ status: "missing" });
    f.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads"}';
      throw new PrimeProcessError(1, "database unavailable", "bd recall");
    });
    expect((await f.execute("recall", { key: "lesson" })).output).toMatchObject({ status: "failed", detail: expect.stringContaining("database unavailable") });
  });
});
