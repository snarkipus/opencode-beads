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
    const tool = tools.find((tool) => tool.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool.execute(input, context).then(result => {
      const schema = tool.output as { anyOf: Array<{ properties: Record<string, { const?: unknown }>; required: string[] }> };
      const branch = schema.anyOf.find(b => b.properties.status?.const === result.output.status);
      expect(branch).toBeDefined();
      for (const required of branch!.required) expect(Object.hasOwn(result.output as object, required)).toBeTrue();
      expect(Object.keys(result.output as object).every(k => k in branch!.properties)).toBeTrue();
      expect(result.output.operation).toBe(name);
      if (["claim", "note", "update", "close", "create", "remember"].includes(name)) expect(result.output.actor).toBe(executorActor(context));
      expect(JSON.parse(String(result.content))).toEqual(result.output);
      return result;
    });
  };
  return { tools, execute, bd, permission, acknowledged, dependencies,
    output: (value: string) => { output = value; },
    move: (value: string) => { directory = value; },
    workspace: (value: string) => { workspace = value; },
  };
}

describe("continuity adapter (plugin fixtures, not host qualification)", () => {
  test("declares eleven native namespace operations and structured output branches", () => {
    const f = fixture();
    expect(f.tools.map(t => t.name)).toEqual(["find", "get", "edges", "memories", "recall", "claim", "note", "update", "close", "create", "remember"]);
    for (const tool of f.tools) {
      expect(tool.options).toEqual({ namespace: "beads", permission: "shell", codemode: true });
      expect(tool.output).toHaveProperty("anyOf");
    }
  });
  const actor = "opencode:restricted-worker:960defe988fd";
  const row = { id: "task-1", title: "Task", status: "open", priority: 2, issue_type: "task" };
  const cases: Array<{ name: string; input: unknown; cli: unknown; args: string[]; result: Record<string, unknown> }> = [
    { name: "find", input: { view: "search", text: "--assignee=x", status: "open", assignee: actor, labels: ["a"], limit: 1 }, cli: [row, { ...row, id: "task-2" }], args: ["search", "--assignee", actor, "--status", "open", "--label", "a", "--limit", "2", "--json", "--sandbox", "--", "--assignee=x"], result: { status: "acknowledged", complete: false, limit: 1 } },
    { name: "get", input: { ids: ["task-1"] }, cli: [row], args: ["show", "task-1", "--json", "--sandbox"], result: { status: "acknowledged", issues: { "task-1": row }, failed: [], complete: true } },
    { name: "edges", input: { id: "task-1", direction: "up", types: ["blocks"] }, cli: [{ ...row, dependency_type: "blocks" }], args: ["dep", "list", "task-1", "--direction", "up", "--type", "blocks", "--json", "--sandbox"], result: { status: "acknowledged", complete: null, direction: "up" } },
    { name: "memories", input: { search: "--force" }, cli: { schema_version: 1, lesson: "text" }, args: ["memories", "--json", "--sandbox", "--", "--force"], result: { status: "found", memories: { lesson: "text" } } },
    { name: "recall", input: { key: "lesson" }, cli: { key: "lesson", found: true, value: "" }, args: ["recall", "lesson", "--json", "--sandbox"], result: { status: "found", value: "" } },
    { name: "claim", input: { id: "task-1" }, cli: [{ ...row, assignee: actor, status: "in_progress" }], args: ["update", "task-1", "--claim", "--json", "--actor", actor, "--sandbox"], result: { status: "acknowledged", reference: "task-1" } },
    { name: "note", input: { id: "task-1", text: "new\n'quoted'" }, cli: [{ ...row, notes: "prior\nnew\n'quoted'" }], args: ["update", "task-1", "--append-notes", "new\n'quoted'", "--json", "--actor", actor, "--sandbox"], result: { status: "acknowledged", reference: "task-1" } },
    { name: "update", input: { id: "task-1", set: { status: "blocked", priority: 1, addLabels: ["a"], removeLabels: ["b"] } }, cli: [{ ...row, status: "blocked", priority: 1, labels: ["a"] }], args: ["update", "task-1", "--status", "blocked", "--priority", "1", "--add-label", "a", "--remove-label", "b", "--json", "--actor", actor, "--sandbox"], result: { status: "acknowledged", reference: "task-1" } },
    { name: "close", input: { id: "task-1", reason: "Accepted" }, cli: [{ ...row, status: "closed" }], args: ["close", "task-1", "--reason", "Accepted", "--json", "--actor", actor, "--sandbox"], result: { status: "acknowledged", reference: "task-1" } },
    { name: "create", input: { title: "--assignee=x", type: "task", priority: 2, description: "d", acceptance: "a", design: "r", parent: "epic-1", discoveredFrom: "task-1", labels: ["a"] }, cli: { ...row, id: "generated-1", title: "--assignee=x" }, args: ["create", "--title", "--assignee=x", "--type", "task", "--priority", "2", "--description", "d", "--acceptance", "a", "--design", "r", "--parent", "epic-1", "--deps", "discovered-from:task-1", "--labels", "a", "--json", "--actor", actor, "--sandbox"], result: { status: "acknowledged", reference: "generated-1" } },
    { name: "remember", input: { key: "lesson", text: "text" }, cli: { key: "lesson", value: "text", action: "updated" }, args: ["remember", "--key", "lesson", "--json", "--actor", actor, "--sandbox", "--", "text"], result: { status: "acknowledged", reference: "lesson" } },
  ];
  for (const c of cases) test(`${c.name}: qualified argv, resource and declared success branch`, async () => {
    const f = fixture(); f.output(JSON.stringify(c.cli));
    expect((await f.execute(c.name, c.input)).output).toMatchObject(c.result);
    expect(f.bd.mock.calls.at(-1)?.[1]).toEqual(c.args);
    const quote = (a: string) => /^[a-zA-Z0-9_./:=-]+$/.test(a) ? a : "'" + a.replaceAll("'", "'\\''") + "'";
    expect(f.permission).toHaveBeenCalledWith(expect.objectContaining({ action: "shell", resources: [["bd", ...c.args].map(quote).join(" ")], save: [] }));
    f.output(JSON.stringify(c.name === "memories" ? { schema_version: 2 } : {}));
    expect((await f.execute(c.name, c.input)).output.status).toBe(["find", "get", "edges", "memories", "recall"].includes(c.name) ? "failed" : "uncertain");
  });
  test("batch get preserves per-ID failures; rechecks before the next child spawn", async () => {
    const f = fixture();
    f.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads"}';
      if (args[1] === "task-2") throw new PrimeProcessError(1, "not found", "bd show");
      return JSON.stringify([{ ...row, id: args[1] }]);
    });
    expect((await f.execute("get", { ids: ["task-1", "task-2"] })).output).toMatchObject({ status: "acknowledged", complete: false, failed: [{ id: "task-2", detail: expect.stringContaining("not found") }] });
    expect(f.permission.mock.calls).toHaveLength(1);
    expect((f.permission.mock.calls[0]![0] as { resources: string[] }).resources).toEqual(["bd show task-1 --json --sandbox", "bd show task-2 --json --sandbox"]);
    expect((await f.execute("get", { ids: ["task-2"] })).output).toMatchObject({ status: "failed", target: ["task-2"] });
    f.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads"}';
      f.move("/moved"); return JSON.stringify([row]);
    });
    const before = f.bd.mock.calls.filter(([,a]) => a[0] === "show").length;
    await expect(f.execute("get", { ids: ["task-1", "task-2"] })).rejects.toThrow("location");
    expect(f.bd.mock.calls.filter(([,a]) => a[0] === "show")).toHaveLength(before + 1);
  });
  test("find and edges distinguish bounded, unknown and failed data", async () => {
    const f = fixture(); f.output(JSON.stringify([row]));
    expect((await f.execute("find", { view: "list", limit: 2 })).output).toMatchObject({ complete: true });
    expect((await f.execute("find", { view: "blocked" })).output).toMatchObject({ complete: null });
    f.output('[{"id":"task-1"}]');
    expect((await f.execute("edges", { id: "task-1", direction: "down" })).output).toMatchObject({ status: "failed" });
    f.output("{}");
    expect((await f.execute("find", { view: "ready" })).output).toMatchObject({ status: "failed" });
    f.output(JSON.stringify([{ ...row, title: "" }]));
    expect((await f.execute("get", { ids: ["task-1"] })).output.status).toBe("failed");
    f.output('{"schema_version":1}');
    expect((await f.execute("memories", { search: undefined })).output.target).toEqual({});
  });
  test("claim uses observed non-claim evidence; ambiguous claim/create keep target and actor without retry", async () => {
    const f = fixture();
    f.output(JSON.stringify([{ ...row, assignee: "another-worker", status: "in_progress" }]));
    expect((await f.execute("claim", { id: "task-1" })).output).toMatchObject({ status: "uncertain", target: "task-1", actor });
    f.output("{}");
    expect((await f.execute("create", { title: "new task", type: "task", priority: 2 })).output).toMatchObject({ status: "uncertain", target: { title: "new task" }, actor });
    f.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads"}';
      throw new PrimeProcessError(1, 'Error updating task-1: issue already claimed\n' + JSON.stringify({ error: "1 of 1 issues failed to update", failed: [{ id: "task-1", error: 'updating issue: issue already claimed: already assigned to "fixture-owner" — coordinate with the holder' }], schema_version: 1 }), "bd update");
    });
    expect((await f.execute("claim", { id: "task-1" })).output).toMatchObject({ status: "not-claimed", target: "task-1", actor });
    expect(f.bd.mock.calls.filter(([,a]) => ["update", "create"].includes(a[0] ?? ""))).toHaveLength(3);
  });
  test("started abort preserves recovery uncertainty and notification failure retains the original diagnostic", async () => {
    const f = fixture(); const abort = new AbortController();
    f.dependencies.acknowledged = () => { throw new Error("notification failed"); };
    f.output("{}");
    expect((await f.execute("note", { id: "task-1", text: "evidence" })).output.detail).toContain("Unsupported CLI acknowledgement");
    expect((await f.execute("note", { id: "task-1", text: "evidence" })).output.detail).toContain("notification failed");
    const g = fixture();
    g.bd.mockImplementation(async (_cwd, args) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads"}';
      abort.abort(); throw abort.signal.reason;
    });
    await expect(g.execute("note", { id: "task-1", text: "pending" }, invocation(abort.signal))).rejects.toHaveProperty("name", "AbortError");
    expect(g.acknowledged).toHaveBeenCalledWith("session-1", expect.objectContaining({ status: "uncertain", target: "task-1", actor }));
  });
  test("rejects unsupported variants and ownership changes before permission", async () => {
    const f = fixture();
    for (const [name, input] of [["find", { view: "search", text: "q", parent: "epic" }], ["find", { view: "ready", status: "open" }], ["update", { id: "task-1", set: { status: "closed" } }], ["create", { title: "a", type: "task", priority: 2, assignee: actor }], ["get", { ids: ["task-1", "task-1"] }]] as const) await expect(f.execute(name, input)).rejects.toThrow();
    expect(f.permission).not.toHaveBeenCalled();
  });
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
    expect((await f.execute("note", { id: "task-1", text: "first\nsecond" })).output).toMatchObject({ status: "acknowledged", reference: "task-1" });
    expect(f.bd.mock.calls.at(-1)).toEqual(["/project", ["update", "task-1", "--append-notes", "first\nsecond", "--json", "--actor", "opencode:restricted-worker:960defe988fd", "--sandbox"], expect.anything()]);
    expect(f.permission).toHaveBeenCalledWith(expect.objectContaining({ action: "shell", agent: "restricted-worker", sessionID: "session-1", save: [], source: { type: "tool", messageID: "message-1", id: "call-1" }, resources: [expect.stringMatching(/^bd update task-1 --append-notes /)] }));
    expect((await f.execute("get", { ids: ["task-1"] })).output).toMatchObject({ status: "acknowledged", issues: { "task-1": { id: "task-1" } } });
    expect(f.bd.mock.calls.at(-1)).toEqual(["/project", ["show", "task-1", "--json", "--sandbox"], expect.anything()]);
    expect(f.bd.mock.calls.filter(([, args]) => args[0] === "update")).toHaveLength(1);
    expect(f.acknowledged).toHaveBeenCalledTimes(2);
  });
  test("uses fixed multiline argv, actual invocation permission identity and explicit executor actor", async () => {
    const f = fixture();
    expect(f.tools.map((tool) => tool.options?.permission)).toEqual(Array(11).fill("shell"));
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
    await expect(f.execute("note", { id: "task-1", text: "hello" })).rejects.toBe(denial);
    await expect(f.execute("get", { ids: ["task-1"] })).rejects.toBe(denial);
    expect(f.bd.mock.calls.every(([, args]) => ["version", "context"].includes(args[0] ?? ""))).toBeTrue();
  });

  test("rechecks cancellation and actual session location after approval", async () => {
    const f = fixture();
    const abort = new AbortController();
    f.permission.mockImplementation(async () => { abort.abort(); });
    await expect(f.execute("note", { id: "task-1", text: "hello" }, invocation(abort.signal))).rejects.toHaveProperty("name", "AbortError");
    f.permission.mockImplementation(async () => { f.move("/elsewhere"); });
    await expect(f.execute("get", { ids: ["task-1"] })).rejects.toThrow("location");
    expect(f.bd.mock.calls.some(([, args]) => args[0] === "recall")).toBeFalse();
  });

  test("preserves migration holds before and after shell approval", async () => {
    const f = fixture();
    f.dependencies.readText = async () => "1.2.0";
    await expect(f.execute("note", { id: "task-1", text: "progress" })).rejects.toThrow("held");
    const afterApproval = fixture();
    let marker = "1.3.1";
    afterApproval.dependencies.readText = async () => marker;
    afterApproval.permission.mockImplementation(async () => { marker = "1.2.0"; });
    await expect(afterApproval.execute("get", { ids: ["task-1"] })).rejects.toThrow("held");
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
    const show = tools.find((tool) => tool.name === "get")!;
    f.output('[{"id":"task-1"}]');
    await show.execute({ ids: ["task-1"] }, invocation());
    expect(f.permission).toHaveBeenCalledWith(expect.objectContaining({ action: "external_directory", resources: ["/external/work/*"], save: [], agent: "restricted-worker" }));
    f.permission.mockImplementation(async (input) => {
      if ((input as { action: string }).action === "external_directory") throw new Error("external denied");
    });
    await expect(show.execute({ ids: ["task-1"] }, invocation())).rejects.toThrow("external denied");
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
      expect((await f.execute("get", { ids: ["task-1"] })).output).toMatchObject({ status: "acknowledged", issues: { "task-1": { id: "task-1" } } });
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
    expect((await f.execute("memories", { search: "--force" })).output).toMatchObject({ status: "found", memories: {} });
    expect(f.bd.mock.calls.at(-1)?.[1]).toEqual(["memories", "--json", "--sandbox", "--", "--force"]);
  });

  test("treats exit zero without a matching acknowledgement as uncertain and never retries", async () => {
    const f = fixture();
    f.output("{}");
    expect((await f.execute("note", { id: "task-1", text: "hello" })).output).toMatchObject({ status: "uncertain" });
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
    expect((await f.execute("note", { id: "task-1", text: "hello" })).output).toMatchObject({ status: "uncertain" });
    expect(f.bd.mock.calls.filter(([, args]) => args[0] === "update")).toHaveLength(1);
  });

  test("accepts versioned memory lists without treating schema metadata as memory", async () => {
    for (const entries of [{}, { lesson: "first\nsecond" }]) {
      const f = fixture();
      f.output(JSON.stringify({ ...entries, schema_version: 1 }));
      const result = await f.execute("memories", {});
      expect(result.output).toMatchObject({ status: "found" });
      expect(result.output.memories).toEqual(entries);
    }
  });

  test("rejects unsupported memory metadata and non-string memory values", async () => {
    for (const payload of [
      { schema_version: 2, lesson: "text" },
      { schema_version: 1, lesson: 42 },
      { schema_version: 1, lesson: "text", other_metadata: 1 },
    ]) {
      const f = fixture();
      f.output(JSON.stringify(payload));
      expect((await f.execute("memories", {})).output).toMatchObject({ status: "failed" });
    }
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
