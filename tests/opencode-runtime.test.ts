import { describe, expect, mock, test } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import type {
  AppAgentsData,
  AppLogData,
  SessionMessagesData,
  SessionPromptData,
} from "@opencode-ai/sdk";
import { BeadsPlugin, createOpenCodeRuntime } from "../src/plugin";

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
  test("uses the official chat.message input context", async () => {
    const fixture = createClient({
      messages: {
        data: [
          {
            info: { role: "user" },
            parts: [{ type: "text", text: "<beads-context>present</beads-context>" }],
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
            text: "<beads-context>canonical workflow</beads-context>",
            synthetic: true,
          },
        ],
      } as never
    );

    expect(fixture.agents).not.toHaveBeenCalled();
    expect(fixture.messages).not.toHaveBeenCalled();
    expect(fixture.prompt).not.toHaveBeenCalled();
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
    });
    expect(fixture.agents).toHaveBeenCalledWith({ query: { directory: "/project" } });
    expect(fixture.prompt).toHaveBeenCalledWith({
      path: { id: "session" },
      query: { directory: "/project" },
      body,
    });
    expect(fixture.log).toHaveBeenCalledWith({
      query: { directory: "/project" },
      body: {
        service: "opencode-beads",
        level: "warn",
        message: "prompt_failed",
        extra: { sessionID: "s" },
      },
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
    });
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
