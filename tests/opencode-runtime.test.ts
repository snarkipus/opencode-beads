import { describe, expect, mock, test } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import type {
  AppAgentsData,
  AppLogData,
  SessionMessagesData,
  SessionPromptData,
} from "@opencode-ai/sdk";
import { createOpenCodeRuntime, OpenCodeTimeoutError } from "../src/opencode-runtime";
import { createBeadsHooks } from "../src/plugin-hooks";
import * as pluginModule from "../src/plugin";
import { BeadsPlugin } from "../src/plugin";

type Responses = {
  messages?: unknown;
  agents?: unknown;
  prompt?: unknown;
  log?: unknown;
};

function createClient(responses: Responses = {}) {
  const messages = mock(async (_request: SessionMessagesData) =>
    (responses.messages ?? { data: [] })
  );
  const agents = mock(async (_request: AppAgentsData) =>
    (responses.agents ?? { data: [] })
  );
  const prompt = mock(async (_request: SessionPromptData) =>
    (responses.prompt ?? { data: { info: {}, parts: [] } })
  );
  const log = mock(async (_request?: AppLogData) => responses.log ?? { data: true });

  // The production adapter retains the official client type; this test fake supplies only used methods.
  const client = {
    session: { messages, prompt },
    app: { agents, log },
  } as unknown as PluginInput["client"];

  return { client, messages, agents, prompt, log };
}

const validMessages = [
  {
    info: {
      role: "user",
      agent: "build",
      model: { providerID: "provider", modelID: "model" },
    },
    parts: [{ type: "text", text: "hello" }],
  },
] as const;

const validAgents = [{ name: "build", mode: "primary" }] as const;

describe("OpenCode SDK runtime", () => {
  test("exports only the OpenCode plugin function from the package entry", () => {
    expect(Object.keys(pluginModule)).toEqual(["BeadsPlugin"]);
    expect(Object.values(pluginModule).every((value) => typeof value === "function")).toBeTrue();
  });

  test("uses the official chat.message input context", async () => {
    const fixture = createClient({
      messages: {
        data: [
          {
            info: { role: "user" },
            parts: [
              {
                type: "text",
                text: '<beads-context audience="primary">\npresent\n</beads-context>',
                synthetic: true,
              },
            ],
          },
        ],
      },
    });
    const hooks = await BeadsPlugin({
      client: fixture.client,
      directory: "/project",
      worktree: "/worktree",
    } as PluginInput);
    const onMessage = hooks["chat.message"];
    if (!onMessage) throw new Error("chat.message hook missing");

    await onMessage(
      { sessionID: "input-session", agent: "build" },
      { message: { sessionID: "output-session" }, parts: [] } as never
    );

    expect(fixture.messages).toHaveBeenCalledWith({
      path: { id: "input-session" },
      query: { directory: "/project", limit: undefined },
      signal: expect.any(AbortSignal),
    });
  });

  test("ignores its own synthetic context message instead of re-entering injection", async () => {
    const fixture = createClient();
    const hooks = await BeadsPlugin({
      client: fixture.client,
      directory: "/project",
      worktree: "/worktree",
    } as PluginInput);
    const onMessage = hooks["chat.message"];
    if (!onMessage) throw new Error("chat.message hook missing");

    await onMessage(
      { sessionID: "session", agent: "build" },
      {
        message: { sessionID: "session" },
        parts: [
          {
            type: "text",
            text: "<beads-context>\ncanonical workflow\n</beads-context>",
            synthetic: true,
          },
        ],
      } as never
    );

    expect(fixture.agents).not.toHaveBeenCalled();
    expect(fixture.messages).not.toHaveBeenCalled();
    expect(fixture.prompt).not.toHaveBeenCalled();
  });

  test("does not trust ordinary hook text containing the context marker", async () => {
    const fixture = createClient({
      messages: {
        data: [
          {
            info: { role: "user" },
            parts: [
              {
                type: "text",
                text: '<beads-context audience="primary">\npersisted\n</beads-context>',
                synthetic: true,
              },
            ],
          },
        ],
      },
    });
    const hooks = await BeadsPlugin({
      client: fixture.client,
      directory: "/project",
      worktree: "/worktree",
    } as PluginInput);
    const onMessage = hooks["chat.message"];
    if (!onMessage) throw new Error("chat.message hook missing");

    await onMessage(
      { sessionID: "session", agent: "build" },
      {
        message: { sessionID: "session" },
        parts: [{ type: "text", text: "user asked about <beads-context> markup" }],
      } as never
    );

    expect(fixture.messages).toHaveBeenCalledTimes(1);
  });

  test("reinjects after compaction without recursively handling its nested prompt", async () => {
    const directory = process.cwd();
    const fixture = createClient({
      messages: { data: validMessages },
      agents: { data: validAgents },
    });
    const prime = mock(async (projectDirectory: string) => {
      expect(projectDirectory).toBe(directory);
      return "hermetic prime context";
    });
    const runtime = createOpenCodeRuntime(fixture.client, { prime });
    const hooks = await createBeadsHooks(runtime, directory);
    const onEvent = hooks.event;
    const onMessage = hooks["chat.message"];
    if (!onEvent || !onMessage) throw new Error("required hooks missing");

    await onEvent({
      event: { type: "session.compacted", properties: { sessionID: "compacted" } },
    } as never);

    expect(prime).toHaveBeenCalledTimes(1);
    expect(fixture.prompt).toHaveBeenCalledTimes(1);
    const nestedParts = fixture.prompt.mock.calls[0]?.[0].body?.parts;
    expect(nestedParts?.[0]).toMatchObject({ type: "text", synthetic: true });
    if (nestedParts?.[0]?.type !== "text") throw new Error("nested context text missing");
    expect(nestedParts[0].text).toContain(
      '<beads-context audience="primary">\nhermetic prime context\n</beads-context>'
    );

    await onMessage(
      { sessionID: "compacted", agent: "build" },
      { message: { sessionID: "compacted" }, parts: nestedParts } as never
    );
    expect(prime).toHaveBeenCalledTimes(1);
    expect(fixture.prompt).toHaveBeenCalledTimes(1);
    expect(fixture.messages).toHaveBeenCalledTimes(1);
  });

  test("retires controller state on the official session.deleted event", async () => {
    const fixture = createClient({
      messages: {
        data: [
          {
            info: {
              role: "user",
              system: '<beads-context audience="primary">\nexisting\n</beads-context>',
            },
            parts: [],
          },
        ],
      },
      agents: { data: validAgents },
    });
    const hooks = await BeadsPlugin({
      client: fixture.client,
      directory: "/project",
      worktree: "/worktree",
    } as PluginInput);
    const onEvent = hooks.event;
    const onMessage = hooks["chat.message"];
    if (!onEvent || !onMessage) throw new Error("required hooks missing");

    await onMessage(
      { sessionID: "deleted", agent: "build" },
      { message: { sessionID: "deleted" }, parts: [] } as never
    );
    await onEvent({
      event: { type: "session.deleted", properties: { info: { id: "deleted" } } },
    } as never);
    await onMessage(
      { sessionID: "deleted", agent: "build" },
      { message: { sessionID: "deleted" }, parts: [] } as never
    );

    expect(fixture.messages).toHaveBeenCalledTimes(2);
  });

  test("uses official nested requests and propagates project scope", async () => {
    const fixture = createClient({
      messages: { data: validMessages },
      agents: { data: validAgents },
    });
    const runtime = createOpenCodeRuntime(fixture.client);
    const body = {
      noReply: true as const,
      model: { providerID: "provider", modelID: "model" },
      agent: "build",
      parts: [{ type: "text" as const, text: "context", synthetic: true as const }],
    };

    await expect(runtime.getMessages("/project", "session", 50)).resolves.toEqual(
      validMessages
    );
    await expect(runtime.getAgents("/project")).resolves.toEqual(validAgents);
    await runtime.prompt("/project", "session", body);
    await runtime.diagnose({ code: "prompt_failed", directory: "/project", sessionID: "s" });

    expect(fixture.messages).toHaveBeenCalledWith({
      path: { id: "session" },
      query: { directory: "/project", limit: 50 },
      signal: expect.any(AbortSignal),
    });
    expect(fixture.agents).toHaveBeenCalledWith({
      query: { directory: "/project" },
      signal: expect.any(AbortSignal),
    });
    expect(fixture.prompt).toHaveBeenCalledWith({
      path: { id: "session" },
      query: { directory: "/project" },
      body,
      signal: expect.any(AbortSignal),
    });
    expect(fixture.log).toHaveBeenCalledWith({
      query: { directory: "/project" },
      body: {
        service: "opencode-beads",
        level: "warn",
        message: "prompt_failed",
        extra: { sessionID: "s" },
      },
      signal: expect.any(AbortSignal),
    });

    await runtime.diagnose({
      code: "config_collision",
      directory: "/project",
      surface: "command",
      names: ["beads:ready", "beads:show"],
    });
    expect(fixture.log).toHaveBeenLastCalledWith({
      query: { directory: "/project" },
      body: {
        service: "opencode-beads",
        level: "warn",
        message: "config_collision",
        extra: { surface: "command", names: ["beads:ready", "beads:show"] },
      },
      signal: expect.any(AbortSignal),
    });
  });

  test("aborts and bounds SDK reads, prompts, and diagnostics", async () => {
    const fixture = createClient();
    const pending = new Promise<never>(() => {});
    fixture.messages.mockImplementation(() => pending);
    fixture.agents.mockImplementation(() => pending);
    fixture.prompt.mockImplementation(() => pending);
    fixture.log.mockImplementation(() => pending);
    const runtime = createOpenCodeRuntime(fixture.client, {
      requestTimeoutMs: 5,
      diagnosticTimeoutMs: 5,
    });
    const body = {
      noReply: true as const,
      parts: [{ type: "text" as const, text: "context", synthetic: true as const }],
    };

    await expect(runtime.getMessages("/project", "session")).rejects.toBeInstanceOf(
      OpenCodeTimeoutError
    );
    await expect(runtime.getAgents("/project")).rejects.toBeInstanceOf(OpenCodeTimeoutError);
    await expect(runtime.prompt("/project", "session", body)).rejects.toBeInstanceOf(
      OpenCodeTimeoutError
    );
    await expect(
      runtime.diagnose({ code: "prompt_failed", directory: "/project", sessionID: "session" })
    ).rejects.toBeInstanceOf(OpenCodeTimeoutError);

    for (const request of [
      fixture.messages.mock.calls[0]?.[0],
      fixture.agents.mock.calls[0]?.[0],
      fixture.prompt.mock.calls[0]?.[0],
      fixture.log.mock.calls[0]?.[0],
    ]) {
      expect((request as unknown as { signal: AbortSignal }).signal.aborted).toBeTrue();
    }
  });

  test("rejects ordinary SDK error responses", async () => {
    const error = { name: "NotFoundError", data: { message: "missing" } };
    const fixture = createClient({
      messages: { data: undefined, error },
      agents: { data: undefined, error },
      prompt: { data: undefined, error },
      log: { data: undefined, error },
    });
    const runtime = createOpenCodeRuntime(fixture.client);
    const body = {
      noReply: true as const,
      parts: [{ type: "text" as const, text: "context", synthetic: true as const }],
    };

    await expect(runtime.getMessages("/project", "session")).rejects.toEqual(error);
    await expect(runtime.getAgents("/project")).rejects.toEqual(error);
    await expect(runtime.prompt("/project", "session", body)).rejects.toEqual(error);
    await expect(
      runtime.diagnose({ code: "prompt_failed", directory: "/project", sessionID: "s" })
    ).rejects.toEqual(error);
  });

  test("propagates thrown SDK failures", async () => {
    const fixture = createClient();
    fixture.messages.mockRejectedValueOnce(new Error("transport failed"));

    await expect(
      createOpenCodeRuntime(fixture.client).getMessages("/project", "session")
    ).rejects.toThrow("transport failed");
  });

  test("rejects missing and malformed SDK response data", async () => {
    const missing = createOpenCodeRuntime(
      createClient({ prompt: { data: undefined }, log: { data: undefined } }).client
    );
    await expect(
      missing.prompt("/project", "session", {
        noReply: true,
        parts: [{ type: "text", text: "context", synthetic: true }],
      })
    ).rejects.toThrow("OpenCode returned no prompt result");
    await expect(
      missing.diagnose({ code: "prompt_failed", directory: "/project", sessionID: "s" })
    ).rejects.toThrow("OpenCode returned no log result");

    const malformedMessages = createOpenCodeRuntime(
      createClient({ messages: { data: [{ info: null, parts: [] }] } }).client
    );
    await expect(malformedMessages.getMessages("/project", "session")).rejects.toThrow(
      "OpenCode returned malformed session messages"
    );

    const malformedAgents = createOpenCodeRuntime(
      createClient({ agents: { data: [{ name: "build", mode: "unexpected" }] } }).client
    );
    await expect(malformedAgents.getAgents("/project")).rejects.toThrow(
      "OpenCode returned malformed agents"
    );
  });
});
