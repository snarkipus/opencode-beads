import { describe, expect, mock, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as pluginModule from "../src/plugin";
import { renderBeadsContext } from "../src/context";
import { setupBeads, type HostContext } from "../src/host";
import type { CommandDefinition, CommandInvocation } from "@opencode/plugin/promise/command";
import type { ContinuityHost } from "../src/continuity";
import type { Info, ToolContext } from "@opencode/plugin/promise/tool";
import { DEFAULT_TASK_AGENT_STEPS, TASK_AGENT_PERMISSIONS } from "../src/agents";
import { BEADS_COMPACTION_GUIDANCE, primeFailureNotice } from "../src/guidance";

type ContextEvent = { sessionID: string; agent: string; system: Array<{ type: "text"; text: string }> };

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

function fakeContext(options: {
  directory?: string;
  pluginOptions?: Record<string, unknown>;
  appVersion?: string;
} = {}) {
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
    app: { name: "OpenCode", version: options.appVersion ?? "2.1.1", channel: "stable" },
    location: { directory: options.directory ?? "/project" },
    options: options.pluginOptions ?? {},
    event: { subscribe: events.subscribe },
    agent: { get: agentGet, transform: agentTransform },
    session: {
      hook: mock(async (name: string, callback: (event: ContextEvent) => void) => {
        hooks.set(name, callback);
        return { dispose: async () => {} };
      }),
    },
  } as unknown as HostContext;

  async function request(sessionID: string, agent: string): Promise<string[]> {
    const event: ContextEvent = { sessionID, agent, system: [{ type: "text", text: "HOST" }] };
    const hook = hooks.get("context");
    if (!hook) throw new Error("context hook not registered");
    await hook(event);
    return event.system.slice(1).map((part) => part.text);
  }

  return { ctx, hooks, events, agentGet, agents, request };
}

describe("OpenCode V2 entry", () => {
  test("default-exports a V2 plugin definition and nothing else", () => {
    expect(Object.keys(pluginModule)).toEqual(["default"]);
    expect(pluginModule.default.id).toBe("opencode-beads");
    expect(typeof pluginModule.default.setup).toBe("function");
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
    Object.assign(f.ctx, { tool: { hook: async (_name: string, callback: typeof after) => { after = callback; return { dispose: disposed }; } } });
    const host = {
      location: { directory: "/project", project: { directory: "/project" } },
      permission: { assert: mock(async () => {}) },
      session: { get: async () => ({ location: { directory: "/project" } }) },
      tool: { transform: async (callback: (editor: { add(tool: Info): void }) => void) => { callback({ add: (tool) => tools.push(tool) }); return { dispose: disposed }; } },
    } as unknown as ContinuityHost & { tool: { transform: any } };
    let output = "BEFORE";
    const prime = mock(async () => output);
    const acknowledged = mock(() => {});
    const bd = mock(async (_cwd: string, args: readonly string[]) => {
      if (args[0] === "version") return "1.3.1";
      if (args[0] === "context") return '{"beads_dir":"/project/.beads","backend":"dolt","dolt_mode":"embedded","database":"beads"}';
      return '{"key":"lesson","value":"validated finding","action":"remembered","committed":false,"commit_error":"not committed"}';
    });
    Object.assign(f.ctx, { location: host.location, permission: host.permission, tool: { ...f.ctx.tool, ...host.tool } });
    Object.assign(f.ctx.session, host.session);
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" }), prime },
      continuityQualified: true, continuity: {
        bd, acknowledged, realpath: async (path) => path,
        readText: async () => "1.3.1",
      },
    });
    await f.request("s1", "build");
    await f.request("s2", "build");
    const tool = tools.find((tool) => tool.name === "beads_remember")!;
    const context = { sessionID: "s1", agent: "worker", messageID: "m1", id: "c1", signal: new AbortController().signal, progress: async () => {} } as unknown as ToolContext;
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

  test("ordinary setup withholds privileged continuity registration", async () => {
    const f = fakeContext();
    const transform = mock(async () => ({ dispose: async () => {} }));
    Object.assign(f.ctx, { tool: { transform, hook: mock(async () => ({ dispose: async () => {} })) } });
    const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime: async () => "PRIME" } });
    expect(transform).not.toHaveBeenCalled();
    cleanup();
  });

  test("compaction preserves native replay, keepID, legacy recent and model boundaries without I/O", async () => {
    const f = fakeContext();
    const prime = mock(async () => "PRIME");
    const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime } });
    await f.request("s1", "build");
    const hook = f.hooks.get("compaction")!;
    for (const metadata of [{ keepID: "fork-remapped-id" }, { recent: "legacy retained tail" }]) {
      for (const model of [{ providerID: "provider-a", id: "model-a" }, { providerID: "provider-b", id: "model-b" }]) {
        const event = { sessionID: "s1", agent: "build", system: [], model,
          messages: [{ role: "assistant", native: { messages: [{ opaque: true }] }, metadata }],
          result: { summary: "host summary", metadata, native: { messages: [{ replacement: true }] } },
        };
        const before = JSON.stringify({ messages: event.messages, result: event.result, model });
        await hook(event);
        expect(JSON.stringify({ messages: event.messages, result: event.result, model: event.model })).toBe(before);
      }
    }
    expect(prime).toHaveBeenCalledTimes(1);
    cleanup();
  });
  test("reports and skips setup for an unsupported OpenCode host", async () => {
    for (const appVersion of ["2.0.29", "2.1.0", "2.1.1-beta.1", "2.2.0", "unknown"]) {
      const f = fakeContext({ appVersion });
      const warn = mock(() => {});

      const cleanup = await setupBeads(f.ctx, { warn });

      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`OpenCode ${appVersion}`));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(">=2.1.1 <2.2"));
      expect(f.agents.size).toBe(0);
      expect(f.hooks.size).toBe(0);
      cleanup();
    }
  });

  test("admits candidate patch hosts within the selected 2.1 line", async () => {
    const f = fakeContext({ appVersion: "2.1.8" });
    const cleanup = await setupBeads(f.ctx, {
      runtime: { guard: async () => ({ kind: "ready" as const }), prime: async () => "PRIME" },
    });

    expect([...f.hooks.keys()]).toEqual(["context", "compaction"]);
    expect([...f.agents.keys()]).toEqual(["beads-task-agent"]);
    cleanup();
  });

  test("registers the bounded task agent as a subagent and keeps Luna opt-in", async () => {
    const ready = { runtime: { guard: async () => ({ kind: "ready" as const }), prime: async () => "PRIME" } };
    const vanilla = fakeContext();
    const cleanupVanilla = await setupBeads(vanilla.ctx, ready);
    expect([...vanilla.agents.keys()]).toEqual(["beads-task-agent"]);
    const agent = vanilla.agents.get("beads-task-agent");
    expect(agent?.mode).toBe("subagent");
    expect(agent?.name).toBe("beads-task-agent");
    expect(agent?.model).toBeUndefined();
    expect(String(agent?.system)).toContain("process exactly one bead");
    expect(String(agent?.system)).toContain("bd update <id> --claim --json");
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


  test("appends rendered prime to eligible requests through the context hook only", async () => {
    const f = fakeContext();
    const prime = mock(async (_directory: string) => "PRIME");
    const cleanup = await setupBeads(f.ctx, { runtime: { guard: async () => ({ kind: "ready" }), prime } });

    expect([...f.hooks.keys()]).toEqual(["context", "compaction"]);
    expect(await f.request("s1", "build")).toEqual([renderBeadsContext("PRIME", "primary")]);
    expect(await f.request("s1", "build")).toEqual([renderBeadsContext("PRIME", "primary")]);
    expect(await f.request("s1", "explore")).toEqual([]);
    expect(prime).toHaveBeenCalledTimes(1);
    expect(prime).toHaveBeenCalledWith("/project", expect.any(AbortSignal));
    expect(f.agentGet).toHaveBeenCalledWith({ agentID: "build" });
    cleanup();
  });

  test("minimizes bd's full AGENTS.md block only when prime is attached", async () => {
    const block =
      "<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:1 -->\nPRIME\n<!-- END BEADS INTEGRATION -->";
    let guard: { kind: "ready" } | { kind: "migration-pending"; installed: string; store: string } = {
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
    expect(withPrime.system[1]?.text).toBe(renderBeadsContext("PRIME", "primary"));

    const subagent: ContextEvent = { sessionID: "s1", agent: "explore", system: [{ type: "text", text: block }] };
    await hook(subagent);
    expect(subagent.system).toEqual([{ type: "text", text: block }]);

    guard = { kind: "migration-pending", installed: "1.3.1", store: "1.2.2" };
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
      { type: "text", text: renderBeadsContext("PRIME", "primary") },
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

  test("withholds prime behind the store guard unless the autoMigrate option is set", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "beads-host-"));
    try {
      await writeFile(path.join(directory, ".local_version"), "1.2.2\n");
      const bd = mock(async (_cwd: string, args: readonly string[]) =>
        args[0] === "version" ? "bd version 1.3.1 (abc)" : JSON.stringify({ beads_dir: directory })
      );
      const prime = mock(async (_directory: string) => "PRIME");

      const guarded = fakeContext({ directory });
      const cleanupGuarded = await setupBeads(guarded.ctx, { bd, runtime: { prime } });
      const [notice] = await guarded.request("s1", "build");
      expect(notice).toContain("<beads-notice>");
      expect(notice).toContain("Do not run bd commands");
      expect(prime).not.toHaveBeenCalled();
      cleanupGuarded();

      const optedIn = fakeContext({ directory, pluginOptions: { autoMigrate: true } });
      const cleanupOptedIn = await setupBeads(optedIn.ctx, { bd, runtime: { prime } });
      expect(await optedIn.request("s1", "build")).toEqual([renderBeadsContext("PRIME", "primary")]);
      expect(prime).toHaveBeenCalledWith(directory, expect.any(AbortSignal));
      cleanupOptedIn();
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
    return { dispose: async () => { callbacks.splice(callbacks.indexOf(callback), 1); } };
  });
  const prompt = mock(async (_input: Record<string, unknown>) => ({}));
  Object.assign(f.ctx, { command: {
    transform,
    list: async () => {
      if (lookupFailed) throw new Error("lookup failed");
      return { data: [...commands().values()].filter((entry) => entry.name !== omitted).map(({ name, description }) => ({ name, description })) };
    },
  } });
  Object.assign(f.ctx.session, { prompt, get: async () => ({ agent: "build", location: { directory: "/project" } }) });
  const invocation = { sessionID: "s1", delivery: "queue", prompt: {
    text: "literal '$ARGUMENTS' $(touch nope) `text`", files: [{ uri: "file:///tmp/a%20b" }],
    agents: [{ name: "build" }], skills: [{ id: "oc-beads" }],
  } } as unknown as CommandInvocation;
  return { callbacks, commands, transform, prompt, invocation,
    failLookup: (failed: boolean) => { lookupFailed = failed; },
    omit: (name?: string) => { omitted = name; },
  };
}

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
    expect(c.commands().has("oc-beads:status")).toBe(false);
    const add = mock((_definition: CommandDefinition) => {});
    packageCallback({ add });
    expect(add).not.toHaveBeenCalled();
    await expect(ready.execute(c.invocation)).rejects.toThrow("unloaded");
    expect(f.events.aborted()).toBe(true);
  });

  test("registers after an initial lookup failure and reports observable mismatches, missing names and ownership blind spots", async () => {
    const f = fakeContext();
    const c = commandFixture(f);
    c.failLookup(true);
    const cleanup = await setupBeads(f.ctx, { warn: () => {}, runtime: { guard: async () => ({ kind: "ready" }) } });
    expect(c.transform).toHaveBeenCalledTimes(1);
    c.failLookup(false);
    const ready = c.commands().get("oc-beads:ready")!;
    const status = c.commands().get("oc-beads:status")!;
    const report = async () => {
      await status.execute(c.invocation);
      const text = String(c.prompt.mock.calls.at(-1)![0].text);
      return JSON.parse(text.split("\n")[1]!);
    };
    let observed = await report();
    expect(observed.commands.registration).toBe("registered");
    expect(observed.commands.lookup).toBe("available");
    expect(observed.commands.ownership).toContain("unavailable");
    expect(observed.commands.ownership).toContain("identical-description");
    expect(observed.commands.ownership).toContain("do not prove ownership");
    c.callbacks.push((editor) => editor.add({ ...ready, description: "USER DESCRIPTION" }));
    observed = await report();
    expect(observed.commands.mismatches).toContainEqual({ name: ready.name, expectedDescription: ready.description, effectiveDescription: "USER DESCRIPTION" });
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
    const list = mock(async () => { throw new Error("setup must not gate on list"); });
    Object.assign(f.ctx, { skill: { list, transform: async (callback: (editor: unknown) => void) => {
      callbacks.push(callback); rebuild();
      return { dispose: async () => { callbacks.splice(callbacks.indexOf(callback), 1); rebuild(); } };
    } } });
    const cleanup = await setupBeads(f.ctx, { warn: () => {} });
    expect(list).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);
    expect(skills.get("oc-beads")).toBe(custom);
    before = undefined; rebuild();
    expect(skills.get("oc-beads")?.content).toContain("Beads work in OpenCode");
    after = custom; rebuild();
    expect(skills.get("oc-beads")).toBe(custom);
    after = undefined; rebuild();
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
    const own = (name: string) => ({ dispose: async () => {
      disposed.push(name);
      await new Promise((resolve) => setTimeout(resolve, 1));
      completed.push(name);
    } });
    const originalAgent = f.ctx.agent.transform;
    const transform: HostContext["agent"]["transform"] = async (callback) => { await originalAgent(callback); return own("agent"); };
    Object.assign(f.ctx.agent, { transform });
    const originalHook = f.ctx.session.hook;
    const hook: HostContext["session"]["hook"] = async (name, callback) => { await originalHook(name, callback); return own(`hook:${name}`); };
    Object.assign(f.ctx.session, { hook });
    Object.assign(f.ctx, {
      skill: { list: async () => ({ data: [] }), transform: async (callback: (editor: unknown) => void) => { callback({ list: () => [], add: () => {} }); return own("skill"); } },
      tool: { transform: async () => own("tool"), hook: async () => own("tool-hook") },
      permission: { assert: async () => {} },
    });
    Object.assign(f.ctx.session, { get: async () => ({ location: { directory: "/project" } }) });
    let signal: AbortSignal | undefined;
    let release: (value: string) => void = () => {};
    const cleanup = await setupBeads(f.ctx, { continuityQualified: true, runtime: {
      guard: async () => ({ kind: "ready" }),
      prime: async (_cwd, abortSignal) => { signal = abortSignal; return new Promise<string>((resolve) => { release = resolve; }); },
    } });
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
    const transform: HostContext["agent"]["transform"] = async (callback) => { await originalAgent(callback); return { dispose: disposed }; };
    Object.assign(f.ctx.agent, { transform });
    Object.assign(f.ctx.session, { hook: async () => { throw new Error("host hook failed"); } });
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
    workflowAssets: { readText: async () => { throw new Error("sensitive exception content"); } },
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
  const transform: HostContext["agent"]["transform"] = async () => ({ dispose: async () => { throw new Error("dispose failed"); } });
  Object.assign(f.ctx.agent, { transform });
  const originalHook = f.ctx.session.hook;
  const hook: HostContext["session"]["hook"] = async (name, callback) => { await originalHook(name, callback); return { dispose: disposed }; };
  Object.assign(f.ctx.session, { hook });
  const cleanup = await setupBeads(f.ctx, { warn });
  await expect(cleanup()).rejects.toThrow("Beads cleanup failed");
  expect(disposed).toHaveBeenCalledTimes(2);
  expect(warn.mock.calls.flat().join("\n")).toContain("cleanup-failed");
  expect(f.events.aborted()).toBe(true);
});

test("registered status distinguishes missing, held, failed, loading and uncertain context using only config probes", async () => {
  const f = fakeContext({ pluginOptions: { autoMigrate: true } });
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
    throw new Error("unexpected store-opening probe");
  });
  let release: (text: string) => void = () => {};
  const prime = mock(async () => new Promise<string>((resolve) => { release = resolve; }));
  const cleanup = await setupBeads(f.ctx, { bd, runtime: { prime }, now: () => time, retryMs: 1, warn: () => {} });
  const status = c.commands().get("oc-beads:status")!;
  const report = async () => {
    await status.execute(c.invocation);
    return JSON.parse(String(c.prompt.mock.calls.at(-1)![0].text).split("\n")[1]!);
  };
  expect((await report()).context).toBe("missing: not loaded");
  await f.request("s1", "build");
  expect((await report()).context).toBe("missing");
  version = "1.2.0"; time += 2;
  await f.request("s1", "build");
  expect((await report()).context).toBe("withheld");
  version = "1.3.1"; probe = "failed"; time += 2;
  await f.request("s1", "build");
  const failed = await report();
  expect(failed.context).toBe("failed");
  expect(failed.guard.kind).toBe("probe-failed");
  expect(prime).not.toHaveBeenCalled();
  probe = "ready"; time += 2;
  const pending = f.request("s1", "build");
  await settle();
  expect((await report()).context).toBe("uncertain: context refresh in progress");
  release("PRIME");
  await pending;
  expect((await report()).context).toBe("ready");
  expect(prime).toHaveBeenCalledTimes(1);
  f.events.push({ type: "session.execution.interrupted", data: { sessionID: "s1" } });
  await settle();
  expect((await report()).persistence).toContain("no final checkpoint");
  Object.assign(f.ctx.session, { get: async () => { throw new Error("unknown location"); } });
  const count = bd.mock.calls.length;
  const unknown = await report();
  expect(unknown.context).toBe("uncertain: session lookup failed");
  expect(unknown.guard.kind).toBe("withheld");
  expect(unknown.persistence).toContain("uncertain: no final-write guarantee");
  expect(bd).toHaveBeenCalledTimes(count);
  expect(new Set(bd.mock.calls.map(([, args]) => args.join(" ")))).toEqual(new Set(["version", "context --json"]));
  await cleanup();
});

test("unload aborts an in-flight native status without submitting a late prompt", async () => {
  const f = fakeContext();
  const c = commandFixture(f);
  let signal: AbortSignal | undefined;
  let release: () => void = () => {};
  const cleanup = await setupBeads(f.ctx, { warn: () => {}, runtime: {
    guard: async (_directory, abortSignal) => {
      signal = abortSignal;
      await new Promise<void>((resolve) => { release = resolve; });
      return { kind: "ready" };
    },
  } });
  const pending = c.commands().get("oc-beads:status")!.execute(c.invocation);
  await settle();
  await cleanup();
  expect(signal?.aborted).toBe(true);
  release();
  await expect(pending).rejects.toThrow("unloaded");
  expect(c.prompt).not.toHaveBeenCalled();
});

test("a failed native command registration diagnoses failure and releases earlier owned registrations", async () => {
  const f = fakeContext();
  commandFixture(f);
  const disposed = mock(async () => {});
  const original = f.ctx.agent.transform;
  const transform: HostContext["agent"]["transform"] = async (callback) => { await original(callback); return { dispose: disposed }; };
  Object.assign(f.ctx.agent, { transform });
  Object.assign(f.ctx.command!, { transform: async () => { throw new Error("native registration failed"); } });
  const warnings: string[] = [];
  await expect(setupBeads(f.ctx, { warn: (message) => warnings.push(message) })).rejects.toThrow("native registration failed");
  expect(warnings.join("\n")).toContain("command-registration-failed");
  expect(disposed).toHaveBeenCalledTimes(1);
});
