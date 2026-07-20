import { describe, expect, mock, test } from "bun:test";
import {
  createBeadsController,
  type AgentInfo,
  type MessageContext,
  type MutablePluginConfig,
  type PluginRuntime,
  type PromptBody,
  type SessionMessage,
} from "../src/plugin-core";

function createRuntime(primeResults: Array<string | Error | Promise<string>> = ["context"]) {
  let messages: ReadonlyArray<SessionMessage> = [];
  let agents: ReadonlyArray<AgentInfo> = [
    { name: "build", mode: "primary" },
    { name: "explore", mode: "subagent" },
    { name: "beads-task-agent", mode: "subagent" },
  ];
  const promptCalls: Array<{ sessionID: string; body: PromptBody }> = [];
  const primeDirectories: string[] = [];
  const messageDirectories: string[] = [];
  const agentDirectories: string[] = [];
  const promptDirectories: string[] = [];
  const getMessages = mock(
    async (directory: string, _sessionID: string, _limit?: number) => {
      messageDirectories.push(directory);
      return messages;
    }
  );
  const getAgents = mock(async (directory: string) => {
    agentDirectories.push(directory);
    return agents;
  });
  const prompt = mock(async (directory: string, sessionID: string, body: PromptBody) => {
    promptDirectories.push(directory);
    promptCalls.push({ sessionID, body });
  });
  const prime = mock(async (directory: string) => {
    primeDirectories.push(directory);
    const result = primeResults.shift() ?? "context";
    if (result instanceof Error) throw result;
    return await result;
  });

  const runtime: PluginRuntime = {
    getMessages,
    getAgents,
    prompt,
    prime,
  };

  return {
    runtime,
    getMessages,
    getAgents,
    promptCalls,
    primeDirectories,
    messageDirectories,
    agentDirectories,
    promptDirectories,
    setMessages(value: ReadonlyArray<SessionMessage>) {
      messages = value;
    },
    setAgents(value: ReadonlyArray<AgentInfo>) {
      agents = value;
    },
  };
}

function message(sessionID: string, agent = "build"): MessageContext {
  return {
    sessionID,
    agent,
    model: { providerID: "provider", modelID: "model" },
  };
}

describe("Beads plugin controller", () => {
  test("runs bd prime in the project directory and preserves message context", async () => {
    const fixture = createRuntime([" prime context \n"]);
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onMessage(message("session"));

    expect(fixture.primeDirectories).toEqual(["/workspace/project"]);
    expect(fixture.messageDirectories).toEqual(["/workspace/project"]);
    expect(fixture.agentDirectories).toEqual(["/workspace/project"]);
    expect(fixture.promptDirectories).toEqual(["/workspace/project"]);
    expect(fixture.promptCalls).toHaveLength(1);
    const request = fixture.promptCalls[0];
    expect(request?.body.model).toEqual({ providerID: "provider", modelID: "model" });
    expect(request?.body.agent).toBe("build");
    expect(request?.body.parts[0]?.text).toContain(
      "<beads-context>\nprime context\n</beads-context>"
    );
  });

  test("coalesces concurrent injection and retries after failure", async () => {
    let resolvePrime: (value: string) => void = () => {};
    const pendingPrime = new Promise<string>((resolve) => {
      resolvePrime = resolve;
    });
    const fixture = createRuntime([pendingPrime]);
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    const first = controller.onMessage(message("same"));
    const second = controller.onMessage(message("same"));
    resolvePrime("context");
    await Promise.all([first, second]);

    expect(fixture.primeDirectories).toHaveLength(1);
    expect(fixture.promptCalls).toHaveLength(1);

    const retryFixture = createRuntime([new Error("bd unavailable"), "context"]);
    const retryController = await createBeadsController(
      retryFixture.runtime,
      "/workspace/project"
    );
    await retryController.onMessage(message("retry"));
    await retryController.onMessage(message("retry"));

    expect(retryFixture.primeDirectories).toHaveLength(2);
    expect(retryFixture.promptCalls).toHaveLength(1);
  });

  test("filters regular subagents but injects the beads task agent", async () => {
    const fixture = createRuntime();
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onMessage(message("explore", "explore"));
    await controller.onMessage(message("beads", "beads-task-agent"));

    expect(fixture.primeDirectories).toHaveLength(1);
    expect(fixture.promptCalls).toHaveLength(1);
  });

  test("uses the latest user context when reinjecting after compaction", async () => {
    const fixture = createRuntime();
    fixture.setMessages([
      {
        info: {
          role: "user",
          agent: "build",
          model: { providerID: "old", modelID: "old-model" },
        },
      },
      { info: { role: "assistant" } },
      {
        info: {
          role: "user",
          agent: "build",
          model: { providerID: "new", modelID: "new-model" },
        },
      },
    ]);
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onCompacted("compacted");

    expect(fixture.getMessages).toHaveBeenCalledWith(
      "/workspace/project",
      "compacted",
      50
    );
    expect(fixture.promptCalls[0]?.body.model).toEqual({
      providerID: "new",
      modelID: "new-model",
    });
  });

  test("does not duplicate context already present in a session", async () => {
    const fixture = createRuntime();
    fixture.setMessages([
      {
        info: { role: "user" },
        parts: [{ type: "text", text: "<beads-context>already injected</beads-context>" }],
      },
    ]);
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onMessage(message("existing"));

    expect(fixture.primeDirectories).toHaveLength(0);
    expect(fixture.promptCalls).toHaveLength(0);
  });

  test("falls back to injection when SDK discovery calls fail", async () => {
    const fixture = createRuntime();
    fixture.getMessages.mockRejectedValueOnce(new Error("messages unavailable"));
    fixture.getAgents.mockRejectedValueOnce(new Error("agents unavailable"));
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onMessage(message("fallback", "custom-agent"));

    expect(fixture.primeDirectories).toHaveLength(1);
    expect(fixture.promptCalls).toHaveLength(1);
  });

  test("merges commands and agents with plugin definitions taking precedence", async () => {
    const fixture = createRuntime();
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");
    const config: MutablePluginConfig = {
      command: { "beads:ready": { description: "local", template: "local" } },
      agent: { "beads-task-agent": { description: "local", mode: "subagent" } },
    };

    controller.configure(config);

    expect(config.command?.["beads:ready"]?.template).not.toBe("local");
    expect(config.agent?.["beads-task-agent"]?.description).not.toBe("local");
  });
});
