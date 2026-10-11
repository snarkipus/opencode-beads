import { describe, expect, mock, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as pluginModule from "../src/plugin";
import { renderBeadsContext } from "../src/context";
import { setupBeads, type HostContext } from "../src/host";

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

function fakeContext(options: { directory?: string; pluginOptions?: Record<string, unknown> } = {}) {
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
    expect(agent?.permissions).toEqual([]);
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

    expect([...f.hooks.keys()]).toEqual(["context"]);
    expect(await f.request("s1", "build")).toEqual([renderBeadsContext("PRIME", "primary")]);
    expect(await f.request("s1", "build")).toEqual([renderBeadsContext("PRIME", "primary")]);
    expect(await f.request("s1", "explore")).toEqual([]);
    expect(prime).toHaveBeenCalledTimes(1);
    expect(prime).toHaveBeenCalledWith("/project");
    expect(f.agentGet).toHaveBeenCalledWith({ agentID: "build" });
    cleanup();
  });

  test("minimizes bd's full AGENTS.md block only when prime is attached", async () => {
    const block =
      "<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:1 -->\nfull reference\n<!-- END BEADS INTEGRATION -->";
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
    expect(withPrime.system[0]?.text).not.toContain("full reference");
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
        args[0] === "version" ? "bd version 1.3.1 (abc)" : JSON.stringify({ path: directory })
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
      expect(prime).toHaveBeenCalledWith(directory);
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

    expect(await f.request("s1", "build")).toEqual([]);
    time = 1;
    expect(await f.request("s1", "build")).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("prime_failed");
    time = 1_002;
    await f.request("s1", "build");
    expect(warn).toHaveBeenCalledTimes(2);
    cleanup();
  });
});
