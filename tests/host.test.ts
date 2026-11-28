import { Effect } from "effect";
import { fromRequest as serializeChatRequest } from "@opencode/ai/protocols/openai-chat";
import { createHash } from "node:crypto";
import { make } from "@opencode/ai";
import { Message } from "@opencode/ai/effect";
import { configure } from "@opencode/ai/providers/openai";
import baseline from "./fixtures/non-sync-command-baseline.json";
import { describe, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as pluginModule from "../src/plugin";
import { renderBeadsContext } from "../src/context";
import { setupBeads, type HostContext } from "../src/host";
import type { CommandDefinition, CommandInvocation } from "@opencode/plugin/promise/command";
import type { ContinuityHost } from "../src/continuity";
import { Error as ToolError, type Info, type ToolContext, type ToolDomain } from "@opencode/plugin/promise/tool";
import type { SessionContext, SessionCompaction } from "@opencode/plugin/promise/session";
import { executorActor } from "../src/continuity";
import { PrimeProcessError, PrimeTimeoutError } from "../src/prime";
import { renderHealthReport, type DiagnosticsSnapshot } from "../src/diagnostics";
import * as diagnosticPresentation from "../src/diagnostics";
import type { PluginHealthObservation } from "../src/diagnostics-collection";
import { DEFAULT_TASK_AGENT_STEPS, TASK_AGENT_PERMISSIONS } from "../src/agents";
import { BEADS_COMPACTION_GUIDANCE, primeFailureNotice } from "../src/guidance";

type ContextEvent = {
  messages?: SessionContext["messages"];
  tools?: Record<string, unknown>;
  sessionID: string;
  agent: string;
  system: Array<{ type: "text"; text: string }>;
};
type ToolAfterEvent = Extract<Parameters<Parameters<ToolDomain["hook"]>[1]>[0], { status: string }>;
type StoredSessionMessage = Awaited<ReturnType<HostContext["session"]["context"]>>[number];
type StoredUserMessage = Extract<StoredSessionMessage, { type: "user" }>;

function storedUserMessage(id: string, text: string, metadata?: StoredUserMessage["metadata"]): StoredUserMessage {
  return { id, type: "user", time: { created: 1 }, text, ...(metadata === undefined ? {} : { metadata }) };
}

/** A controllable server event stream. */
function eventStream() {
  const queue: unknown[] = [];
  let wake: () => void = () => {};
  let signal: AbortSignal | undefined;
  async function* subscribe(input?: { signal?: AbortSignal }) {
    signal = input?.signal;
    while (!signal?.aborted) {
      const next = queue.shift();
      if (next !== undefined) {
        yield next;
        continue;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
        signal?.addEventListener("abort", () => resolve(), { once: true });
      });
    }
  }
  return {
    subscribe,
    push(event: unknown) {
      queue.push(event);
      wake();
    },
    aborted: () => signal?.aborted === true,
  };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 5; index++) await new Promise((resolve) => setTimeout(resolve, 0));
}

function fakeContext(
  options: {
    directory?: string;
    pluginOptions?: Record<string, unknown>;
    appVersion?: string;
  } = {},
) {
  const hooks = new Map<string, (event: ContextEvent) => Promise<void> | void>();
  const events = eventStream();
  const agentGet = mock(async ({ agentID }: { agentID: string }) => ({
    data: { id: agentID, mode: agentID === "explore" ? "subagent" : "primary" },
  }));
  // Mirrors OpenCode: update() on an unknown ID starts from defaults.
  const agents = new Map<string, Record<string, unknown>>();
  const editor = {
    update(id: string, update: (agent: Record<string, unknown>) => void) {
      const agent = agents.get(id) ?? { id, name: id, mode: "primary", hidden: false, permissions: [] };
      update(agent);
      agents.set(id, agent);
    },
  };
  const agentTransform = mock(async (callback: (input: typeof editor) => void) => {
    callback(editor);
    return { dispose: async () => {} };
  });
  const ctx = {
    app: { name: "OpenCode", version: options.appVersion ?? "2.3.0", channel: "stable" },
    location: { directory: options.directory ?? "/project" },
    options: options.pluginOptions ?? {},
    event: { subscribe: events.subscribe },
    agent: { get: agentGet, transform: agentTransform },
    session: {
      context: mock(async () => []),
      hook: mock(async (name: string, callback: (event: ContextEvent) => void) => {
        hooks.set(name, (event) => {
          event.messages ??= [];
          return callback(event);
        });
        return { dispose: async () => {} };
      }),
    },
  } as unknown as HostContext;

  async function request(sessionID: string, agent: string, tools?: Record<string, unknown>): Promise<string[]> {
    const event: ContextEvent = {
      sessionID,
      agent,
      ...(tools ? { tools } : {}),
      system: [{ type: "text", text: "HOST" }],
    };
    const hook = hooks.get("context");
    if (!hook) throw new Error("context hook not registered");
    await hook(event);
    return event.system.slice(1).map((part) => part.text);
  }

  return { ctx, hooks, events, agentGet, agents, request };
}

/** Capture public hook/registration callbacks, without simulating host child transport. */
function toolFixture(f: ReturnType<typeof fakeContext>) {
  const tools: Info[] = [];
  const namespaces: unknown[] = [];
  let after: (event: ToolAfterEvent) => Promise<void> | void = () => {};
  const hook: ToolDomain["hook"] = async (name, callback) => {
    if (name === "execute.after") after = callback as typeof after;
    return { dispose: async () => {} };
  };
  const transform: ToolDomain["transform"] = async (callback) => {
    callback({
      namespace: (value: unknown) => {
        namespaces.push(value);
      },
      add: (tool: Info) => {
        tools.push(tool);
      },
    } as unknown as Parameters<typeof callback>[0]);
    return { dispose: async () => {} };
  };
  Object.assign(f.ctx, { tool: { hook, transform } });
  return { tools, namespaces, after: (event: ToolAfterEvent) => after(event) };
}

// The 2.4 SDK requires codemode; the 2.3 SDK does not declare it.
const nonCodeMode = { codemode: false };

/** Cast only host-branded IDs at the fixture boundary. */
function invocation(sessionID: string, agent: string, signal = new AbortController().signal): ToolContext {
  return {
    sessionID,
    agent,
    messageID: `message-${sessionID}`,
    id: `call-${sessionID}`,
    signal,
    progress: async () => {},
  } as unknown as ToolContext;
}

describe("OpenCode V2 entry", () => {
  test("default-exports a V2 plugin definition and nothing else", () => {
    expect(Object.keys(pluginModule)).toEqual(["default"]);
    expect(pluginModule.default.id).toBe("opencode-beads");
    expect(typeof pluginModule.default.setup).toBe("function");
  });
});

describe("public beta entrypoint", () => {
  test("does not register typed operations when native permission or session interfaces are unavailable", async () => {
    for (const missing of ["permission", "session"]) {
      const f = fakeContext();
      const t = toolFixture(f);
      if (missing === "session") Object.assign(f.ctx, { permission: { assert: async () => {} } });
      else Object.assign(f.ctx.session, { get: async () => ({ location: { directory: "/project" } }) });
      const cleanup = await pluginModule.default.setup(f.ctx as Parameters<typeof pluginModule.default.setup>[0]);
      expect(t.tools).toEqual([]);
      await cleanup!();
    }
  });

  test("registers the eleven code-mode operations without injected dependencies and disposes owned tools", async () => {
    const f = fakeContext();
    const tools: Info[] = [];
    const namespaces: unknown[] = [];
    const dispose = mock(async () => {});
    Object.assign(f.ctx, {
      permission: { assert: async () => {} },
      tool: {
        hook: async () => ({ dispose }),
        transform: async (callback: Parameters<ToolDomain["transform"]>[0]) => {
          callback({
            list: () => [],
            get: () => undefined,
            update: () => {},
            remove: () => {},
            namespace: (namespace) => {
              namespaces.push(namespace);
            },
            add: (tool) => {
              tools.push(tool);
            },
          });
          return { dispose };
        },
      },
    });
    Object.assign(f.ctx.session, { get: async () => ({ location: { directory: "/project" } }) });
    const cleanup = await pluginModule.default.setup(f.ctx as Parameters<typeof pluginModule.default.setup>[0]);
    expect(namespaces).toEqual([expect.objectContaining({ name: "beads" })]);
    expect(tools.map((tool) => tool.name).sort()).toEqual(
      ["find", "get", "edges", "memories", "recall", "claim", "note", "update", "close", "create", "remember"].sort(),
    );
    expect(tools.every((tool) => tool.options?.codemode === true && tool.options.namespace === "beads")).toBeTrue();
    await cleanup!();
    expect(dispose).toHaveBeenCalledTimes(2);
  });
});

describe("setupBeads", () => {
  test("refreshes recovery state for external changes, isolates fork/move/audience and never restarts on interruption", async () => {
    const f = fakeContext();
    let directory = "/project";
    let output = "FIRST";
    Object.assign(f.ctx.session, { get: async () => ({ location: { directory } }) });
    const prime = mock(async () => output);
    const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime } });
    await f.request("s1", "build");
    await f.request("s10", "build");
    output = "EXTERNAL CHANGE";
    f.events.push({ type: "session.execution.started", data: { sessionID: "s1" } });
    await settle();
    const recovered = await f.request("s1", "build");
    expect(recovered[0]).toContain("EXTERNAL CHANGE");
    expect(recovered[1]).toContain("Cached absence is not proof of absence");
    expect((await f.request("s10", "build"))[0]).toContain("FIRST");
    expect((await f.request("fork", "build"))[0]).toContain("EXTERNAL CHANGE");
    const hidden: ContextEvent = { sessionID: "s1", agent: "explore", system: [] };
    await f.hooks.get("compaction")!(hidden);
    expect(hidden.system).toEqual([]);
    f.events.push({ type: "session.execution.interrupted", data: { sessionID: "s1" } });
    await settle();
    const count = prime.mock.calls.length;
    await settle();
    expect(prime).toHaveBeenCalledTimes(count);
    directory = "/elsewhere";
    f.events.push({ type: "session.moved", data: { sessionID: "s1" } });
    await settle();
    expect(await f.request("s1", "build")).toEqual([]);
    expect(prime).toHaveBeenCalledTimes(count);
    cleanup();
  });

  test("normal adapter writes invalidate location caches once and compaction only carries acknowledged references/gaps", async () => {
    const f = fakeContext();
    const tools: Info[] = [];
    let after: (event: any) => unknown = () => {};
    const disposed = mock(async () => {});
    Object.assign(f.ctx, {
      tool: {
        hook: async (_name: string, callback: typeof after) => {
          after = callback;
          return { dispose: disposed };
        },
      },
    });
    const host = {
      location: { directory: "/project", project: { directory: "/project" } },
      permission: { assert: mock(async () => {}) },
      session: { get: async () => ({ location: { directory: "/project" } }) },
      tool: {
        transform: async (callback: (editor: { namespace(input: unknown): void; add(tool: Info): void }) => void) => {
          callback({ namespace: () => {}, add: (tool) => tools.push(tool) });
          return { dispose: disposed };
        },
      },
    } as unknown as ContinuityHost & { tool: { transform: any } };
    let output = "BEFORE";
    const prime = mock(async () => output);
    const acknowledged = mock(() => {});
    const bd = mock(async (_cwd: string, args: readonly string[]) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context")
        return '{"beads_dir":"/project/.beads","backend":"dolt","dolt_mode":"embedded","database":"beads"}';
      return '{"key":"lesson","value":"validated finding","action":"remembered","committed":false,"commit_error":"not committed"}';
    });
    Object.assign(f.ctx, {
      location: host.location,
      permission: host.permission,
      tool: { ...f.ctx.tool, ...host.tool },
    });
    Object.assign(f.ctx.session, host.session);
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime },
      continuityQualified: true,
      continuity: {
        bd,
        acknowledged,
        realpath: async (path) => path,
      },
    });
    await f.request("s1", "build");
    await f.request("s2", "build");
    const tool = tools.find((tool) => tool.name === "remember")!;
    const context = {
      sessionID: "s1",
      agent: "worker",
      messageID: "m1",
      id: "c1",
      signal: new AbortController().signal,
      progress: async () => {},
    } as unknown as ToolContext;
    const result = await tool.execute({ key: "lesson", text: "validated finding" }, context);
    await after({ ...context, tool: "beads_remember", status: "completed", result });
    await after({ ...context, tool: "execute", status: "completed", result });
    expect(acknowledged).toHaveBeenCalledTimes(1);
    expect(bd.mock.calls.filter(([, args]) => args[0] === "remember")).toHaveLength(1);
    output = "AFTER";
    expect((await f.request("s2", "build"))[0]).toContain("AFTER");
    const count = bd.mock.calls.length;
    const event: ContextEvent = { sessionID: "s1", agent: "build", system: [] };
    await f.hooks.get("compaction")!(event);
    expect(event.system[1]?.text).toContain("memory:lesson");
    expect(event.system[1]?.text).toContain("landed-uncommitted");
    expect(bd).toHaveBeenCalledTimes(count);
    cleanup();
    expect(disposed).toHaveBeenCalledTimes(2);
  });

  test("retains unresolved write identities across partial reads, interruption and recovery", async () => {
    const f = fakeContext();
    const t = toolFixture(f);
    const stopped = new AbortController();
    const writer = invocation("s1", "build", stopped.signal);
    const otherWriter = invocation("s1", "worker");
    const bd = mock(async (_cwd: string, args: readonly string[]) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads"}';
      if (args[0] === "update" && args[3] === "started note") {
        stopped.abort(new Error("fixture write interrupted"));
        throw stopped.signal.reason;
      }
      if (args[0] === "update") return JSON.stringify([{ id: args[1], notes: args[3] }]);
      if (args[0] === "remember")
        return JSON.stringify({
          key: "lesson-uncommitted",
          value: "finding",
          action: "remembered",
          committed: false,
          commit_error: "fixture commit failed",
        });
      if (args[0] === "list")
        return JSON.stringify(
          ["read-1", "read-2"].map((id) => ({ id, title: id, status: "open", priority: 2, issue_type: "task" })),
        );
      throw new Error("fixture read failed");
    });
    Object.assign(f.ctx, {
      location: { directory: "/project", project: { directory: "/project" } },
      permission: { assert: async () => {} },
    });
    Object.assign(f.ctx.session, { get: async () => ({ location: { directory: "/project" } }) });
    const cleanup = await setupBeads(f.ctx, {
      continuityQualified: true,
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "PRIME" },
      continuity: { bd, realpath: async (p) => p },
    });
    try {
      await f.request("s1", "build");
      await expect(
        t.tools.find((tool) => tool.name === "note")!.execute({ id: "task-first", text: "started note" }, writer),
      ).rejects.toThrow("fixture write interrupted");
      expect(
        (
          await t.tools
            .find((tool) => tool.name === "remember")!
            .execute({ key: "lesson-uncommitted", text: "finding" }, otherWriter)
        ).output.status,
      ).toBe("landed-uncommitted");
      const read = invocation("s1", "build");
      expect(
        (await t.tools.find((tool) => tool.name === "find")!.execute({ view: "list", limit: 1 }, read)).output,
      ).toMatchObject({ status: "acknowledged", complete: false });
      expect(
        (await t.tools.find((tool) => tool.name === "get")!.execute({ ids: ["unavailable-task"] }, read)).output.status,
      ).toBe("failed");
      // Even a later acknowledged write to the same target does not resolve the earlier append.
      expect(
        (await t.tools.find((tool) => tool.name === "note")!.execute({ id: "task-first", text: "later note" }, read))
          .output.status,
      ).toBe("acknowledged");
      f.events.push({ type: "session.execution.interrupted", data: { sessionID: "s1" } });
      await settle();
      const summary: ContextEvent = { sessionID: "s1", agent: "build", system: [] };
      const beforeCompaction = bd.mock.calls.length;
      await f.hooks.get("compaction")!(summary);
      expect(bd).toHaveBeenCalledTimes(beforeCompaction);
      const gap = JSON.parse(summary.system[1]!.text.replace(/^<beads-references>|<\/beads-references>$/g, "")).gap;
      const expected = [
        `note "task-first" actor=${executorActor(writer)}: uncertain; fixture write interrupted`,
        `remember "lesson-uncommitted" actor=${executorActor(otherWriter)}: landed-uncommitted`,
      ];
      const recovery = (await f.request("s1", "build")).join("\n");
      const later = (await f.request("s1", "build")).join("\n");
      for (const detail of expected) {
        expect(gap).toContain(detail);
        expect(recovery).toContain(detail);
        expect(later).toContain(detail);
      }
      expect(gap).toContain("no final checkpoint is guaranteed");
      expect(bd.mock.calls.filter(([, args]) => args[0] === "update")).toHaveLength(2);
      expect(bd.mock.calls.filter(([, args]) => args[0] === "remember")).toHaveLength(1);
      expect((await f.request("other-session", "build")).join("\n")).not.toContain("task-first");
      f.events.push({ type: "session.moved", data: { sessionID: "s1" } });
      await settle();
      expect((await f.request("s1", "build")).join("\n")).not.toContain("lesson-uncommitted");
    } finally {
      await cleanup();
    }
  });

  test("renders actual filtered request capability and actor, preserving guard holds", async () => {
    const f = fakeContext();
    const t = toolFixture(f);
    let guard: any = { kind: "ready" };
    const prime = mock(async () => "FULL PRIME");
    Object.assign(f.ctx, { permission: { assert: async () => {} } });
    Object.assign(f.ctx.session, {
      get: async () => ({ location: { directory: "/project" }, agent: "session-default" }),
    });
    const cleanup = await setupBeads(f.ctx, {
      continuityQualified: true,
      runtime: { guard: async () => guard, prime },
    });
    expect(t.namespaces).toEqual([{ name: "beads", description: expect.any(String) }]);
    expect(t.tools).toHaveLength(11);
    expect(t.tools.every((tool) => tool.options?.namespace === "beads" && tool.options.codemode === true)).toBeTrue();
    const typed = (await f.request("actual", "build", { execute: {}, shell: {} }))[0]!;
    expect(typed).toContain(executorActor({ sessionID: "actual", agent: "build" }));
    expect(typed).toContain("Beads namespace is registered and execute is visible");
    const direct = (await f.request("actual", "restricted", { beads_get: {}, beads_note: {} }))[0]!;
    expect(direct).toContain(executorActor({ sessionID: "actual", agent: "restricted" }));
    expect(direct).toContain("Native Beads leaf tools are directly visible");
    expect(direct).toContain("Use only the listed direct leaves");
    expect(direct).toContain("Each operation still checks its own permission");
    expect(direct).not.toContain("direct shell tool");
    const shell = (await f.request("actual", "review", { shell: {} }))[0]!;
    expect(shell).toContain(executorActor({ sessionID: "actual", agent: "review" }));
    expect(shell).not.toContain(executorActor({ sessionID: "actual", agent: "build" }));
    expect(shell).toContain("direct shell tool");
    expect((await f.request("actual", "review", {}))[0]).toContain(
      "Neither native Beads leaves nor direct shell access",
    );
    expect(prime).toHaveBeenCalledTimes(1);
    guard = { kind: "unsupported", installed: "1.3.0" };
    f.events.push({ type: "session.compaction.ended", data: { sessionID: "actual" } });
    await settle();
    const held = (await f.request("actual", "build", { execute: {}, shell: {} }))[0]!;
    expect(held).not.toContain("Beads namespace is registered");
    expect(held).not.toContain("direct shell tool");
    await cleanup();
  });
  test("acknowledged task writes retain task references without a redundant cue; unrelated errors do not refresh prime", async () => {
    const f = fakeContext();
    const t = toolFixture(f);
    const prime = mock(async () => "PRIME");
    Object.assign(f.ctx, {
      location: { directory: "/project", project: { directory: "/project" } },
      permission: { assert: async () => {} },
    });
    Object.assign(f.ctx.session, { get: async () => ({ location: { directory: "/project" } }) });
    const cleanup = await setupBeads(f.ctx, {
      continuityQualified: true,
      runtime: { guard: async () => ({ kind: "ready" }), prime },
      continuity: {
        realpath: async (p) => p,
        bd: async (_cwd, args) =>
          args[0] === "version"
            ? "1.3.1"
            : args[0] === "context"
              ? '{"beads_dir":"/project/.beads"}'
              : '[{"id":"task-1","notes":"evidence"}]',
      },
    });
    await f.request("s1", "build");
    await t.after({
      ...invocation("s1", "build"),
      ...nonCodeMode,
      tool: "shell",
      input: {},
      status: "error",
      error: new ToolError({ message: "test failed" }),
    });
    expect(await f.request("s1", "build")).toHaveLength(1);
    expect(prime).toHaveBeenCalledTimes(1);
    await t.tools
      .find((tool) => tool.name === "note")!
      .execute({ id: "task-1", text: "evidence" }, invocation("s1", "build"));
    expect(await f.request("s1", "build")).toHaveLength(1);
    expect(prime).toHaveBeenCalledTimes(2);
    const event: ContextEvent = { sessionID: "s1", agent: "build", system: [] };
    await f.hooks.get("compaction")!(event);
    expect(event.system[1]?.text).toContain("task:task-1");
    expect(event.system[1]?.text).not.toContain("memory:task-1");
    await cleanup();
  });

  test("ordinary setup withholds privileged continuity registration", async () => {
    const f = fakeContext();
    const transform = mock(async () => ({ dispose: async () => {} }));
    Object.assign(f.ctx, { tool: { transform, hook: mock(async () => ({ dispose: async () => {} })) } });
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "PRIME" },
    });
    expect(transform).not.toHaveBeenCalled();
    cleanup();
  });

  test("compaction preserves native replay, keepID, legacy recent and model boundaries without I/O", async () => {
    const f = fakeContext();
    const prime = mock(async () => "PRIME");
    const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime } });
    await f.request("s1", "build");
    const hook = f.hooks.get("compaction")!;
    // Representative public payloads, not a provider/history implementation or cross-product.
    const cases = [
      { model: { providerID: "provider-a", id: "model-a" } },
      {
        model: { providerID: "provider-a", id: "model-a" },
        result: { summary: "host summary", metadata: { keepID: "fork-remapped-id" } },
      },
      {
        model: { providerID: "provider-b", id: "model-b" },
        result: {
          summary: "host fallback",
          metadata: { recent: "legacy retained tail" },
          native: { messages: [{ opaque: true }] },
        },
      },
    ];
    for (const fields of cases) {
      const event = {
        sessionID: "s1",
        agent: "build",
        system: [],
        messages: [],
        options: {},
        tools: {},
        ...fields,
      } as unknown as SessionCompaction;
      const before = JSON.stringify(event);
      await hook(event);
      const { system, ...preserved } = event;
      expect(system).toEqual([{ type: "text", text: BEADS_COMPACTION_GUIDANCE }]);
      expect({ ...preserved, system: [] }).toEqual({ ...JSON.parse(before), system: [] });
      expect(event.result).toBe(fields.result);
    }
    expect(prime).toHaveBeenCalledTimes(1);
    cleanup();
  });
  test("host admission and diagnostics agree on unsupported versions", async () => {
    for (const appVersion of [
      "2.0.29",
      "2.1.1",
      "2.2.5",
      "2.2.6",
      "2.2.8",
      "2.4.0",
      "2.4.3",
      "3.0.0",
      "2.3.0-beta.1",
      "2.4.2-beta.1",
      "2.3",
      "unknown",
    ]) {
      const f = fakeContext({ appVersion });
      const warn = mock(() => {});

      const cleanup = await setupBeads(f.ctx, { warn });

      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`OpenCode ${appVersion}`));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(">=2.3.0 <2.4 || 2.4.1 || 2.4.2"));
      expect(f.agents.size).toBe(0);
      expect(f.hooks.size).toBe(0);
      expect(renderHealthReport({ ...presentationFixture(), host: appVersion }, 2000)).toContain(
        appVersion === "unknown" ? "| Host | — | not observed |" : `| Host | ❌ | OpenCode ${appVersion} unsupported |`,
      );
      cleanup();
    }
  });

  test.each(["2.3.0", "2.3.8", "2.4.1", "2.4.2"])(
    "host admission and diagnostics agree on supported version %s",
    async (appVersion) => {
      const f = fakeContext({ appVersion });
      const cleanup = await setupBeads(f.ctx, {
        runtime: { guard: async () => ({ kind: "ready" as const }), prime: async () => "PRIME" },
      });

      expect([...f.hooks.keys()]).toEqual(["context", "compaction"]);
      expect([...f.agents.keys()]).toEqual(["beads-task-agent"]);
      expect(renderHealthReport({ ...presentationFixture(), host: appVersion }, 2000)).toContain(
        `| Host | ✅ | OpenCode ${appVersion} |`,
      );
      cleanup();
    },
  );

  test("registers the bounded task agent as a subagent and keeps Luna opt-in", async () => {
    const ready = { runtime: { guard: async () => ({ kind: "ready" as const }), prime: async () => "PRIME" } };
    const vanilla = fakeContext();
    const cleanupVanilla = await setupBeads(vanilla.ctx, ready);
    expect([...vanilla.agents.keys()]).toEqual(["beads-task-agent"]);
    const agent = vanilla.agents.get("beads-task-agent");
    expect(agent?.mode).toBe("subagent");
    expect(agent?.name).toBe("beads-task-agent");
    expect(agent?.model).toBeUndefined();
    expect(String(agent?.system)).toContain("An exact assignment or explicit one-bead mode ends with that bead");
    expect(String(agent?.system)).toContain("bd update <id> --claim --json --actor='<executor-actor>' --sandbox");
    expect(typeof agent?.description).toBe("string");
    expect(agent?.permissions).toEqual([...TASK_AGENT_PERMISSIONS]);
    expect(agent?.steps).toBe(DEFAULT_TASK_AGENT_STEPS);
    cleanupVanilla();

    const luna = fakeContext({ pluginOptions: { luna: true } });
    const cleanupLuna = await setupBeads(luna.ctx, ready);
    const lunaAgent = luna.agents.get("beads-task-agent-luna");
    expect(lunaAgent?.model).toEqual({ providerID: "openai", id: "gpt-6-luna", variant: "max" });
    expect(lunaAgent?.system).toBe(luna.agents.get("beads-task-agent")?.system);
    expect(lunaAgent?.mode).toBe("subagent");
    cleanupLuna();
  });

  test("registers Terra independently and with Luna, with shared policy and context", async () => {
    const ready = { runtime: { guard: async () => ({ kind: "ready" as const }), prime: async () => "PRIME" } };
    for (const luna of [false, true]) {
      const f = fakeContext({ pluginOptions: { terra: true, luna, taskAgentSteps: 12 } });
      const cleanup = await setupBeads(f.ctx, ready);
      expect([...f.agents.keys()]).toEqual(
        luna
          ? ["beads-task-agent", "beads-task-agent-luna", "beads-task-agent-terra"]
          : ["beads-task-agent", "beads-task-agent-terra"],
      );
      const base = f.agents.get("beads-task-agent")!;
      const terra = f.agents.get("beads-task-agent-terra")!;
      expect(base.model).toBeUndefined();
      expect(terra.model).toEqual({ providerID: "openai", id: "gpt-6.1-terra", variant: "medium" });
      expect(terra.system).toBe(base.system);
      expect(terra.description).toBe(base.description);
      expect(terra.mode).toBe(base.mode);
      expect(terra.permissions).toEqual(base.permissions);
      expect(terra.steps).toBe(base.steps);
      if (luna)
        expect(f.agents.get("beads-task-agent-luna")?.model).toEqual({
          providerID: "openai",
          id: "gpt-6-luna",
          variant: "max",
        });
      expect(await f.request("terra-child", "beads-task-agent-terra")).toEqual([
        renderBeadsContext("PRIME", "task-agent", { sessionID: "terra-child", agent: "beads-task-agent-terra" }),
      ]);
      await cleanup();
    }
  });

  test("appends rendered prime to eligible requests through the context hook only", async () => {
    const f = fakeContext();
    const prime = mock(async (_directory: string) => "PRIME");
    const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime } });

    expect([...f.hooks.keys()]).toEqual(["context", "compaction"]);
    expect(await f.request("s1", "build")).toEqual([
      renderBeadsContext("PRIME", "primary", { sessionID: "s1", agent: "build" }),
    ]);
    expect(await f.request("s1", "build")).toEqual([
      renderBeadsContext("PRIME", "primary", { sessionID: "s1", agent: "build" }),
    ]);
    expect(await f.request("s1", "explore")).toEqual([]);
    expect(prime).toHaveBeenCalledTimes(1);
    expect(prime).toHaveBeenCalledWith("/project", expect.any(AbortSignal));
    expect(f.agentGet).toHaveBeenCalledWith({ agentID: "build" });
    cleanup();
  });

  test("minimizes bd's full AGENTS.md block only when prime is attached", async () => {
    const block = "<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:1 -->\nPRIME\n<!-- END BEADS INTEGRATION -->";
    let guard: { kind: "ready" } | { kind: "unsupported"; installed: string } = {
      kind: "ready",
    };
    const f = fakeContext();
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => guard, prime: async () => "PRIME" },
      retryMs: 0,
    });
    const hook = f.hooks.get("context");
    if (!hook) throw new Error("context hook not registered");

    const withPrime: ContextEvent = { sessionID: "s1", agent: "build", system: [{ type: "text", text: block }] };
    await hook(withPrime);
    expect(withPrime.system[0]?.text).toContain("provided by the opencode-beads plugin");
    expect(withPrime.system[0]?.text).not.toContain("BEGIN BEADS");
    expect(withPrime.system[1]?.text).toBe(renderBeadsContext("PRIME", "primary", { sessionID: "s1", agent: "build" }));

    const subagent: ContextEvent = { sessionID: "s1", agent: "explore", system: [{ type: "text", text: block }] };
    await hook(subagent);
    expect(subagent.system).toEqual([{ type: "text", text: block }]);

    guard = { kind: "unsupported", installed: "1.3.0" };
    const withNotice: ContextEvent = { sessionID: "s2", agent: "build", system: [{ type: "text", text: block }] };
    await hook(withNotice);
    expect(withNotice.system[0]?.text).toBe(block);
    expect(withNotice.system[1]?.text).toContain("<beads-notice>");
    cleanup();
  });

  test("attaches prime without altering instructions when AGENTS.md has no Beads block", async () => {
    const f = fakeContext();
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "PRIME" },
    });
    const hook = f.hooks.get("context");
    if (!hook) throw new Error("context hook not registered");
    const instructions = "Instructions from: /repo/AGENTS.md\n# Project rules";
    const event: ContextEvent = {
      sessionID: "s1",
      agent: "build",
      system: [{ type: "text", text: instructions }],
    };
    await hook(event);
    expect(event.system).toEqual([
      { type: "text", text: instructions },
      { type: "text", text: renderBeadsContext("PRIME", "primary", { sessionID: "s1", agent: "build" }) },
    ]);
    cleanup();
  });

  test("refreshes after compaction ends and forgets deleted sessions", async () => {
    const f = fakeContext();
    let output = "FIRST";
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => output },
    });

    expect((await f.request("s1", "beads-task-agent"))[0]).toContain("FIRST");
    output = "SECOND";
    f.events.push({ type: "session.step.ended", data: { sessionID: "s1" } });
    await settle();
    expect((await f.request("s1", "beads-task-agent"))[0]).toContain("FIRST");

    f.events.push({ type: "session.compaction.ended", data: { sessionID: "s1" } });
    await settle();
    expect((await f.request("s1", "beads-task-agent"))[0]).toContain("SECOND");

    output = "THIRD";
    f.events.push({ type: "session.deleted", data: { sessionID: "s1" } });
    await settle();
    expect((await f.request("s1", "beads-task-agent"))[0]).toContain("THIRD");
    cleanup();
  });

  test("always runs bd prime with --full, and adds --stealth only when the stealth option is set", async () => {
    for (const [options, flags] of [
      [{}, ["--full"]],
      [{ stealth: true }, ["--full", "--stealth"]],
      [{ stealth: "yes" }, ["--full"]],
    ] as const) {
      const runPrime = mock(async (_cwd: string, _flags: readonly string[]) => "PRIME");
      const f = fakeContext({ pluginOptions: options });
      const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }) }, runPrime });
      await f.request("s1", "build");
      expect(runPrime).toHaveBeenCalledWith("/project", flags);
      cleanup();
    }
  });

  test("caps worker steps from taskAgentSteps, and 0 removes the cap", async () => {
    const ready = { runtime: { guard: async () => ({ kind: "ready" as const }), prime: async () => "PRIME" } };
    const capped = fakeContext({ pluginOptions: { taskAgentSteps: 25, luna: true } });
    (await setupBeads(capped.ctx, ready))();
    expect(capped.agents.get("beads-task-agent")?.steps).toBe(25);
    expect(capped.agents.get("beads-task-agent-luna")?.steps).toBe(25);
    const uncapped = fakeContext({ pluginOptions: { taskAgentSteps: 0 } });
    (await setupBeads(uncapped.ctx, ready))();
    expect(uncapped.agents.get("beads-task-agent")?.steps).toBeUndefined();
    const invalid = fakeContext({ pluginOptions: { taskAgentSteps: "lots" } });
    (await setupBeads(invalid.ctx, ready))();
    expect(invalid.agents.get("beads-task-agent")?.steps).toBe(DEFAULT_TASK_AGENT_STEPS);
  });

  test("asks compaction to keep Beads state only for sessions that had Beads context", async () => {
    const f = fakeContext();
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "PRIME" },
    });
    const compaction = f.hooks.get("compaction");
    if (!compaction) throw new Error("compaction hook not registered");
    await f.request("s1", "build");
    const withBeads: ContextEvent = { sessionID: "s1", agent: "build", system: [] };
    await compaction(withBeads);
    expect(withBeads.system).toEqual([{ type: "text", text: BEADS_COMPACTION_GUIDANCE }]);
    const other: ContextEvent = { sessionID: "s2", agent: "build", system: [] };
    await compaction(other);
    expect(other.system).toEqual([]);
    f.events.push({ type: "session.deleted", data: { sessionID: "s1" } });
    await settle();
    const deleted: ContextEvent = { sessionID: "s1", agent: "build", system: [] };
    await compaction(deleted);
    expect(deleted.system).toEqual([]);
    cleanup();
  });

  test("passes refreshAfterIdleMinutes through to the context cache", async () => {
    let time = 0;
    let output = "FIRST";
    const f = fakeContext({ pluginOptions: { refreshAfterIdleMinutes: 1 } });
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => output },
      now: () => time,
    });
    expect((await f.request("s1", "beads-task-agent"))[0]).toContain("FIRST");
    output = "SECOND";
    time = 59_000;
    expect((await f.request("s1", "beads-task-agent"))[0]).toContain("FIRST");
    time = 59_000 + 60_001;
    expect((await f.request("s1", "beads-task-agent"))[0]).toContain("SECOND");
    cleanup();
  });

  test("stops the event stream on cleanup", async () => {
    const f = fakeContext();
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "PRIME" },
    });
    await settle();
    cleanup();
    await settle();
    expect(f.events.aborted()).toBeTrue();
  });

  test("native full prime ignores CLI witnesses and retired autoMigrate values", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "beads-host-"));
    try {
      for (const marker of [undefined, "1.3.2", "1.3.4", "1.4.0"]) {
        const markerPath = path.join(directory, ".local_version");
        if (marker === undefined) await rm(markerPath, { force: true });
        else await writeFile(markerPath, marker);
        for (const autoMigrate of [undefined, false, true]) {
          const bd = mock(async (_cwd: string, args: readonly string[]) =>
            args[0] === "version" ? "bd version 1.3.4" : JSON.stringify({ beads_dir: directory }),
          );
          const text = "WORKFLOW\n## Persistent Memories\nNative selected memory\nNative partial-availability notice";
          const runPrime = mock(async () => text);
          const f = fakeContext({ directory, pluginOptions: { autoMigrate } });
          const cleanup = await setupBeads(f.ctx, { bd, runPrime });
          try {
            expect(await f.request("s1", "build")).toEqual([
              renderBeadsContext(text, "primary", { sessionID: "s1", agent: "build" }),
            ]);
            expect(runPrime).toHaveBeenCalledWith(directory, ["--full"]);
            expect(bd.mock.calls.map((call) => call[1])).toEqual([["version"], ["context", "--json"]]);
          } finally {
            cleanup();
          }
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("rate-limits diagnostics and never lets them fail a request", async () => {
    const f = fakeContext();
    let time = 0;
    const warn = mock((_message: string) => {
      throw new Error("log sink down");
    });
    const cleanup = await setupBeads(f.ctx, {
      runtime: {
        guard: async () => ({ kind: "ready" }),
        prime: async () => {
          throw new Error("exit 1");
        },
      },
      warn,
      now: () => time,
      retryMs: 0,
      diagnosticIntervalMs: 1_000,
    });

    const notice = [primeFailureNotice("failed")];
    expect(await f.request("s1", "build")).toEqual(notice);
    time = 1;
    expect(await f.request("s1", "build")).toEqual(notice);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("prime_failed");
    time = 1_002;
    await f.request("s1", "build");
    expect(warn).toHaveBeenCalledTimes(2);
    cleanup();
  });
});

/** Replay only the public add callbacks in native package/config order. */
function commandFixture(f: ReturnType<typeof fakeContext>) {
  type Editor = { add(definition: CommandDefinition): void };
  const callbacks: Array<(editor: Editor) => void> = [];
  const initial: CommandDefinition = { name: "oc-beads:ready", description: "EARLIER PLUGIN", execute: async () => {} };
  let lookupFailed = false;
  let omitted: string | undefined;
  const commands = () => {
    const result = new Map([[initial.name, initial]]);
    for (const callback of callbacks) callback({ add: (definition) => result.set(definition.name, definition) });
    return result;
  };
  const transform = mock(async (callback: (editor: Editor) => void) => {
    callbacks.push(callback);
    commands();
    return {
      dispose: async () => {
        callbacks.splice(callbacks.indexOf(callback), 1);
      },
    };
  });
  const prompt = mock(async (_input: Record<string, unknown>) => ({}));
  Object.assign(f.ctx, {
    command: {
      transform,
      list: async () => {
        if (lookupFailed) throw new Error("lookup failed");
        return {
          data: [...commands().values()]
            .filter((entry) => entry.name !== omitted)
            .map(({ name, description }) => ({ name, description })),
        };
      },
    },
  });
  Object.assign(f.ctx.session, { prompt, get: async () => ({ agent: "build", location: { directory: "/project" } }) });
  const invocation = {
    sessionID: "s1",
    delivery: "queue",
    prompt: {
      text: "literal '$ARGUMENTS' $(touch nope) `text`",
      files: [{ uri: "file:///tmp/a%20b" }],
      agents: [{ name: "build" }],
      skills: [{ id: "oc-beads" }],
    },
  } as unknown as CommandInvocation;
  return {
    callbacks,
    commands,
    transform,
    prompt,
    invocation,
    detailsInvocation: { ...invocation, prompt: { ...invocation.prompt, text: "details" } },
    failLookup: (failed: boolean) => {
      lookupFailed = failed;
    },
    omit: (name?: string) => {
      omitted = name;
    },
  };
}

describe("child handoff plugin boundary (not live host qualification)", () => {
  test.each(["running", "failed", "cancelled", "NO_TEXT", "partial"] as const)(
    "preserves %s child outcome and adds only a next-request recovery cue",
    async (outcome) => {
      const f = fakeContext();
      const t = toolFixture(f);
      const prompt = mock(async () => ({}));
      const synthetic = mock(async () => ({}));
      Object.assign(f.ctx.session, {
        prompt,
        synthetic,
        get: async () => ({ agent: "human-default", location: { directory: "/project" } }),
      });
      const prime = mock(async () => "CURRENT");
      const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime } });
      await f.request("parent", "build");
      await f.request("child", "beads-task-agent");
      const parent = invocation("parent", "build");
      const child = invocation("child", "beads-task-agent");
      const handoff = `Task fixture-1 only; actor ${executorActor(child)}; session child; tried A; failed validation; because B; reference task:fixture-1; candidate fixture-rev; blocker acceptance; next authorized action C; partial.`;
      const input = { agent: "beads-task-agent", description: "bounded fixture", prompt: handoff };
      const base = {
        tool: "subagent",
        codemode: false,
        sessionID: parent.sessionID,
        agent: parent.agent,
        messageID: parent.messageID,
        id: parent.id,
        input,
      };
      // Exercise the 2.3 launch handle and error boundary alongside earlier result
      // forms; execute.after has no status="cancelled".
      const event: ToolAfterEvent =
        outcome === "failed" || outcome === "cancelled"
          ? {
              ...base,
              status: "error",
              error: new ToolError({
                message:
                  outcome === "failed"
                    ? "Subagent failed (sessionID: child): fixture failure"
                    : "Subagent cancelled (sessionID: child)",
              }),
            }
          : {
              ...base,
              status: "completed",
              result: {
                output: {
                  sessionID: "child",
                  status: outcome === "running" ? "running" : "completed",
                  output:
                    outcome === "running"
                      ? "The subagent is working in the background (sessionID: child). You will receive a <subagent> message when it goes idle, and again after each later round of work."
                      : outcome === "NO_TEXT"
                        ? "Subagent completed without a text response."
                        : handoff,
                },
                content:
                  outcome === "running"
                    ? '<subagent sessionID="child" state="running">Launched</subagent>'
                    : `<subagent sessionID="child" state="completed">\n${outcome === "NO_TEXT" ? "Subagent completed without a text response." : handoff}\n</subagent>`,
                metadata: { sessionID: "child", status: outcome === "running" ? "running" : "completed" },
              },
            };
      const before = JSON.stringify(event);
      await t.after(event);
      expect(JSON.stringify(event)).toBe(before);
      expect(event.input).toBe(input);
      expect(prime).toHaveBeenCalledTimes(2);
      expect(prompt).not.toHaveBeenCalled();
      expect(synthetic).not.toHaveBeenCalled();
      const recovered = await f.request("parent", "build");
      expect(prime).toHaveBeenCalledTimes(3);
      expect(recovered[1]).toContain("may only acknowledge launch or follow-up");
      expect(recovered[1]).toContain("actual reports or results");
      expect(recovered[1]).not.toContain("A child returned");
      // Child context is isolated; a parent-side result does not change its actor/cache.
      expect(await f.request("child", "beads-task-agent")).toHaveLength(1);
      expect(prime).toHaveBeenCalledTimes(3);
      await cleanup();
    },
  );

  test("a late child return and execution success after deliberate stop do not restart or imply a final checkpoint", async () => {
    const f = fakeContext();
    const t = toolFixture(f);
    const prompt = mock(async () => ({}));
    const synthetic = mock(async () => ({}));
    Object.assign(f.ctx.session, { prompt, synthetic });
    const prime = mock(async () => "CURRENT");
    const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime } });
    await f.request("parent", "build");
    f.events.push({ type: "session.execution.interrupted", data: { sessionID: "parent", reason: "user" } });
    await settle();
    const context = invocation("parent", "build");
    const event: ToolAfterEvent = {
      tool: "subagent",
      ...nonCodeMode,
      sessionID: context.sessionID,
      agent: context.agent,
      messageID: context.messageID,
      id: context.id,
      input: { agent: "beads-task-agent", prompt: "exact fixture-1" },
      status: "completed",
      result: {
        output: { sessionID: "child", status: "completed", output: "late partial evidence" },
        metadata: { sessionID: "child", status: "completed" },
      },
    };
    const before = JSON.stringify(event);
    await t.after(event);
    f.events.push({ type: "session.execution.succeeded", data: { sessionID: "parent" } });
    await settle();
    expect(JSON.stringify(event)).toBe(before);
    expect(prime).toHaveBeenCalledTimes(1);
    expect(prompt).not.toHaveBeenCalled();
    expect(synthetic).not.toHaveBeenCalled();
    const summary: ContextEvent = { sessionID: "parent", agent: "build", system: [] };
    await f.hooks.get("compaction")!(summary);
    expect(summary.system[1]?.text).toContain("no final checkpoint");
    expect(prime).toHaveBeenCalledTimes(1);
    // Only a caller-initiated request asks for fresh recovery; the test does not run a model.
    expect((await f.request("parent", "build"))[1]).toContain("incomplete work");
    await cleanup();
    const calls = prime.mock.calls.length;
    await t.after(event);
    expect(await f.request("parent", "build")).toEqual([]);
    expect(prime).toHaveBeenCalledTimes(calls);
  });

  test("preserves parent/child checkpoint actors and partial handoff on fresh-session/fork recovery", async () => {
    const f = fakeContext();
    const t = toolFixture(f);
    const permission = mock(async (_input: unknown) => {});
    Object.assign(f.ctx, {
      permission: { assert: permission },
      location: { directory: "/project", project: { directory: "/project" } },
    });
    Object.assign(f.ctx.session, {
      get: async () => ({ agent: "human-default", location: { directory: "/project" } }),
    });
    const child = invocation("child-full-session", "beads-task-agent");
    const parent = invocation("parent-full-session", "build");
    const notes = [`Earlier attempt failed; rationale retained.`];
    const handoff = `Scope fixture-1; executor ${executorActor(child)}; full session ${child.sessionID}; tried alternative; result partial; validation unit pass/live unexecuted; because source only; reference task:fixture-1; candidate fixture-rev; blocker live gate; next authorized action parent review.`;
    const bd = mock(async (_cwd: string, args: readonly string[]) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads"}';
      if (args[0] === "update") notes.push(String(args[args.indexOf("--append-notes") + 1]));
      return JSON.stringify([
        {
          id: "fixture-1",
          created_by: "unknown",
          owner: "account-owner",
          assignee: executorActor(child),
          notes: notes.join("\n"),
        },
      ]);
    });
    const prime = mock(async () => "CURRENT");
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime },
      continuityQualified: true,
      continuity: { bd, realpath: async (value) => value },
    });
    await f.request(String(child.sessionID), String(child.agent));
    await f.request(String(parent.sessionID), String(parent.agent));
    const checkpoint = t.tools.find((tool) => tool.name === "note")!;
    await checkpoint.execute({ id: "fixture-1", text: handoff }, child);
    await checkpoint.execute(
      { id: "fixture-1", text: "Parent review only; no ownership transfer or closure." },
      parent,
    );
    const writes = bd.mock.calls.filter(([, args]) => args[0] === "update");
    expect(writes.map(([, args]) => args[args.indexOf("--actor") + 1])).toEqual([
      executorActor(child),
      executorActor(parent),
    ]);
    expect(writes[0]?.[1]).toContain(handoff);
    expect(permission.mock.calls.map(([input]) => (input as { agent: string }).agent)).toEqual([
      child.agent,
      parent.agent,
    ]);
    const compact = async (sessionID: string, agent: string) => {
      const event: ContextEvent = { sessionID, agent, system: [] };
      await f.hooks.get("compaction")!(event);
      return event.system;
    };
    expect((await compact(String(parent.sessionID), String(parent.agent)))[1]?.text).toContain("task:fixture-1");
    f.events.push({
      type: "session.forked",
      data: {
        sessionID: "fork",
        parentID: parent.sessionID,
        boundary: { type: "through", messageID: parent.messageID },
      },
    });
    await settle();
    await f.request("fork", "build");
    expect(await compact("fork", "build")).toHaveLength(1);
    expect((await compact(String(parent.sessionID), String(parent.agent)))[1]?.text).toContain("task:fixture-1");
    await cleanup();
    const fresh = fakeContext();
    const recoveredTools = toolFixture(fresh);
    Object.assign(fresh.ctx, { location: f.ctx.location, permission: f.ctx.permission });
    Object.assign(fresh.ctx.session, { get: f.ctx.session.get });
    const freshCleanup = await setupBeads(fresh.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime },
      continuityQualified: true,
      continuity: { bd, realpath: async (value) => value },
    });
    const recovery = await fresh.request("fresh", "build");
    expect(recovery[0]).toContain("retrieve the assigned task and relevant reusable knowledge");
    const result = await recoveredTools.tools
      .find((tool) => tool.name === "get")!
      .execute({ ids: ["fixture-1"] }, invocation("fresh", "build"));
    expect(JSON.stringify(result.output)).toContain(handoff);
    expect(JSON.stringify(result.output)).toContain("Earlier attempt failed");
    expect(JSON.stringify(result.output)).toContain('"created_by":"unknown"');
    expect(JSON.stringify(result.output)).toContain('"owner":"account-owner"');
    expect(JSON.stringify(result.output)).toContain(`"assignee":"${executorActor(child)}"`);
    expect(bd.mock.calls.filter(([, args]) => args[0] === "update")).toHaveLength(2);
    await freshCleanup();
  });

  test("a permission wait neither writes nor checkpoints during compaction; stop rejects a later approval", async () => {
    const f = fakeContext();
    const t = toolFixture(f);
    let release: () => void = () => {};
    const permission = mock(
      async (_input: unknown) =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const prompt = mock(async () => ({}));
    const synthetic = mock(async () => ({}));
    Object.assign(f.ctx, {
      permission: { assert: permission },
      location: { directory: "/project", project: { directory: "/project" } },
    });
    Object.assign(f.ctx.session, {
      prompt,
      synthetic,
      get: async () => ({ agent: "human-default", location: { directory: "/project" } }),
    });
    const bd = mock(async (_cwd: string, args: readonly string[]) =>
      args[0] === "version" ? "1.3.1" : '{"beads_dir":"/project/.beads"}',
    );
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "CURRENT" },
      continuityQualified: true,
      continuity: { bd, realpath: async (value) => value },
    });
    await f.request("child", "beads-task-agent");
    const abort = new AbortController();
    const context = invocation("child", "beads-task-agent", abort.signal);
    const pending = t.tools
      .find((tool) => tool.name === "note")!
      .execute({ id: "fixture-1", text: "unsaved partial result" }, context);
    const outcome = pending.then(
      () => undefined,
      (error: unknown) => error,
    );
    await settle();
    expect(permission).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: context.agent,
        sessionID: context.sessionID,
        save: [],
        source: { type: "tool", messageID: context.messageID, id: context.id },
      }),
    );
    const count = bd.mock.calls.length;
    const summary: ContextEvent = { sessionID: "child", agent: "beads-task-agent", system: [] };
    await f.hooks.get("compaction")!(summary);
    expect(summary.system).toEqual([{ type: "text", text: BEADS_COMPACTION_GUIDANCE }]);
    expect(bd).toHaveBeenCalledTimes(count);
    expect(permission).toHaveBeenCalledTimes(1);
    abort.abort();
    expect(await outcome).toHaveProperty("name", "AbortError");
    release();
    await settle();
    expect(bd).toHaveBeenCalledTimes(count);
    expect(bd.mock.calls.every(([, args]) => ["version", "context"].includes(args[0] ?? ""))).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    expect(synthetic).not.toHaveBeenCalled();
    await cleanup();
  });
});

describe("owned workflow registration", () => {
  test("registers all commands despite initial collisions; config wins on rebuild, removal restores and disposal preserves config", async () => {
    const f = fakeContext();
    const c = commandFixture(f);
    const warns: string[] = [];
    const cleanup = await setupBeads(f.ctx, { warn: (message) => warns.push(message) });
    expect(c.transform).toHaveBeenCalledTimes(1);
    expect(c.commands().size).toBe(30);
    expect(warns.join("\n")).toContain("command-collision");
    expect(warns.join("\n")).toContain("native precedence");
    const packageCallback = c.callbacks[0]!;
    const ready = c.commands().get("oc-beads:ready")!;
    await ready.execute(c.invocation);
    const sent = c.prompt.mock.calls.at(-1)![0];
    expect(sent.text).toContain(c.invocation.prompt.text);
    expect(sent.files).toBe(c.invocation.prompt.files);
    expect(sent.agents).toBe(c.invocation.prompt.agents);
    expect(sent.skills).toBe(c.invocation.prompt.skills);
    expect(sent.delivery).toBe(c.invocation.delivery);
    const user = { name: ready.name, description: "USER CONFIG", execute: mock(async () => {}) };
    const config = (editor: { add(definition: CommandDefinition): void }) => editor.add(user);
    c.callbacks.push(config);
    expect(c.commands().get(ready.name)).toBe(user);
    await c.commands().get(ready.name)!.execute(c.invocation);
    expect(user.execute).toHaveBeenCalledTimes(1);
    c.callbacks.splice(c.callbacks.indexOf(config), 1);
    expect(c.commands().get(ready.name)).toBe(ready);
    c.callbacks.push(config);
    await cleanup();
    expect(c.callbacks).toEqual([config]);
    expect(c.commands().get(ready.name)).toBe(user);
    expect(c.commands().has("oc-beads:diagnostics")).toBe(false);
    const add = mock((_definition: CommandDefinition) => {});
    packageCallback({ add });
    expect(add).not.toHaveBeenCalled();
    await expect(ready.execute(c.invocation)).rejects.toThrow("unloaded");
    expect(f.events.aborted()).toBe(true);
  });

  test("registered mixed workflow and legacy hooks expand replay once before location/eligibility returns", async () => {
    const f = fakeContext();
    const c = commandFixture(f);
    const cleanup = await setupBeads(f.ctx, { warn: () => {} });
    const update = c.commands().get("oc-beads:update")!;
    const stored: StoredSessionMessage[] = [];
    const projected: SessionContext["messages"] = [];
    const context = mock(async () => stored);
    Object.assign(f.ctx.session, { context });
    for (const [stem, text, delivery] of [
      ["show", "fixture-1", "queue"],
      ["update", "append note", "steer"],
      ["compact", "explain --auto", "queue"],
      ["sync", "explain only", "steer"],
    ] as const) {
      await c
        .commands()
        .get(`oc-beads:${stem}`)!
        .execute({ ...c.invocation, delivery, prompt: { ...c.invocation.prompt, text } });
      const sent = c.prompt.mock.calls.at(-1)![0];
      expect(sent.text).toBe(`/oc-beads:${stem} ${text}`);
      expect(sent.files).toBe(c.invocation.prompt.files);
      expect(sent.delivery).toBe(delivery);
      const workflow = (sent.metadata as { ocBeadsWorkflow: { version: number; instructions: string } })
        .ocBeadsWorkflow;
      const messageID = `workflow-${stem}`;
      stored.push(
        storedUserMessage(
          messageID,
          String(sent.text),
          stem === "sync" ? { ocBeadsSync: workflow } : { ocBeadsWorkflow: workflow },
        ),
      );
      projected.push(
        Message.make({
          id: messageID,
          role: "user",
          content: [Message.text(String(sent.text)), Message.text("native prepared attachment/skill + hook edit")],
        }),
      );
    }
    expect(c.prompt).toHaveBeenCalledTimes(4);
    const raw = JSON.stringify(projected);
    const storedRaw = JSON.stringify(stored);
    for (const kind of ["context", "compaction"]) {
      const event = {
        sessionID: "s1",
        agent: "build",
        system: [],
        messages: projected.map((message) => Message.make(message)),
      } as ContextEvent;
      await f.hooks.get(kind)!(event);
      const once = JSON.stringify(event.messages);
      expect(once).not.toContain("ocBeadsSync");
      expect(once).not.toContain("ocBeadsWorkflow");
      expect(once.match(/Invoked command: \/oc-beads:/g)).toHaveLength(4);
      expect(once).toContain("With sufficient inputs, perform the requested operation");
      await f.hooks.get(kind)!(event);
      expect(JSON.stringify(event.messages)).toBe(once);
      expect(event.messages![1]!.content).toContainEqual({ type: "text", text: "/oc-beads:update append note" });
    }
    expect(context).toHaveBeenCalledTimes(4);
    // A moved session is withheld before native snapshot lookup.
    Object.assign(f.ctx.session, { get: async () => ({ location: { directory: "/elsewhere" } }) });
    const moved = {
      sessionID: "s1",
      agent: "build",
      system: [],
      messages: projected.map((message) => Message.make(message)),
    } as ContextEvent;
    await f.hooks.get("context")!(moved);
    expect(JSON.stringify(moved.messages)).not.toContain("Requested outcome:");
    expect(JSON.stringify(moved.system)).toContain("Saved Beads workflow instructions or diagnostics are unavailable");
    expect(context).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(stored)).toBe(storedRaw);
    expect([...f.hooks.keys()].sort()).toEqual(["compaction", "context"]);
    // Summary recent-context uses stored visible text; no promise of verbatim snapshot retention.
    const recent = stored
      .filter((message) => message.type === "user")
      .map((message) => message.text)
      .join("\n");
    expect(recent).not.toContain("Requested outcome:");
    expect(BEADS_COMPACTION_GUIDANCE).toContain(
      "active /oc-beads workflow invocation's requested outcome, unresolved inputs or explicit modes, and applicable authority limits",
    );
    const calls = c.prompt.mock.calls.length;
    await cleanup();
    const unloaded = {
      sessionID: "s1",
      agent: "build",
      system: [],
      messages: projected.map((message) => Message.make(message)),
    } as ContextEvent;
    await f.hooks.get("context")!(unloaded);
    expect(JSON.stringify(unloaded.messages)).toBe(raw);
    await expect(update.execute(c.invocation)).rejects.toThrow("unloaded");
    expect(c.prompt).toHaveBeenCalledTimes(calls);
  });

  test("restores a saved workflow by ID from native context after the SDK projects a metadata-free user message", async () => {
    const f = fakeContext({ appVersion: "2.3.0" });
    const c = commandFixture(f);
    const order: string[] = [];
    const cleanup = await setupBeads(f.ctx, { warn: () => {} });
    await c
      .commands()
      .get("oc-beads:show")!
      .execute({
        ...c.invocation,
        delivery: "queue",
        prompt: { ...c.invocation.prompt, text: "fixture-1 --json" },
      });
    const sent = c.prompt.mock.calls.at(-1)![0];
    const workflow = (sent.metadata as { ocBeadsWorkflow: { version: number; instructions: string } }).ocBeadsWorkflow;
    const messageID = "workflow-message-1";
    const get = mock(async () => {
      order.push("location");
      return { location: { directory: "/project" } };
    });
    const context = mock(async ({ sessionID }: { sessionID: string }) => {
      order.push("context");
      expect(sessionID).toBe(c.invocation.sessionID);
      return [
        {
          id: messageID,
          type: "user" as const,
          time: { created: 1 },
          text: String(sent.text),
          metadata: { ocBeadsWorkflow: workflow },
        },
      ];
    });
    Object.assign(f.ctx.session, { get, context });

    const projected = Message.make({ id: messageID, role: "user", content: String(sent.text) });
    expect(projected.role).toBe("user");
    expect(Object.hasOwn(projected, "metadata")).toBeFalse();
    const event: ContextEvent = {
      sessionID: c.invocation.sessionID,
      agent: "build",
      system: [],
      messages: [projected],
    };
    await f.hooks.get("context")!(event);

    expect(order).toEqual(["location", "context"]);
    expect(context).toHaveBeenCalledTimes(1);
    expect(event.messages?.[0]?.content[0]).toEqual(Message.text(workflow.instructions));
    expect(event.messages?.[0]?.content[1]).toEqual(Message.text(String(sent.text)));
    expect(c.prompt.mock.calls.at(-1)![0].delivery).toBe("queue");
    await cleanup();
  });

  test("reports unavailable snapshots after a rejected or incomplete native read without re-admission", async () => {
    for (const result of ["rejected", "missing"] as const) {
      const f = fakeContext();
      const c = commandFixture(f);
      const cleanup = await setupBeads(f.ctx, { warn: () => {} });
      await c.commands().get("oc-beads:show")!.execute(c.invocation);
      const message = Message.make({ id: `missing-${result}`, role: "user", content: "/oc-beads:show fixture-1" });
      const context = mock(async () => {
        if (result === "rejected") throw new Error("fixture native read rejected");
        return [];
      });
      Object.assign(f.ctx.session, { context });
      const before = JSON.stringify(message.content);
      const event: ContextEvent = { sessionID: "s1", agent: "build", system: [], messages: [message] };
      const promptCount = c.prompt.mock.calls.length;
      await f.hooks.get("context")!(event);
      expect(JSON.stringify(event.messages?.[0]?.content)).toBe(before);
      expect(JSON.stringify(event.system)).toContain(
        "Saved Beads workflow instructions or diagnostics are unavailable",
      );
      expect(context).toHaveBeenCalledTimes(1);
      expect(c.prompt).toHaveBeenCalledTimes(promptCount);
      await cleanup();
    }
  });

  test("overlapping snapshot reads share a lifecycle while actual invalidations reject late results", async () => {
    for (const seam of ["get", "context"] as const)
      for (const action of [
        "context",
        "compaction",
        "session.moved",
        "session.deleted",
        "session.forked",
        "unload",
      ] as const) {
        const f = fakeContext();
        commandFixture(f);
        const stored = storedUserMessage("overlap", "/oc-beads:show fixture", {
          ocBeadsWorkflow: { version: 1, instructions: "SAVED OVERLAP" },
        });
        Object.assign(f.ctx.session, { context: async () => [stored] });
        const cleanup = await setupBeads(f.ctx, {
          warn: () => {},
          runtime: {
            guard: async () => ({ kind: "ready", version: "1.3.4", workspace: { path: "/project/.beads" } }),
            prime: async () => "PRIME FIXTURE",
          },
        });
        const event = (): ContextEvent => ({
          sessionID: "s1",
          agent: "build",
          system: [],
          messages: [Message.make({ id: "overlap", role: "user", content: stored.text })],
        });
        await f.hooks.get("context")!(event());
        const original = f.ctx.session[seam]!;
        let release: (value: never) => void = () => {};
        let calls = 0;
        Object.assign(f.ctx.session, {
          [seam]: async (input: never) =>
            ++calls === 1
              ? new Promise((resolve) => {
                  release = resolve;
                })
              : original(input),
        });
        const firstKind = action === "context" ? "compaction" : "context";
        const first = event();
        const pending = f.hooks.get(firstKind)!(first);
        await settle();
        if (action === "context" || action === "compaction") {
          const second = event();
          await f.hooks.get(action)!(second);
          expect(JSON.stringify(second.messages)).toContain("SAVED OVERLAP");
          expect(JSON.stringify(second.system)).toContain(
            action === "context" ? "<beads-context" : "<beads-compaction>",
          );
        } else if (action === "unload") await cleanup();
        else {
          f.events.push({ type: action, data: { sessionID: "s1" } });
          await settle();
        }
        release((await original({ sessionID: "s1" } as never)) as never);
        await pending;
        const valid = action === "context" || action === "compaction";
        expect(JSON.stringify(first.messages).includes("SAVED OVERLAP")).toBe(valid);
        if (valid)
          expect(JSON.stringify(first.system)).toContain(
            firstKind === "context" ? "<beads-context" : "<beads-compaction>",
          );
        else if (action !== "unload")
          expect(JSON.stringify(first.system)).toContain(
            "Saved Beads workflow instructions or diagnostics are unavailable",
          );
        await cleanup();
      }
  });

  test("discards a late native snapshot after session generation changes", async () => {
    const f = fakeContext();
    commandFixture(f);
    const messageID = "moving-workflow";
    const stored = storedUserMessage(messageID, "/oc-beads:show fixture-1", {
      ocBeadsWorkflow: { version: 1, instructions: "STALE SNAPSHOT" },
    });
    let release: (messages: StoredSessionMessage[]) => void = () => {};
    const context = mock(
      async () =>
        new Promise<StoredSessionMessage[]>((resolve) => {
          release = resolve;
        }),
    );
    Object.assign(f.ctx.session, { context });
    const cleanup = await setupBeads(f.ctx, { warn: () => {} });
    const message = Message.make({ id: messageID, role: "user", content: stored.text });
    const before = JSON.stringify(message.content);
    const event: ContextEvent = { sessionID: "s1", agent: "build", system: [], messages: [message] };
    const pending = f.hooks.get("context")!(event);
    await settle();
    f.events.push({ type: "session.moved", data: { sessionID: "s1" } });
    await settle();
    release([stored]);
    await pending;
    expect(JSON.stringify(event.messages?.[0]?.content)).toBe(before);
    expect(JSON.stringify(event.system)).toContain("Saved Beads workflow instructions or diagnostics are unavailable");
    expect(JSON.stringify(event.messages)).not.toContain("STALE SNAPSHOT");
    expect(context).toHaveBeenCalledTimes(1);
    await cleanup();
  });

  test("actual Responses serialization retains mixed workflow and legacy instructions once on native replay", async () => {
    const f = fakeContext();
    const c = commandFixture(f);
    const { createBeadsCommands } = await import("../src/workflows");
    const commands = createBeadsCommands(
      { prompt: c.prompt as unknown as Parameters<typeof createBeadsCommands>[0]["prompt"] },
      async () => "DIAGNOSTICS",
      "/fixture/package/assets/oc-beads/SKILL.md",
    );
    const cleanup = await setupBeads(f.ctx, { warn: () => {} });
    const captures: unknown[] = [];
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        captures.push(await request.json());
        const response = {
          id: "resp_fixture",
          object: "response",
          created_at: 0,
          model: "fixture",
          status: "completed",
          output: [],
          usage: { input_tokens: 1, output_tokens: 0, total_tokens: 1 },
        };
        return new Response(`data: ${JSON.stringify({ type: "response.completed", response })}\n\n`, {
          headers: { "content-type": "text/event-stream" },
        });
      },
    });
    const client = make();
    const model = configure({ apiKey: "disposable-fixture", baseURL: `${server.url.origin}/v1` }).responses("fixture");
    const serialize = async (messages: SessionContext["messages"]) => {
      await client.generate({ model, messages });
      return JSON.stringify(captures.at(-1));
    };
    try {
      const stored: StoredSessionMessage[] = [];
      const projected: SessionContext["messages"] = [];
      const expected: SessionContext["messages"] = [];
      Object.assign(f.ctx.session, { context: mock(async () => stored) });
      const stems = ["show", "update", "compact", "sync", "diagnostics"];
      for (const [index, stem] of stems.entries()) {
        const details =
          index === stems.length - 1 ? "current turn exact details" : `fixture-1 ${stem} literal --apply --auto`;
        await commands
          .find((c) => c.name === `oc-beads:${stem}`)!
          .execute({ ...c.invocation, prompt: { ...c.invocation.prompt, text: details } });
        const sent = c.prompt.mock.calls.at(-1)![0] as Record<string, unknown>;
        const snapshot = (sent.metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow;
        if (stem === "sync") {
          // Canonicalize only the fixed resource path for the historical POSIX digest.
          const instructions = snapshot.instructions.replace(
            JSON.stringify(path.resolve("/fixture/package/assets/oc-beads/resources/CLI_REFERENCE.md")),
            JSON.stringify("/fixture/package/assets/oc-beads/resources/CLI_REFERENCE.md"),
          );
          expect(createHash("sha256").update(instructions).digest("hex")).toBe(baseline.syncInstructionsSha256);
        }
        const messageID = `response-workflow-${stem}`;
        const content = [String(sent.text), "native file/skill preparation + prompt hook edits"];
        // Legacy retained history uses its stored snapshot, never a current-definition lookup.
        const metadata: StoredUserMessage["metadata"] =
          stem === "sync" ? { ocBeadsSync: snapshot, foreign: true } : { ocBeadsWorkflow: snapshot, foreign: true };
        stored.push(storedUserMessage(messageID, String(sent.text), metadata));
        projected.push(
          Message.make({ id: messageID, role: "user", content: content.map((text) => Message.text(text)) }),
        );
        expected.push(
          Message.make({
            id: messageID,
            role: "user",
            content: [snapshot.instructions, ...content].map((text) => Message.text(text)),
          }),
        );
        if (index === 0) {
          const assistant = Message.make({ role: "assistant", content: Message.text("interleaved assistant") });
          projected.push(assistant);
          expected.push(assistant);
        }
      }
      const storage = JSON.stringify(stored);
      const projectedStorage = JSON.stringify(projected);
      let candidate: string | undefined;
      for (const kind of ["context", "compaction"]) {
        const event = {
          sessionID: "s1",
          agent: "build",
          system: [],
          messages: projected.map((message) => Message.make(message)),
        } as ContextEvent;
        await f.hooks.get(kind)!(event);
        const serialized = await serialize(event.messages!);
        candidate ??= serialized;
        expect(serialized).toBe(candidate);
        expect(serialized).toBe(await serialize(expected));
        expect(serialized).not.toMatch(/ocBeadsWorkflow|ocBeadsSync/);
        for (const stem of stems)
          expect(
            serialized.match(
              new RegExp(
                stem === "diagnostics" ? "Reproduce only the finished Markdown" : `Invoked command: /oc-beads:${stem}`,
                "g",
              ),
            ),
          ).toHaveLength(1);
        expect(serialized).toContain("current turn exact details");
        const once = JSON.stringify(event.messages);
        await f.hooks.get(kind)!(event);
        expect(JSON.stringify(event.messages)).toBe(once);
        expect(await serialize(event.messages!)).toBe(candidate);
        const replay = { ...event, messages: projected.map((message) => Message.make(message)) };
        await f.hooks.get(kind)!(replay);
        expect(await serialize(replay.messages!)).toBe(candidate);
      }
      expect(JSON.stringify(stored)).toBe(storage);
      expect(JSON.stringify(projected)).toBe(projectedStorage);
      const auxiliary = await serialize(projected);
      expect(auxiliary).not.toContain("Invoked command:");
      expect(auxiliary).not.toContain("Reproduce only the finished Markdown");
      expect(auxiliary).not.toMatch(/ocBeadsWorkflow|ocBeadsSync/);
      expect([...f.hooks.keys()].sort()).toEqual(["compaction", "context"]);
      expect(c.prompt).toHaveBeenCalledTimes(stems.length);
      if (process.env.OC_BEADS_WORKFLOW_EVIDENCE_DIR)
        await writeFile(
          path.join(process.env.OC_BEADS_WORKFLOW_EVIDENCE_DIR, "provider-fixture.json"),
          JSON.stringify(
            {
              kind: "local Responses serialization only; no inference",
              invocations: stems,
              candidate: JSON.parse(candidate!),
              auxiliary: JSON.parse(auxiliary),
              stablePrimaryCompactionReplay: true,
            },
            null,
            2,
          ),
        );
    } finally {
      await client.dispose();
      server.stop(true);
      await cleanup();
    }
  });

  test("diagnostics identifies its loaded package and expands the captured report through existing hooks", async () => {
    const f = fakeContext();
    const c = commandFixture(f);
    const prime = mock(async () => "PRIME");
    const cleanup = await setupBeads(f.ctx, {
      warn: () => {},
      runtime: { guard: async () => ({ kind: "ready" }), prime },
    });
    try {
      await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
      const sent = c.prompt.mock.calls.at(-1)![0];
      const metadata = sent.metadata as { ocBeadsWorkflow: { version: number; instructions: string } };
      const snapshot = metadata.ocBeadsWorkflow;
      const report = JSON.parse(snapshot.instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
      const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json();
      expect(report.plugin).toEqual({ name: manifest.name, version: manifest.version });
      expect(report.host).toBe("2.3.0");
      expect(snapshot.instructions).toContain(`DATE: \`${report.capturedAt}\``);
      expect(snapshot.instructions).toContain(`VERSION: ${manifest.name} \`${manifest.version}\``);
      expect(snapshot.instructions).toContain("PATH: `not observed`");
      expect(prime).not.toHaveBeenCalled();
      const stored = storedUserMessage("diagnostics-message", String(sent.text), { ocBeadsWorkflow: snapshot });
      const request = Message.make({ id: stored.id, role: "user", content: String(sent.text) });
      const raw = JSON.stringify(stored);
      const context = mock(async () => [stored]);
      Object.assign(f.ctx.session, { context });
      for (const kind of ["context", "compaction"]) {
        const event: ContextEvent = { sessionID: "s1", agent: "build", system: [], messages: [Message.make(request)] };
        await f.hooks.get(kind)!(event);
        expect(event.messages![0]!.content[0]).toEqual({ type: "text", text: snapshot.instructions });
        expect(JSON.stringify(event.messages)).not.toContain("ocBeadsWorkflow");
        expect(JSON.stringify(event.messages).split(snapshot.instructions.split("\n")[0]!)).toHaveLength(2);
      }
      for (const kind of ["title", "generate"]) {
        const event: ContextEvent = { sessionID: "s1", agent: "build", system: [], messages: [Message.make(request)] };
        await f.hooks.get(kind)?.(event);
        expect(JSON.stringify(event.messages!.map((message) => message.content))).not.toContain(
          "Reproduce only the finished Markdown",
        );
      }
      expect(JSON.stringify(stored)).toBe(raw);
      expect(c.prompt).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup();
    }
  });

  test("diagnostics overrides restore natively and user-owned old status survives package removal", async () => {
    const f = fakeContext();
    const c = commandFixture(f);
    const cleanup = await setupBeads(f.ctx, { warn: () => {} });
    expect(c.commands().size).toBe(30);
    expect(c.commands().has("oc-beads:status")).toBe(false);
    const diagnostics = c.commands().get("oc-beads:diagnostics")!;
    expect(diagnostics.description).toContain("strict-readonly store access");
    expect(diagnostics.description).toContain("configured database");
    expect(diagnostics.description).toContain("All selectors skip remote history fetches");
    const oldStatus = { name: "oc-beads:status", description: "USER OLD STATUS", execute: mock(async () => {}) };
    const override = { ...diagnostics, description: "USER DIAGNOSTICS", execute: mock(async () => {}) };
    const oldConfig = (editor: { add(definition: CommandDefinition): void }) => editor.add(oldStatus);
    const newConfig = (editor: { add(definition: CommandDefinition): void }) => editor.add(override);
    c.callbacks.push(oldConfig, newConfig);
    expect(c.commands().get(diagnostics.name)).toBe(override);
    await c.commands().get(diagnostics.name)!.execute(c.invocation);
    expect(override.execute).toHaveBeenCalledTimes(1);
    c.callbacks.splice(c.callbacks.indexOf(newConfig), 1);
    expect(c.commands().get(diagnostics.name)).toBe(diagnostics);
    expect(c.commands().get(oldStatus.name)).toBe(oldStatus);
    await c.commands().get(oldStatus.name)!.execute(c.invocation);
    expect(oldStatus.execute).toHaveBeenCalledTimes(1);
    await c.commands().get("oc-beads:stats")!.execute(c.invocation);
    const statsMetadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
    expect(statsMetadata.ocBeadsWorkflow.instructions).toContain(
      "issue-database overview using bd status (alias bd stats)",
    );
    expect(statsMetadata.ocBeadsWorkflow.instructions).toContain("Supporting guidance:");
    await cleanup();
    expect(c.commands().get(oldStatus.name)).toBe(oldStatus);
    expect(c.commands().has(diagnostics.name)).toBe(false);
  });

  test("registers after an initial lookup failure and reports observable mismatches, missing names and ownership blind spots", async () => {
    const f = fakeContext();
    const c = commandFixture(f);
    c.failLookup(true);
    const cleanup = await setupBeads(f.ctx, { warn: () => {}, runtime: { guard: async () => ({ kind: "ready" }) } });
    expect(c.transform).toHaveBeenCalledTimes(1);
    c.failLookup(false);
    const ready = c.commands().get("oc-beads:ready")!;
    const diagnostics = c.commands().get("oc-beads:diagnostics")!;
    const report = async () => {
      await diagnostics.execute(c.detailsInvocation);
      const metadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
      return JSON.parse(metadata.ocBeadsWorkflow.instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
    };
    let observed = await report();
    expect(observed.commands.registration).toBe("registered");
    expect(observed.commands.lookup).toBe("available");
    expect(observed.commands.ownership).toContain("unavailable");
    expect(observed.commands.ownership).toContain("identical-description");
    expect(observed.commands.ownership).toContain("do not prove ownership");
    c.callbacks.push((editor) => editor.add({ ...ready, description: "USER DESCRIPTION" }));
    observed = await report();
    expect(observed.commands.mismatches).toContainEqual({
      name: ready.name,
      expectedDescription: ready.description,
      effectiveDescription: "USER DESCRIPTION",
    });
    expect(observed.commands.effective).toContainEqual({ name: ready.name, description: "USER DESCRIPTION" });
    c.callbacks.push((editor) => editor.add({ ...ready, execute: async () => {} }));
    expect((await report()).commands.mismatches).toEqual([]);
    c.omit("oc-beads:show");
    expect((await report()).commands.missing).toEqual(["oc-beads:show"]);
    c.failLookup(true);
    observed = await report();
    expect(observed.commands.lookup).toBe("failed");
    expect(observed.commands.effective).toBe("unknown: registry lookup failed");
    expect(observed.commands.mismatches).toBeUndefined();
    await cleanup();
  });

  test("skill checks each candidate without an initial list gate and restores a disappearing override", async () => {
    const f = fakeContext();
    type Skill = { id: string; name: string; path: string; content: string };
    const custom = { id: "oc-beads", name: "oc-beads", path: "/user/SKILL.md", content: "USER" };
    let before: Skill | undefined = custom;
    let after: Skill | undefined;
    const skills = new Map<string, Skill>();
    const callbacks: Array<(editor: unknown) => void> = [];
    const rebuild = () => {
      skills.clear();
      if (before) skills.set(before.id, before);
      const editor = { list: () => [...skills.values()], add: (skill: Skill) => skills.set(skill.id, skill) };
      for (const callback of callbacks) callback(editor);
      if (after) skills.set(after.id, after);
    };
    const list = mock(async () => {
      throw new Error("setup must not gate on list");
    });
    Object.assign(f.ctx, {
      skill: {
        list,
        transform: async (callback: (editor: unknown) => void) => {
          callbacks.push(callback);
          rebuild();
          return {
            dispose: async () => {
              callbacks.splice(callbacks.indexOf(callback), 1);
              rebuild();
            },
          };
        },
      },
    });
    const cleanup = await setupBeads(f.ctx, { warn: () => {} });
    expect(list).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);
    expect(skills.get("oc-beads")).toBe(custom);
    before = undefined;
    rebuild();
    expect(skills.get("oc-beads")?.content).toContain("Beads work in OpenCode");
    after = custom;
    rebuild();
    expect(skills.get("oc-beads")).toBe(custom);
    after = undefined;
    rebuild();
    expect(skills.get("oc-beads")?.content).toContain("Beads work in OpenCode");
    const callback = callbacks[0]!;
    after = custom;
    await cleanup();
    expect(skills.get("oc-beads")).toBe(custom);
    const add = mock((_skill: Skill) => {});
    callback({ list: () => [], add });
    expect(add).not.toHaveBeenCalled();
  });
});

describe("owned lifecycle", () => {
  test("awaits idempotent cleanup of every owned registration and aborts pending context", async () => {
    const f = fakeContext();
    const disposed: string[] = [];
    const completed: string[] = [];
    const own = (name: string) => ({
      dispose: async () => {
        disposed.push(name);
        await new Promise((resolve) => setTimeout(resolve, 1));
        completed.push(name);
      },
    });
    const originalAgent = f.ctx.agent.transform;
    const transform: HostContext["agent"]["transform"] = async (callback) => {
      await originalAgent(callback);
      return own("agent");
    };
    Object.assign(f.ctx.agent, { transform });
    const originalHook = f.ctx.session.hook;
    const hook: HostContext["session"]["hook"] = async (name, callback) => {
      await originalHook(name, callback);
      return own(`hook:${name}`);
    };
    Object.assign(f.ctx.session, { hook });
    Object.assign(f.ctx, {
      skill: {
        list: async () => ({ data: [] }),
        transform: async (callback: (editor: unknown) => void) => {
          callback({ list: () => [], add: () => {} });
          return own("skill");
        },
      },
      tool: { transform: async () => own("tool"), hook: async () => own("tool-hook") },
      permission: { assert: async () => {} },
    });
    Object.assign(f.ctx.session, { get: async () => ({ location: { directory: "/project" } }) });
    let signal: AbortSignal | undefined;
    let release: (value: string) => void = () => {};
    const cleanup = await setupBeads(f.ctx, {
      continuityQualified: true,
      runtime: {
        guard: async () => ({ kind: "ready" }),
        prime: async (_cwd, abortSignal) => {
          signal = abortSignal;
          return new Promise<string>((resolve) => {
            release = resolve;
          });
        },
      },
    });
    const pending = f.request("s1", "build");
    await settle();
    await cleanup();
    expect(signal?.aborted).toBe(true);
    expect(f.events.aborted()).toBe(true);
    expect(completed.sort()).toEqual(["agent", "skill", "tool", "hook:context", "hook:compaction", "tool-hook"].sort());
    release("LATE OLD LOCATION");
    expect(await pending).toEqual([]);
    await cleanup();
    expect(disposed).toHaveLength(6);
  });

  test("releases earlier owned registrations if a later setup seam fails", async () => {
    const f = fakeContext();
    const disposed = mock(async () => {});
    const originalAgent = f.ctx.agent.transform;
    const transform: HostContext["agent"]["transform"] = async (callback) => {
      await originalAgent(callback);
      return { dispose: disposed };
    };
    Object.assign(f.ctx.agent, { transform });
    Object.assign(f.ctx.session, {
      hook: async () => {
        throw new Error("host hook failed");
      },
    });
    await expect(setupBeads(f.ctx)).rejects.toThrow("host hook failed");
    expect(disposed).toHaveBeenCalledTimes(1);
  });
});

test("missing packaged guidance is withheld with honest diagnostics", async () => {
  const transform = mock(async () => ({ dispose: async () => {} }));
  const warnings: string[] = [];
  const missing = fakeContext();
  Object.assign(missing.ctx, { skill: { list: async () => ({ data: [] }), transform } });
  const missingCleanup = await setupBeads(missing.ctx, {
    warn: (message) => warnings.push(message),
    workflowAssets: {
      readText: async () => {
        throw new Error("sensitive exception content");
      },
    },
  });
  expect(transform).not.toHaveBeenCalled();
  expect(warnings.some((warning) => warning.includes("skill-unreachable SKILL.md"))).toBe(true);
  expect(warnings.join("\n")).not.toContain("sensitive exception content");
  await missingCleanup();
});

test("cleanup attempts every owned disposer and reports a failed disposal", async () => {
  const f = fakeContext();
  const warn = mock((_message: string) => {});
  const disposed = mock(async () => {});
  const transform: HostContext["agent"]["transform"] = async () => ({
    dispose: async () => {
      throw new Error("dispose failed");
    },
  });
  Object.assign(f.ctx.agent, { transform });
  const originalHook = f.ctx.session.hook;
  const hook: HostContext["session"]["hook"] = async (name, callback) => {
    await originalHook(name, callback);
    return { dispose: disposed };
  };
  Object.assign(f.ctx.session, { hook });
  const cleanup = await setupBeads(f.ctx, { warn });
  await expect(cleanup()).rejects.toThrow("Beads cleanup failed");
  expect(disposed).toHaveBeenCalledTimes(2);
  expect(warn.mock.calls.flat().join("\n")).toContain("cleanup-failed");
  expect(f.events.aborted()).toBe(true);
});

test("registered diagnostics distinguishes missing, held, failed, loading and uncertain context", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  let time = 0;
  let version = "1.3.1";
  let probe: "missing" | "failed" | "ready" = "missing";
  const bd = mock(async (_directory: string, args: readonly string[]) => {
    if (args.join(" ") === "version") return `bd ${version}`;
    if (args.join(" ") === "context --json") {
      if (probe === "failed") throw new Error("probe failed");
      return JSON.stringify({ beads_dir: probe === "ready" ? "/unused-fixture/.beads" : "" });
    }
    if (args.join(" ") === "hooks list --json") return '{"hooks":[]}';
    throw new Error("unexpected command");
  });
  let release: (text: string) => void = () => {};
  const prime = mock(
    async () =>
      new Promise<string>((resolve) => {
        release = resolve;
      }),
  );
  const cleanup = await setupBeads(f.ctx, { bd, runtime: { prime }, now: () => time, retryMs: 1, warn: () => {} });
  const diagnostics = c.commands().get("oc-beads:diagnostics")!;
  const report = async () => {
    await diagnostics.execute(c.detailsInvocation);
    const metadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
    return JSON.parse(metadata.ocBeadsWorkflow.instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
  };
  const initial = await report();
  expect(initial.liveQualification).toBe("not measured by diagnostics; see release acceptance evidence");
  expect(initial.context).toBe("unobserved: no cached context");
  expect(initial.requestCapability).toBe("unknown: no actual request observation");
  await f.request("s1", "build");
  expect((await report()).context).toBe("missing");
  version = "1.2.0";
  time += 2;
  await f.request("s1", "build");
  expect((await report()).context).toBe("withheld");
  version = "1.3.1";
  probe = "failed";
  time += 2;
  await f.request("s1", "build");
  const failed = await report();
  expect(failed.context).toBe("failed");
  expect(failed.guard.kind).toBe("probe-failed");
  expect(prime).not.toHaveBeenCalled();
  probe = "ready";
  time += 2;
  const pending = f.request("s1", "build");
  await settle();
  expect((await report()).context).toBe("uncertain: context refresh in progress");
  release("PRIME");
  await pending;
  const observed = await report();
  expect(observed.context).toBe("ready");
  expect(observed.guard).toEqual({ kind: "ready", version: "1.3.1", workspace: { path: "/unused-fixture/.beads" } });
  expect(observed.syncTarget).toEqual({
    state: "unknown",
    reason: "native backend was not reported",
    listingSkipped: true,
  });
  expect(JSON.stringify(observed)).not.toMatch(/migration-pending|migrate schema/);
  expect(observed.requestCapability.agent).toBe("build");
  expect(observed.requestCapability.capabilities.typed).toBe("unknown");
  expect(observed.leafAvailability).toContain("unknown");
  expect(prime).toHaveBeenCalledTimes(1);
  f.events.push({ type: "session.execution.interrupted", data: { sessionID: "s1" } });
  await settle();
  expect((await report()).persistence).toContain("no final checkpoint");
  Object.assign(f.ctx.session, {
    get: async () => {
      throw new Error("unknown location");
    },
  });
  const count = bd.mock.calls.length;
  const unknown = await report();
  expect(unknown.context).toBe("uncertain: session lookup failed");
  expect(unknown.guard.kind).toBe("withheld");
  expect(unknown.persistence).toContain("uncertain: no final-write guarantee");
  expect(bd).toHaveBeenCalledTimes(count);
  expect(new Set(bd.mock.calls.map(([, args]) => args.join(" ")))).toEqual(
    new Set(["version", "context --json", "hooks list --json"]),
  );
  await cleanup();
});

test("diagnostics starts lookup synchronously and reads new request evidence after the registry probe", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const session = { agent: "build", location: { directory: "/project" } };
  const lookup = Promise.withResolvers<typeof session>();
  const registryStarted = Promise.withResolvers<void>();
  const releaseRegistry = Promise.withResolvers<void>();
  const effects: string[] = [];
  const cleanup = await setupBeads(f.ctx, {
    bd: async () => '{"hooks":[]}',
    warn: () => {},
    runtime: {
      guard: async () => {
        effects.push("guard");
        return { kind: "ready" };
      },
      prime: async () => "BODY",
    },
  });
  const originalList = f.ctx.command!.list;
  let firstLookup = true;
  Object.assign(f.ctx.session, {
    get() {
      if (!firstLookup) return Promise.resolve(session);
      firstLookup = false;
      effects.push("lookup");
      return lookup.promise;
    },
  });
  Object.assign(f.ctx.command!, {
    async list() {
      registryStarted.resolve();
      await releaseRegistry.promise;
      return originalList.call(this);
    },
  });

  const pending = c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
  try {
    expect(effects).toEqual(["lookup"]);
    lookup.resolve(session);
    queueMicrotask(() => effects.push("caller microtask"));
    await Promise.race([registryStarted.promise, pending]);
    expect(effects).toEqual(["lookup", "guard", "caller microtask"]);

    await f.request("s1", "build");
    releaseRegistry.resolve();
    await pending;
    const metadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
    const report = JSON.parse(metadata.ocBeadsWorkflow.instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
    expect(report.context).toBe("unobserved: no cached context");
    expect(report.requestCapability.agent).toBe("build");
    expect(report.requestInstructions).toHaveProperty("at");
  } finally {
    lookup.resolve(session);
    releaseRegistry.resolve();
    await pending.catch(() => {});
    await cleanup();
  }
});

test("unload aborts an in-flight native diagnostics without submitting a late prompt", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  let signal: AbortSignal | undefined;
  let release: () => void = () => {};
  const cleanup = await setupBeads(f.ctx, {
    warn: () => {},
    runtime: {
      guard: async (_directory, abortSignal) => {
        signal = abortSignal;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { kind: "ready" };
      },
    },
  });
  const pending = c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
  await settle();
  await cleanup();
  expect(signal?.aborted).toBe(true);
  release();
  await expect(pending).rejects.toThrow("unloaded");
  expect(c.prompt).not.toHaveBeenCalled();
});

test("unload prevents a pending native target listing from submitting a report", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const { promise: listingStarted, resolve: startListing } = Promise.withResolvers<void>();
  const { promise: listing, resolve: finishListing } = Promise.withResolvers<string>();
  const cleanup = await setupBeads(f.ctx, {
    warn: () => {},
    bd: async (_directory, args) => {
      switch (args.join(" ")) {
        case "version":
          return "bd version 1.3.4";
        case "context --json":
          return '{"beads_dir":"/fixture/.beads","backend":"dolt","dolt_mode":"embedded"}';
        case "hooks list --json":
          return '{"hooks":[]}';
        case "--readonly dolt remote list --json --sandbox":
          startListing();
          return listing;
        default:
          throw new Error("unexpected command");
      }
    },
  });
  const pending = c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
  try {
    await Promise.race([listingStarted, pending]);
    await cleanup();
    finishListing("[]");
    await expect(pending).rejects.toThrow("unloaded");
    expect(c.prompt).not.toHaveBeenCalled();
  } finally {
    finishListing("[]");
    await cleanup();
  }
});

test("a failed native command registration diagnoses failure and releases earlier owned registrations", async () => {
  const f = fakeContext();
  commandFixture(f);
  const disposed = mock(async () => {});
  const original = f.ctx.agent.transform;
  const transform: HostContext["agent"]["transform"] = async (callback) => {
    await original(callback);
    return { dispose: disposed };
  };
  Object.assign(f.ctx.agent, { transform });
  Object.assign(f.ctx.command!, {
    transform: async () => {
      throw new Error("native registration failed");
    },
  });
  const warnings: string[] = [];
  await expect(setupBeads(f.ctx, { warn: (message) => warnings.push(message) })).rejects.toThrow(
    "native registration failed",
  );
  expect(warnings.join("\n")).toContain("command-registration-failed");
  expect(disposed).toHaveBeenCalledTimes(1);
});

test("registered diagnostics reports an embedded store with no native remotes or installed hooks", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const bd = mock(async (_directory: string, args: readonly string[]) => {
    if (args.join(" ") === "version") return "bd version 1.3.4";
    if (args.join(" ") === "context --json")
      return JSON.stringify({ beads_dir: "/unused/.beads", backend: "dolt", dolt_mode: "embedded" });
    if (args.join(" ") === "hooks list --json")
      return JSON.stringify({
        hooks: [{ Name: "pre-commit", Installed: false, Version: "", IsShim: false, Outdated: false }],
      });
    if (args.join(" ") === "--readonly dolt remote list --json --sandbox") return "[]";
    throw new Error("unexpected invocation");
  });
  const cleanup = await setupBeads(f.ctx, { bd, warn: () => {} });
  try {
    await c
      .commands()
      .get("oc-beads:diagnostics")!
      .execute({ ...c.detailsInvocation, prompt: { ...c.detailsInvocation.prompt, text: "details remote" } });
    const metadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
    const report = metadata.ocBeadsWorkflow.instructions;
    expect(report).toContain("| Git hooks | — | 0/1 installed · 1 missing/unreadable/unresolved |");
    expect(report).toContain("| Sync target | ✅ | Local-only |");
    expect(report).toContain("| Remote history | — | Not applicable |");
    expect(report).not.toContain("No qualified Beads history probe is available");
    expect(report).toContain("Git-origin adoption with consent");
    expect(report).toContain("Source-Git freshness was not checked");
    expect(report).toContain("pre-commit");
    expect(report).not.toContain("Git hooks need attention");
    expect(report).not.toContain("bd hooks install");
    expect(bd.mock.calls).toEqual([
      [f.ctx.location.directory, ["version"]],
      [f.ctx.location.directory, ["context", "--json"]],
      [f.ctx.location.directory, ["hooks", "list", "--json"]],
      [f.ctx.location.directory, ["--readonly", "dolt", "remote", "list", "--json", "--sandbox"]],
    ]);
  } finally {
    await cleanup();
  }
});

test("registered diagnostics keeps incomplete or ambiguous native target evidence neutral", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const origin = { name: "origin", status: "ok", url: "https://user:listing-secret@example.invalid" };
  const remoteList = ["--readonly", "dolt", "remote", "list", "--json", "--sandbox"];
  let context: Record<string, unknown>;
  let listing: string | Error;
  const bd = mock(async (_directory: string, args: readonly string[]) => {
    switch (args.join(" ")) {
      case "version":
        return "bd version 1.3.4";
      case "context --json":
        return JSON.stringify({ beads_dir: "/fixture/.beads", ...context });
      case "hooks list --json":
        return '{"hooks":[]}';
      case "--readonly dolt remote list --json --sandbox":
        if (listing instanceof Error) throw listing;
        return listing;
      default:
        throw new Error("unexpected command");
    }
  });
  const cleanup = await setupBeads(f.ctx, { bd, warn: () => {} });
  const embedded = { backend: "dolt", dolt_mode: "embedded" };
  const server = {
    backend: "dolt",
    dolt_mode: "server",
    server_host: "server-secret.example.invalid",
    server_port: 3307,
  };
  const cases = [
    { context: server, output: "[]", reason: "empty native listing in server mode" },
    {
      context: embedded,
      output: JSON.stringify([{ ...origin, name: "alternate" }]),
      reason: "native origin was not listed",
    },
    {
      context: { ...server, ...embedded },
      output: JSON.stringify([origin]),
      reason: "embedded mode conflicts with server endpoint evidence",
      skipListing: true,
    },
    {
      context: { backend: "dolt" },
      output: JSON.stringify([origin]),
      reason: "native Dolt mode was not reported",
      skipListing: true,
    },
    {
      context: { ...embedded, dolt_mode: "unknown-mode" },
      output: "[]",
      reason: "unrecognized native Dolt mode",
      skipListing: true,
    },
    { context: { dolt_mode: "embedded" }, output: "[]", reason: "native backend was not reported", skipListing: true },
    {
      context: { ...embedded, backend: "unknown-backend" },
      output: "[]",
      reason: "native backend is not Dolt",
      skipListing: true,
    },
    {
      context: { backend: "dolt", dolt_mode: "proxied-server", proxied_dir: "/proxy-secret" },
      output: "[]",
      reason: "proxied-server mode is unsupported",
      skipListing: true,
    },
    {
      context: embedded,
      output: JSON.stringify([origin, { name: "incomplete" }]),
      reason: "native listing returned an unsupported response",
    },
    { context: embedded, output: "invalid JSON", reason: "native listing returned an unsupported response" },
    {
      context: embedded,
      output: new PrimeProcessError(1, origin.url, "bd dolt remote list", origin.url),
      reason: "native listing exited with code 1",
    },
    { context: embedded, output: new PrimeTimeoutError(5, "bd dolt remote list"), reason: "native listing timed out" },
  ];
  try {
    for (const example of cases) {
      context = example.context;
      listing = example.output;
      const start = bd.mock.calls.length;
      await c
        .commands()
        .get("oc-beads:diagnostics")!
        .execute({ ...c.detailsInvocation, prompt: { ...c.detailsInvocation.prompt, text: "details remote" } });
      const { ocBeadsWorkflow } = c.prompt.mock.calls.at(-1)![0].metadata as {
        ocBeadsWorkflow: { instructions: string };
      };
      const report = ocBeadsWorkflow.instructions;
      expect(report).toContain(`| Sync target | — | Unknown · ${example.reason} |`);
      expect(report).toContain("| Remote history | — | Not checked · No qualified Beads history probe is available |");
      expect(report).toContain("Comparison was not attempted");
      expect(report).not.toMatch(/secret|Check failed|Unresolved|❌ Unhealthy/);
      expect(bd.mock.calls.slice(start).map(([, args]) => args)).toEqual([
        ["version"],
        ["context", "--json"],
        ["hooks", "list", "--json"],
        ...(example.skipListing ? [] : [remoteList]),
      ]);
      const details = JSON.parse(report.split("\nDetails: ")[1]!.split("\n")[0]!) as {
        findings: Array<{ id: string; producer: string; meaning: string }>;
      };
      const target = details.findings.find(({ id }) => id === "sync-target");
      expect(target?.producer).toBe(
        example.skipListing
          ? "bd context --json"
          : "bd --readonly dolt remote list --json --sandbox and bd context --json",
      );
      if (example.skipListing) expect(target?.meaning).toContain("The strict-readonly remote listing was skipped");
    }
  } finally {
    await cleanup();
  }
});

test("diagnostics reports preceding context version and request instruction counts", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  let version = "1.3.1";
  const bd = mock(async (_directory: string, args: readonly string[]) => {
    if (args[0] === "version") return `bd version ${version}`;
    if (args[0] === "context") return JSON.stringify({ beads_dir: "/unused/.beads", cwd_repo_root: "/project" });
    if (args[0] === "hooks") return JSON.stringify({ hooks: [] });
    throw new Error("unexpected invocation");
  });
  const cleanup = await setupBeads(f.ctx, { bd, runPrime: async () => "prime body", warn: () => {} });
  try {
    await f.request("s1", "build");
    version = "1.3.4";
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    const metadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
    expect(metadata.ocBeadsWorkflow.instructions).toContain("1.3.1");
    expect(metadata.ocBeadsWorkflow.instructions).toContain("1.3.4");
    expect(metadata.ocBeadsWorkflow.instructions).toContain("requestInstructions");
  } finally {
    await cleanup();
  }
});

test("diagnostics captures witness and scoped managed guidance without remote secrets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "health-diag-"));
  const beads = path.join(root, ".beads");
  await mkdir(beads);
  await writeFile(path.join(beads, ".local_version"), "1.3.1\n");
  await writeFile(
    path.join(root, "AGENTS.md"),
    "<!-- BEGIN BEADS INTEGRATION v:1 profile:full -->body<!-- END BEADS INTEGRATION -->",
  );
  const f = fakeContext();
  Object.assign(f.ctx, { location: { directory: root } });
  const c = commandFixture(f);
  Object.assign(f.ctx.session, { get: async () => ({ agent: "build", location: { directory: root } }) });
  const bd = async (_dir: string, args: readonly string[]) =>
    args[0] === "version"
      ? "bd 1.3.4"
      : args[0] === "context"
        ? JSON.stringify({ beads_dir: beads, cwd_repo_root: root, sync_remote: "https://user:secret@example.invalid" })
        : JSON.stringify({ hooks: [] });
  const cleanup = await setupBeads(f.ctx, { bd, warn: () => {} });
  try {
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    const metadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
    const text = metadata.ocBeadsWorkflow.instructions;
    expect(text).toContain("1.3.1");
    expect(text).toContain("differ");
    expect(text).toContain("managedInstructions");
    expect(text).not.toContain("secret");
    expect(text).toContain('"sharedSkill":"missing"');
    expect(text).toContain(`PATH: \`${root}\``);
    expect(JSON.parse(text.split("\nDetails: ")[1]!.split("\n")[0]!).guard.workspace).toEqual({
      path: beads,
      repoRoot: root,
      remote: true,
    });
    await mkdir(path.join(root, ".agents", "skills", "beads"), { recursive: true });
    await writeFile(path.join(root, ".agents", "skills", "beads", "SKILL.md"), "local skill");
    await writeFile(path.join(beads, ".local_version"), "1.3.4\n");
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    let latest = (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } })
      .ocBeadsWorkflow.instructions;
    expect(latest).toContain("Recorded 1.3.4 matches running 1.3.4");
    expect(latest).toContain('"sharedSkill":"readable"');
    await rm(path.join(beads, ".local_version"));
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    latest = (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow
      .instructions;
    expect(latest).toContain("Witness missing");
  } finally {
    await cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("captured diagnostics renders compact hook summary before explicit evidence", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const bd = async (_directory: string, args: readonly string[]) =>
    args[0] === "version"
      ? "bd 1.3.4"
      : args[0] === "context"
        ? '{"beads_dir":"/none"}'
        : JSON.stringify({
            hooks: [{ Name: "pre-commit", Installed: false, Version: "", IsShim: false, Outdated: false }],
          });
  const cleanup = await setupBeads(f.ctx, { bd, warn: () => {} });
  try {
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    const metadata = c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } };
    const text = metadata.ocBeadsWorkflow.instructions;
    expect(text).toContain("**Plugin**");
    expect(text).toContain("**Beads**");
    expect(text.indexOf("0/1 installed")).toBeLessThan(text.indexOf("**Evidence**"));
    expect(JSON.parse(text.split("\nDetails: ")[1]!.split("\n")[0]!).hooks[0].name).toBe("pre-commit");
    expect(text).toContain("bd hooks list");
  } finally {
    await cleanup();
  }
});

test("native hook failures and installation mismatches stay independent of the sync target", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  let hookOutput = "broken";
  let timedOut = false;
  const calls: string[] = [];
  const bd = async (_directory: string, args: readonly string[]) => {
    const command = args.join(" ");
    calls.push(command);
    if (command === "version") return "bd 1.3.4";
    if (command === "context --json") return '{"beads_dir":"/none","backend":"dolt","dolt_mode":"embedded"}';
    if (command === "hooks list --json") {
      if (timedOut) throw new PrimeTimeoutError(5, "bd hooks list --json");
      return hookOutput;
    }
    if (command === "--readonly dolt remote list --json --sandbox")
      return '[{"name":"origin","url":"file:///fixture","status":"ok"}]';
    throw new Error("unexpected command");
  };
  const cleanup = await setupBeads(f.ctx, { bd, warn: () => {} });
  const capture = async () => {
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    return (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow
      .instructions;
  };
  try {
    const failed = await capture();
    expect(failed).toContain("hooks list observation unavailable or unsupported");
    expect(failed).toContain("| Git hooks | — | observation failed |");
    expect(failed).toContain("| Sync target | ✅ | Resolved · origin |");
    timedOut = true;
    expect(await capture()).toContain("hooks list observation unavailable or unsupported");
    timedOut = false;
    const shim = { Name: "pre-push", Installed: true, Version: "", IsShim: true, Outdated: false };
    hookOutput = JSON.stringify({ hooks: [shim] });
    const ordinaryShim = await capture();
    expect(ordinaryShim).toContain("| Git hooks | ✅ | 1/1 installed (shims) |");
    expect(ordinaryShim).not.toContain("bd hooks install");
    hookOutput = JSON.stringify({ hooks: [{ ...shim, Outdated: true }] });
    const outdatedShim = await capture();
    expect(outdatedShim).toContain("| Git hooks | ⚠️ | 1/1 installed · 1 outdated |");
    expect(outdatedShim).toContain("pre-push: outdated");
    expect(outdatedShim).toContain("Verify with `bd hooks list`.");
    hookOutput = JSON.stringify({
      hooks: [
        { Name: "pre-commit", Installed: true, Version: "", IsShim: false, Outdated: false },
        { Name: "post-merge", Installed: true, Version: "1.2.0", IsShim: false, Outdated: true },
        { Name: "pre-push", Installed: true, Version: "1.3.4", IsShim: true, Outdated: false },
      ],
    });
    const report = await capture();
    expect(report).toContain("installed without a reported version");
    expect(report).toContain("outdated");
    expect(report).toContain("shim does not certify current wrapper policy");
    expect(report).toContain("| Git hooks | ⚠️ | 3/3 installed (1 shim) · 1 outdated · 1 unrecognized |");
    expect(report).toContain("| Sync target | ✅ | Resolved · origin |");
    expect(report).toContain("**Plugin** ✅ Healthy");
    expect(report).toContain("**Beads** ⚠️ Mismatch");
    expect(report).not.toMatch(/no.configured.remote|hook execution succeeded/);
    expect(new Set(calls)).toEqual(
      new Set(["version", "context --json", "hooks list --json", "--readonly dolt remote list --json --sandbox"]),
    );
  } finally {
    await cleanup();
  }
});

test("diagnostics identifies incomplete root guidance and a missing shared skill", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "health-incomplete-"));
  const f = fakeContext({ directory: root });
  const c = commandFixture(f);
  Object.assign(f.ctx.session, { get: async () => ({ agent: "build", location: { directory: root } }) });
  const bd = async (_directory: string, args: readonly string[]) =>
    args[0] === "version"
      ? "bd 1.3.4"
      : args[0] === "context"
        ? JSON.stringify({ beads_dir: path.join(root, ".beads"), cwd_repo_root: root })
        : '{"hooks":[]}';
  const cleanup = await setupBeads(f.ctx, { bd, warn: () => {} });
  const capture = async () => {
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    return (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow
      .instructions;
  };
  try {
    await mkdir(path.join(root, "AGENTS.md"));
    let report = await capture();
    expect(report.split("\nDetails: ")[0]).toContain("| AGENTS Configured | — | unreadable |");
    expect(report.split("\nDetails: ")[0]).toContain("unreadable");
    expect(report.split("\nDetails: ")[0]).toContain("shared: absent");
    expect(report).toContain("not a plugin failure");
    let details = JSON.parse(report.split("\nDetails: ")[1]!.split("\n")[0]!);
    expect(details.findings.find((finding: { id: string }) => finding.id === "shared-skill-missing").class).toBe(
      "note",
    );
    await mkdir(path.join(root, ".agents", "skills", "beads", "SKILL.md"), { recursive: true });
    report = await capture();
    expect(report.split("\nDetails: ")[0]).toContain("shared: unreadable");
    details = JSON.parse(report.split("\nDetails: ")[1]!.split("\n")[0]!);
    expect(details.findings.find((finding: { id: string }) => finding.id === "shared-skill-unreadable").class).toBe(
      "failed",
    );
    await rm(path.join(root, "AGENTS.md"), { recursive: true });
    await writeFile(path.join(root, "AGENTS.md"), "x".repeat(65_537));
    report = await capture();
    expect(report.split("\nDetails: ")[0]).toContain("truncated");
    expect(report).toContain("last-request");
  } finally {
    await cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("diagnostics withholds hook observation when session location is unconfirmed", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  Object.assign(f.ctx.session, {
    get: async () => {
      throw new Error("session lookup failed");
    },
  });
  const bd = mock(async (_directory: string, _args: readonly string[]) => {
    throw new Error("unexpected native collection");
  });
  const cleanup = await setupBeads(f.ctx, { bd, warn: () => {} });
  try {
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    const instructions = (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } })
      .ocBeadsWorkflow.instructions;
    const snapshot = JSON.parse(instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
    const hookFinding = snapshot.findings.find((finding: { id: string }) => finding.id === "hooks-unavailable");
    expect(hookFinding.class).toBe("unknown");
    expect(hookFinding.observation).toContain("withheld: session location unconfirmed");
    expect(instructions.split("\nDetails: ")[0]).not.toContain("[failed] beads / bd hooks list");
    expect(bd).not.toHaveBeenCalled();
  } finally {
    await cleanup();
  }
});

test("diagnostics groups repeated hooks while retaining other findings and exact native evidence", () => {
  const names = ["pre-commit", "post-merge", "pre-push", "post-checkout", "prepare-commit-msg"];
  const missing = names.map((name) => ({ name, installed: false, version: "", shim: false, outdated: false }));
  const shims = names.map((name) => ({ name, installed: true, version: "1.3.4", shim: true, outdated: false }));
  const base = {
    plugin: { name: "fixture", version: "1" },
    host: "2.3.0",
    context: "ready",
    guard: { kind: "ready", version: "1.3.4" },
  } satisfies DiagnosticsSnapshot;
  for (const hooks of [missing, shims]) {
    const snapshot: DiagnosticsSnapshot = {
      ...base,
      hooks,
      local: {
        witness: { state: "differ", recorded: "1.3.1", running: "1.3.4" },
        managedInstructions: { state: "available", full: 0 },
        sharedSkill: "readable",
      },
      contextObservation: { version: "1.3.1", loadedAt: 1000 },
    };
    const report = renderHealthReport(snapshot, 2000, true);
    const [summary, details] = report.split("\nDetails: ");
    expect(summary).toContain("1.3.1 ≠ CLI 1.3.4");
    expect(summary).toContain("| Context | ⚠️ | Loaded under bd 1.3.1 |");
    const captured = JSON.parse(details!);
    expect(captured.hooks).toEqual(hooks);
    expect(
      captured.findings.filter((finding: { producer: string }) => finding.producer === "bd hooks list"),
    ).toHaveLength(1);
    expect(report).toContain(
      "https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/docs/getting-started/upgrading.md",
    );
  }
});

test("diagnostic duplicate findings preserve root and last-request provenance", () => {
  const requestAt = 1700000000000;
  const captureAt = 1700000060000;
  const report = renderHealthReport(
    {
      plugin: {},
      host: "2.3.0",
      context: "ready",
      guard: { kind: "ready" },
      hooks: [],
      local: {
        scope: "context cwd_repo_root",
        managedInstructions: { state: "available", full: 2 },
        sharedSkill: "readable",
      },
      requestInstructions: { at: requestAt, full: 2, retained: 1 },
    },
    captureAt,
    true,
  );
  const captured = JSON.parse(report.split("\nDetails: ")[1]!);
  const root = captured.findings.find((f: { id: string }) => f.id === "duplicate-full");
  const request = captured.findings.find((f: { id: string }) => f.id === "request-full-duplicates");
  expect(root.scope).toBe("root-file observation: context cwd_repo_root");
  expect(root.observedAt).toBe(new Date(captureAt).toISOString());
  expect(request.scope).toBe("last observed request");
  expect(request.observedAt).toBe(new Date(requestAt).toISOString());
  expect(captured.requestInstructions.at).toBe(requestAt);
});

test("witness guidance links the pinned release guide", () => {
  const report = renderHealthReport(
    {
      plugin: {},
      host: "2.3.0",
      context: "ready",
      guard: { kind: "ready" },
      hooks: [],
      local: { witness: { state: "differ", recorded: "1.3.1", running: "1.3.4" } },
    },
    0,
    true,
  );
  expect(report).toContain(
    "https://github.com/gastownhall/beads/blob/7ef2fd05eb0cd3bdbde051f93cfc14ccf270cdde/docs/getting-started/upgrading.md",
  );
});

test("registered diagnostics uses the last request time for duplicate guidance", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  let now = 1_700_000_000_000;
  const cleanup = await setupBeads(f.ctx, {
    now: () => now,
    warn: () => {},
    runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "BODY" },
  });
  try {
    const block = "<!-- BEGIN BEADS INTEGRATION v:1 profile:full -->BODY<!-- END BEADS INTEGRATION -->";
    const event: ContextEvent = {
      sessionID: "s1",
      agent: "build",
      system: [{ type: "text", text: `${block}\n${block}` }],
    };
    await f.hooks.get("context")!(event);
    const observedAt = now;
    now += 60_000;
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    const instructions = (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } })
      .ocBeadsWorkflow.instructions;
    const report = JSON.parse(instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
    const finding = report.findings.find((item: { id: string }) => item.id === "request-full-duplicates");
    expect(finding.scope).toBe("last observed request");
    expect(finding.observedAt).toBe(new Date(observedAt).toISOString());
    expect(report.requestInstructions.at).toBe(observedAt);
  } finally {
    await cleanup();
  }
});

/** Fixed observed fields shared by the representative compact-presentation cases. */
function presentationFixture() {
  return {
    plugin: { name: "@snarkipus/opencode-beads", version: "2.2.1" },
    host: "2.3.0",
    commands: {
      registration: "registered",
      lookup: "available",
      truncated: true,
      membershipTruncated: false,
      expectedCount: 30,
      effective: [],
      missing: [],
      mismatches: [],
    },
    skill: { effective: ["oc-beads"], collision: "none detected" },
    typedContinuity: "enabled: qualified beta registration",
    typedRegistration: "registered: beads namespace, code-mode-only",
    requestCapability: { agent: "build", capabilities: { execute: true } },
    context: "ready",
    contextObservation: { status: "ready", version: "1.3.4", loadedAt: 1000 },
    guard: { kind: "ready", version: "1.3.4", workspace: { path: "/fixture/.beads", repoRoot: "/fixture" } },
    local: {
      scope: "context cwd_repo_root",
      managedInstructions: { state: "available", full: 1, minimal: 0, codex: 1 },
      sharedSkill: "missing",
      witness: { state: "match", recorded: "1.3.4", running: "1.3.4" },
    },
    hooks: ["pre-commit", "post-merge", "pre-push", "post-checkout", "prepare-commit-msg"].map((name) => ({
      name,
      installed: true,
      shim: true,
      outdated: false,
      version: "1.3.4",
    })),
    syncTarget: { state: "resolved", name: "origin" },
    requestInstructions: { at: 1000, full: 1, minimal: 0, codex: 1, replaced: 1, retained: 1 },
    persistence: "uncertain: no final-write guarantee",
  } satisfies DiagnosticsSnapshot;
}

test("command observations suggest reviewing customization only for complete missing or changed membership", () => {
  const ready = presentationFixture();
  const hint = "Review command customization and rerun diagnostics.";
  const cases: Array<{ commands: DiagnosticsSnapshot["commands"]; expected: boolean }> = [
    { commands: { ...ready.commands, missing: ["oc-beads:show"] }, expected: true },
    { commands: { ...ready.commands, mismatches: [{ name: "oc-beads:show" }] }, expected: true },
    { commands: ready.commands, expected: false },
    { commands: { ...ready.commands, lookup: "failed", missing: ["oc-beads:show"] }, expected: false },
    { commands: { ...ready.commands, membershipTruncated: true, missing: ["oc-beads:show"] }, expected: false },
    { commands: { ...ready.commands, missing: undefined }, expected: false },
  ];
  for (const c of cases)
    expect(renderHealthReport({ ...ready, commands: c.commands }, 2000).includes(hint)).toBe(c.expected);
});

test("normal diagnostics uses compact tables and assessed severity with literal coverage", () => {
  const ready = presentationFixture();
  const report = renderHealthReport(ready, 2000);
  expect(report).toBe(`## Beads diagnostics — ✅ Healthy

DATE: \`1970-01-01T00:00:02.000Z\`

VERSION: @snarkipus/opencode-beads \`2.2.1\`

PATH: \`/fixture\`

Remote history not checked.

**Plugin** ✅ Healthy

| Check | Status | Value |
|---|---|---|
| Host | ✅ | OpenCode 2.3.0 |
| Commands | ✅ | 30/30 present |
| Skill | ✅ | oc-beads active · shared: absent |
| Typed tools | ✅ | Registered |
| Context | ✅ | Loaded |
| AGENTS Configured | ✅ | bd block |

**Beads** ✅ Healthy

| Check | Status | Value |
|---|---|---|
| bd CLI | ✅ | 1.3.4 |
| Workspace | ✅ | Located |
| Recorded bd version | ✅ | 1.3.4 = CLI |
| Git hooks | ✅ | 5/5 installed (shims) |
| Sync target | ✅ | Resolved · origin |
| Remote history | — | Not checked |`);
  expect(report).toContain("## Beads diagnostics — ✅ Healthy");
  expect(report).toContain("**Plugin**");
  expect(report).toContain("**Beads**");
  expect(report).toContain("| Check | Status | Value |");
  expect(report).toContain("| Recorded bd version | ✅ | 1.3.4 = CLI |");
  expect(report).not.toMatch(/partial|Request instructions|Codex|descriptions/i);
  expect(report).not.toMatch(
    /Details:|Limits:|does not establish|model-mediated|unique build|liveQualification|no final-write guarantee|remote freshness/i,
  );
  const first = renderHealthReport(
    {
      ...ready,
      context: "unobserved: no cached context",
      contextObservation: undefined,
      requestInstructions: "unobserved",
      requestCapability: undefined,
    },
    2000,
  );
  expect(first).toBe(`## Beads diagnostics — ✅ Healthy

DATE: \`1970-01-01T00:00:02.000Z\`

VERSION: @snarkipus/opencode-beads \`2.2.1\`

PATH: \`/fixture\`

Remote history not checked.

**Plugin** ✅ Healthy

| Check | Status | Value |
|---|---|---|
| Host | ✅ | OpenCode 2.3.0 |
| Commands | ✅ | 30/30 present |
| Skill | ✅ | oc-beads active · shared: absent |
| Typed tools | ✅ | Registered |
| Context | — | Not yet loaded |
| AGENTS Configured | ✅ | bd block |

**Beads** ✅ Healthy

| Check | Status | Value |
|---|---|---|
| bd CLI | ✅ | 1.3.4 |
| Workspace | ✅ | Located |
| Recorded bd version | ✅ | 1.3.4 = CLI |
| Git hooks | ✅ | 5/5 installed (shims) |
| Sync target | ✅ | Resolved · origin |
| Remote history | — | Not checked |`);
  expect(first).toContain("| Context | — | Not yet loaded |");
  expect(first).toContain("✅ Healthy");
  const unreadableSkill = renderHealthReport({ ...ready, local: { ...ready.local, sharedSkill: "unreadable" } }, 2000);
  expect(unreadableSkill).toContain("| Skill | — | oc-beads active · shared: unreadable |");
  expect(
    renderHealthReport({ ...ready, local: { ...ready.local, scope: "confirmed session directory" } }, 2000),
  ).toContain("| AGENTS Configured | ✅ | bd block |");
  const vps = renderHealthReport(
    { ...ready, hooks: ready.hooks.map((h) => ({ ...h, installed: false, shim: false, version: "" })) },
    2000,
  );
  expect(vps).toBe(`## Beads diagnostics — ✅ Healthy

DATE: \`1970-01-01T00:00:02.000Z\`

VERSION: @snarkipus/opencode-beads \`2.2.1\`

PATH: \`/fixture\`

Remote history not checked.

**Plugin** ✅ Healthy

| Check | Status | Value |
|---|---|---|
| Host | ✅ | OpenCode 2.3.0 |
| Commands | ✅ | 30/30 present |
| Skill | ✅ | oc-beads active · shared: absent |
| Typed tools | ✅ | Registered |
| Context | ✅ | Loaded |
| AGENTS Configured | ✅ | bd block |

**Beads** ✅ Healthy

| Check | Status | Value |
|---|---|---|
| bd CLI | ✅ | 1.3.4 |
| Workspace | ✅ | Located |
| Recorded bd version | ✅ | 1.3.4 = CLI |
| Git hooks | — | 0/5 installed · 5 missing/unreadable/unresolved |
| Sync target | ✅ | Resolved · origin |
| Remote history | — | Not checked |`);
  const incompatible = renderHealthReport(
    {
      ...ready,
      guard: { kind: "unsupported", installed: "1.3.0" },
      context: "withheld",
      hooks: "failed: unsupported",
      syncTarget: undefined,
    },
    2000,
  );
  expect(incompatible).toBe(`## Beads diagnostics — ❌ Unhealthy

DATE: \`1970-01-01T00:00:02.000Z\`

VERSION: @snarkipus/opencode-beads \`2.2.1\`

PATH: \`not observed\`

bd CLI unavailable or below the supported minimum. Remote history not checked.

**Plugin** ❌ Unhealthy

| Check | Status | Value |
|---|---|---|
| Host | ✅ | OpenCode 2.3.0 |
| Commands | ✅ | 30/30 present |
| Skill | ✅ | oc-beads active · shared: absent |
| Typed tools | ✅ | Registered |
| Context | ❌ | Withheld |
| AGENTS Configured | ✅ | bd block |

**Beads** ❌ Unhealthy

| Check | Status | Value |
|---|---|---|
| bd CLI | ❌ | 1.3.0 (needs ≥1.3.1) |
| Workspace | — | not observed |
| Recorded bd version | ✅ | 1.3.4 = CLI |
| Git hooks | — | observation failed |
| Sync target | — | Unknown · native listing not performed |
| Remote history | — | Not checked |

**Actions**

- Install or upgrade bd to ≥1.3.1, then start a new session. Check: \`bd version\`.`);
  expect(incompatible).toContain("❌ Unhealthy");
  expect(incompatible).toContain("| Git hooks | — | observation failed |");
  const noEvidence = renderHealthReport({}, 2000);
  expect(noEvidence).not.toContain("✅ Healthy");
  expect(noEvidence).toContain("| Sync target | — | Unknown · native listing not performed |");
  expect(noEvidence).toContain("| Remote history | — | Not checked |");
  expect(noEvidence).toContain("No checks assessed");
});

test("normal command membership, witness and write uncertainty keep distinct severity", () => {
  const ready = presentationFixture();
  const partial = renderHealthReport(
    { ...ready, commands: { ...ready.commands, membershipTruncated: true, missing: undefined } },
    2000,
  );
  expect(partial).toContain("| Commands | — | list incomplete |");
  const partialChanged = renderHealthReport(
    {
      ...ready,
      commands: {
        ...ready.commands,
        membershipTruncated: true,
        missing: undefined,
        mismatches: [{ name: "oc-beads:show" }],
      },
    },
    2000,
  );
  expect(partialChanged).toContain("| Commands | — | list incomplete · 1 changed |");
  const differs = renderHealthReport(
    { ...ready, local: { ...ready.local, witness: { state: "differ", recorded: "1.3.1", running: "1.3.4" } } },
    2000,
  );
  expect(differs).toContain("| Recorded bd version | ⚠️ | 1.3.1 ≠ CLI 1.3.4 |");
  expect(differs).not.toContain("❌ Unhealthy");
  const gap = renderHealthReport({ ...ready, persistence: "update task-1: uncertain; readback required" }, 2000);
  expect(gap).toContain("update task-1");
  expect(gap).toContain("⚠️ Mismatch");
});

test("registered diagnostics handles exact selectors locally and replays captured output once", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const bd = mock(async (_directory: string, args: readonly string[]) => {
    switch (args.join(" ")) {
      case "version":
        return "bd version 1.3.4";
      case "context --json":
        return '{"beads_dir":"/fixture/.beads","backend":"dolt","dolt_mode":"server","server_port":3307}';
      case "hooks list --json":
        return '{"hooks":[]}';
      case "--readonly dolt remote list --json --sandbox":
        return '[{"name":"origin","url":"https://user:remote-secret@example.invalid","sql_url":"https://sql-secret.example.invalid","cli_url":"https://cli-secret.example.invalid","status":"ok"}]';
      default:
        throw new Error("unexpected command");
    }
  });
  const prime = mock(async () => "PRIME INCLUDING MEMORY");
  const cleanup = await setupBeads(f.ctx, { bd, now: () => 2000, warn: () => {}, runPrime: prime });
  try {
    for (const text of [
      "",
      " DeTaIlS ",
      " ReMoTe ",
      " DeTaIlS ReMoTe\n",
      "remote please",
      "remote details",
      "details  remote",
      " HeLp ",
      "help me",
      "help\n",
    ]) {
      const input = { ...c.invocation, prompt: { ...c.invocation.prompt, text } };
      const beforeCalls = bd.mock.calls.length;
      await c.commands().get("oc-beads:diagnostics")!.execute(input);
      const sent = c.prompt.mock.calls.at(-1)![0];
      const snapshot = (sent.metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow;
      const selector = text.trim().toLowerCase();
      expect(snapshot.instructions.includes("Details: ")).toBe(selector === "details" || selector === "details remote");
      const framedReport = snapshot.instructions
        .split("\nBEGIN_DIAGNOSTIC_REPORT\n")[1]
        ?.split("\nEND_DIAGNOSTIC_REPORT\n")[0];
      expect(framedReport).toBeDefined();
      expect(snapshot.instructions).toEndWith("\nEND_DIAGNOSTIC_REPORT\n\nOriginal invocation:\n");
      if (selector === "help") {
        expect(bd.mock.calls.length).toBe(beforeCalls);
        expect(snapshot.instructions).toContain(diagnosticPresentation.DIAGNOSTICS_HELP);
      } else {
        expect(bd.mock.calls.slice(beforeCalls)).toEqual([
          [f.ctx.location.directory, ["version"]],
          [f.ctx.location.directory, ["context", "--json"]],
          [f.ctx.location.directory, ["hooks", "list", "--json"]],
          [f.ctx.location.directory, ["--readonly", "dolt", "remote", "list", "--json", "--sandbox"]],
        ]);
        expect(framedReport).toContain("| Sync target | ✅ | Resolved · origin |");
        expect(framedReport).toContain("| Remote history | — | Not checked");
        expect(framedReport!.includes("No qualified Beads history probe is available")).toBe(
          selector === "remote" || selector === "details remote",
        );
        expect(snapshot.instructions).not.toMatch(/secret|Check failed|cannot resolve|no.configured.remote/);
      }
      expect(sent.text).toBe(`/oc-beads:diagnostics${text ? `${/[\r\n]/.test(text) ? "\n" : " "}${text}` : ""}`);
      expect(sent.files).toBe(input.prompt.files);
      expect(sent.delivery).toBe(input.delivery);
      if (!prime.mock.calls.length) {
        const system = await f.request("s1", "build");
        expect(system.join("\n")).toContain("PRIME INCLUDING MEMORY");
        expect(prime).toHaveBeenCalledWith(f.ctx.location.directory, ["--full"]);
      }
      const count = bd.mock.calls.length;
      const stored = storedUserMessage("presented", String(sent.text), {
        ocBeadsWorkflow: { version: 1, ...snapshot },
      });
      Object.assign(f.ctx.session, { context: async () => [stored] });
      for (const kind of ["context", "compaction"]) {
        const event: ContextEvent = {
          sessionID: "s1",
          agent: "build",
          system: [],
          messages: [Message.make({ id: stored.id, role: "user", content: String(sent.text) })],
        };
        await f.hooks.get(kind)!(event);
        expect(event.messages![0]!.content[0]).toEqual(Message.text(snapshot.instructions));
        expect(event.messages![0]!.content[1]).toEqual(Message.text(String(sent.text)));
        const once = JSON.stringify(event.messages);
        await f.hooks.get(kind)!(event);
        expect(JSON.stringify(event.messages)).toBe(once);
      }
      expect(bd.mock.calls.length).toBe(count);
    }
  } finally {
    await cleanup();
  }
});

test("registered command completeness separates membership truncation from description clipping", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const cleanup = await setupBeads(f.ctx, {
    bd: async () => '{"hooks":[]}',
    warn: () => {},
    runtime: { guard: async () => ({ kind: "ready" }) },
  });
  try {
    const owned = c.commands().get("oc-beads:ready")!;
    c.callbacks.push((editor) => editor.add({ ...owned, description: "x".repeat(600) }));
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    let instructions = (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } })
      .ocBeadsWorkflow.instructions;
    let report = JSON.parse(instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
    expect(report.commands.truncated).toBe(true);
    expect(report.commands.membershipTruncated).toBe(false);
    expect(report.commands.expectedCount).toBe(30);
    expect(instructions).toContain("| Commands | ✅ | 30/30 present |");
    c.callbacks.push((editor) => editor.add({ ...owned, description: "custom changed" }));
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    instructions = (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } })
      .ocBeadsWorkflow.instructions;
    expect(instructions).toContain("| Commands | ⚠️ | 30/30 · 1 changed |");
    c.callbacks.push((editor) => {
      for (let i = 0; i < 130; i++) editor.add({ name: `custom-${i}`, description: "custom", execute: async () => {} });
    });
    await c.commands().get("oc-beads:diagnostics")!.execute(c.detailsInvocation);
    instructions = (c.prompt.mock.calls.at(-1)![0].metadata as { ocBeadsWorkflow: { instructions: string } })
      .ocBeadsWorkflow.instructions;
    report = JSON.parse(instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
    expect(report.commands.membershipTruncated).toBe(true);
    expect(instructions).toContain("| Commands | — | list incomplete · 1 changed |");
  } finally {
    await cleanup();
  }
});

test("AGENTS Configured recognizes markers while unknown guidance stays neutral", () => {
  const ready = presentationFixture();
  const rootObservations: PluginHealthObservation["managedInstructions"][] = [
    { state: "available", full: 0, minimal: 0, codex: 0 },
    { state: "missing" },
    { state: "unreadable" },
    { state: "truncated" },
  ];
  for (const managedInstructions of rootObservations) {
    const report = renderHealthReport({ ...ready, local: { ...ready.local, managedInstructions } }, 2000);
    expect(report).toContain("| AGENTS Configured | — |");
    expect(report).not.toMatch(/partial|Request instructions|full ·|Codex/);
  }
  for (const counts of [
    { full: 0, minimal: 1, codex: 0 },
    { full: 0, minimal: 0, codex: 1 },
  ]) {
    expect(
      renderHealthReport(
        { ...ready, local: { ...ready.local, managedInstructions: { state: "available", ...counts } } },
        2000,
      ),
    ).toContain("| AGENTS Configured | ✅ | bd block |");
  }
  expect(
    renderHealthReport(
      { ...ready, local: { ...ready.local, managedInstructions: { state: "available", full: 2 } } },
      2000,
    ),
  ).toContain("| AGENTS Configured | ⚠️ | duplicate bd blocks |");
  const unrecognized = renderHealthReport(
    { ...ready, hooks: [{ name: "pre-commit", installed: true, version: "", shim: false, outdated: false }] },
    2000,
  );
  expect(unrecognized).toContain("1 unrecognized");
  expect(unrecognized).not.toContain("not bd");
});

test("command names remain measurable without hiding missing or changed entries", () => {
  const ready = presentationFixture();
  expect(
    renderHealthReport(
      {
        ...ready,
        commands: { ...ready.commands, missing: ["oc-beads:ready"], mismatches: [{ name: "oc-beads:show" }] },
      },
      2000,
    ),
  ).toContain("| Commands | ⚠️ | 29/30 · 1 missing · 1 changed |");
  expect(renderHealthReport({ ...ready, commands: { ...ready.commands, lookup: "failed" } }, 2000)).toContain(
    "| Commands | — | not observed |",
  );
  const details = renderHealthReport(ready, 2000, true);
  expect(details).toContain('"requestInstructions":{"at":1000');
  expect(details).toContain('"truncated":true');
  for (const row of renderHealthReport({ ...ready, persistence: "update unresolved" }, 2000)
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Check"))) {
    expect(diagnosticPresentation.DIAGNOSTICS_HELP).toContain(row.split(" | ")[0]!.slice(2));
  }
});

test("diagnostic header metadata uses observed root and exact code-populated values", () => {
  const fixture = presentationFixture();
  const report = renderHealthReport(fixture, 2000);
  expect(report).toStartWith(
    "## Beads diagnostics — ✅ Healthy\n\nDATE: `1970-01-01T00:00:02.000Z`\n\nVERSION: @snarkipus/opencode-beads `2.2.1`\n\nPATH: `/fixture`\n\nRemote history not checked.\n\n**Plugin**",
  );
  expect(report.match(/DATE:/g)).toHaveLength(1);
  expect(report.match(/VERSION:/g)).toHaveLength(1);
  expect(report.match(/PATH:/g)).toHaveLength(1);
  expect(report).not.toContain("/fixture/.beads");
  const missingRoot = renderHealthReport(
    { ...fixture, guard: { ...fixture.guard, workspace: { path: "/fixture/.beads" } } },
    2000,
    true,
  );
  expect(missingRoot).toContain("PATH: `not observed`");
  expect(missingRoot).toContain('"path":"/fixture/.beads"');
  expect(
    renderHealthReport(
      {
        ...fixture,
        guard: { ...fixture.guard, workspace: { path: "/different/.beads", repoRoot: "/observed/root/" } },
      },
      2000,
    ),
  ).toContain("PATH: `/observed/root/`");
  const mismatch = renderHealthReport(
    { ...fixture, hooks: fixture.hooks.map((hook) => ({ ...hook, shim: false, outdated: true })) },
    2000,
  );
  expect(mismatch.indexOf("PATH:")).toBeLessThan(mismatch.indexOf("Git hooks need attention."));
});

test("actual Chat serializer keeps a registered diagnostic report separated from its invocation", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  const cleanup = await setupBeads(f.ctx, {
    bd: async () => '{"hooks":[]}',
    now: () => 2000,
    warn: () => {},
    runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "PRIME" },
  });
  try {
    await c
      .commands()
      .get("oc-beads:diagnostics")!
      .execute({ ...c.invocation, prompt: { ...c.invocation.prompt, text: "" } });
    const sent = c.prompt.mock.calls.at(-1)![0];
    const snapshot = (sent.metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow;
    const stored = storedUserMessage(
      "serialized-diagnostic",
      String(sent.text),
      sent.metadata as StoredUserMessage["metadata"],
    );
    Object.assign(f.ctx.session, { context: async () => [stored] });
    const event: ContextEvent = {
      sessionID: "s1",
      agent: "build",
      system: [],
      messages: [Message.make({ id: stored.id, role: "user", content: String(sent.text) })],
    };
    await f.hooks.get("context")!(event);
    const body = await Effect.runPromise(
      serializeChatRequest({
        model: {
          id: "fixture-no-network",
          provider: "openai",
          route: { endpoint: { baseURL: "https://fixture.invalid/v1" } },
          capabilities: {},
          compatibility: {},
        },
        system: [],
        messages: event.messages,
        tools: [],
      } as unknown as Parameters<typeof serializeChatRequest>[0]),
    );
    const content = body.messages.find((message) => message.role === "user")?.content;
    expect(content).toContain("\nEND_DIAGNOSTIC_REPORT\n\nOriginal invocation:\n/oc-beads:diagnostics");
    expect(content).toBe(`${snapshot.instructions}${String(sent.text)}`);
    expect(content).not.toContain("`/oc-beads:diagnostics");
  } finally {
    await cleanup();
  }
});
