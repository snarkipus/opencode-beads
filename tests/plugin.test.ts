import { describe, expect, mock, test } from "bun:test";
import {
  createBeadsController,
  resolveProjectDirectory,
  type AgentInfo,
  type MessageContext,
  type MutablePluginConfig,
  type PluginDiagnostic,
  type PluginRuntime,
  type PromptBody,
  type SessionMessage,
} from "../src/plugin-core";
import { PrimeTimeoutError } from "../src/prime";

function createRuntime(primeResults: Array<string | Error | Promise<string>> = ["context"]) {
  let messages: ReadonlyArray<SessionMessage> = [];
  let agents: ReadonlyArray<AgentInfo> = [
    { name: "build", mode: "primary" },
    { name: "explore", mode: "subagent" },
    { name: "beads-task-agent", mode: "subagent" },
  ];
  const promptCalls: Array<{ sessionID: string; body: PromptBody }> = [];
  const primeDirectories: string[] = [];
  const diagnosticCalls: PluginDiagnostic[] = [];
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
  const diagnose = mock(async (diagnostic: PluginDiagnostic) => {
    diagnosticCalls.push(diagnostic);
  });

  const runtime: PluginRuntime = {
    getMessages,
    getAgents,
    prompt,
    prime,
    diagnose,
  };

  return {
    runtime,
    getMessages,
    getAgents,
    prompt,
    promptCalls,
    primeDirectories,
    diagnosticCalls,
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
  test("resolves project scope without using the process directory", () => {
    expect(resolveProjectDirectory("/active/project", "/worktree")).toBe("/active/project");
    expect(resolveProjectDirectory("", "/fallback/worktree")).toBe("/fallback/worktree");
    expect(() => resolveProjectDirectory("", "")).toThrow(
      "OpenCode did not provide a project directory or worktree"
    );
  });

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
    expect(retryFixture.diagnosticCalls).toEqual([
      {
        code: "prime_failed",
        directory: "/workspace/project",
        sessionID: "retry",
      },
    ]);
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

  test("uses the latest agent transition when filtering compacted sessions", async () => {
    const fixture = createRuntime();
    fixture.setMessages([
      {
        info: {
          role: "user",
          agent: "build",
          model: { providerID: "provider", modelID: "model" },
        },
      },
      {
        info: {
          role: "user",
          agent: "explore",
          model: { providerID: "provider", modelID: "model" },
        },
      },
    ]);
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onCompacted("compacted-subagent");

    expect(fixture.primeDirectories).toHaveLength(0);
    expect(fixture.promptCalls).toHaveLength(0);
  });

  test("ignores newer user messages without model metadata", async () => {
    const fixture = createRuntime();
    fixture.setMessages([
      {
        info: {
          role: "user",
          agent: "build",
          model: { providerID: "eligible", modelID: "eligible-model" },
        },
      },
      { info: { role: "assistant" } },
      { info: { role: "user", agent: "explore" } },
    ]);
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onCompacted("missing-model");

    expect(fixture.promptCalls[0]?.body.model).toEqual({
      providerID: "eligible",
      modelID: "eligible-model",
    });
    expect(fixture.promptCalls[0]?.body.agent).toBe("build");
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
    expect(fixture.diagnosticCalls.map((diagnostic) => diagnostic.code)).toEqual([
      "agents_lookup_failed",
      "messages_lookup_failed",
    ]);
  });

  test("retries prompt failures and rate-limits structured diagnostics", async () => {
    let currentTime = 1_000;
    const fixture = createRuntime([
      new PrimeTimeoutError(10),
      new PrimeTimeoutError(10),
      new PrimeTimeoutError(10),
    ]);
    const controller = await createBeadsController(fixture.runtime, "/workspace/project", {
      diagnosticIntervalMs: 60_000,
      now: () => currentTime,
    });

    await controller.onMessage(message("timeout"));
    await controller.onMessage(message("timeout"));
    expect(fixture.diagnosticCalls).toEqual([
      {
        code: "prime_timeout",
        directory: "/workspace/project",
        sessionID: "timeout",
      },
    ]);

    currentTime += 60_000;
    await controller.onMessage(message("timeout"));
    expect(fixture.diagnosticCalls).toHaveLength(2);

    const promptFixture = createRuntime(["context", "context"]);
    promptFixture.prompt.mockRejectedValueOnce(new Error("SDK unavailable"));
    const promptController = await createBeadsController(
      promptFixture.runtime,
      "/workspace/project"
    );
    await promptController.onMessage(message("prompt-retry"));
    await promptController.onMessage(message("prompt-retry"));

    expect(promptFixture.primeDirectories).toHaveLength(2);
    expect(promptFixture.prompt).toHaveBeenCalledTimes(2);
    expect(promptFixture.promptCalls).toHaveLength(1);
    expect(promptFixture.diagnosticCalls[0]?.code).toBe("prompt_failed");
  });

  test("absorbs diagnostic failures while retaining retry behavior", async () => {
    const fixture = createRuntime([new Error("bd unavailable"), "context"]);
    fixture.runtime.diagnose = mock(async () => {
      throw new Error("logging unavailable");
    });
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");

    await controller.onMessage(message("diagnostic-failure"));
    await controller.onMessage(message("diagnostic-failure"));

    expect(fixture.primeDirectories).toHaveLength(2);
    expect(fixture.promptCalls).toHaveLength(1);
  });

  test("isolates concurrent sessions from different OpenCode projects", async () => {
    const first = createRuntime(["first project context"]);
    const second = createRuntime(["second project context"]);
    const [firstController, secondController] = await Promise.all([
      createBeadsController(first.runtime, "/projects/first"),
      createBeadsController(second.runtime, "/projects/second"),
    ]);

    await Promise.all([
      firstController.onMessage(message("first-session")),
      secondController.onMessage(message("second-session")),
    ]);

    expect(first.primeDirectories).toEqual(["/projects/first"]);
    expect(first.messageDirectories).toEqual(["/projects/first"]);
    expect(first.agentDirectories).toEqual(["/projects/first"]);
    expect(first.promptDirectories).toEqual(["/projects/first"]);
    expect(first.promptCalls[0]?.body.parts[0]?.text).toContain("first project context");
    expect(first.promptCalls[0]?.body.parts[0]?.text).not.toContain("second project context");

    expect(second.primeDirectories).toEqual(["/projects/second"]);
    expect(second.messageDirectories).toEqual(["/projects/second"]);
    expect(second.agentDirectories).toEqual(["/projects/second"]);
    expect(second.promptDirectories).toEqual(["/projects/second"]);
    expect(second.promptCalls[0]?.body.parts[0]?.text).toContain("second project context");
    expect(second.promptCalls[0]?.body.parts[0]?.text).not.toContain("first project context");
  });

  test("preserves explicit command and agent definitions and diagnoses collisions", async () => {
    const fixture = createRuntime();
    const controller = await createBeadsController(fixture.runtime, "/workspace/project", {
      diagnosticIntervalMs: 60_000,
      now: () => 1_000,
    });
    const config: MutablePluginConfig = {
      command: { "beads:ready": { description: "local", template: "local" } },
      agent: { "beads-task-agent": { description: "local", mode: "subagent" } },
    };

    await controller.configure(config);
    await controller.configure(config);

    expect(config.command?.["beads:ready"]?.template).toBe("local");
    expect(config.command?.["beads:show"]).toBeDefined();
    expect(config.agent?.["beads-task-agent"]?.description).toBe("local");
    expect(fixture.diagnosticCalls).toEqual([
      {
        code: "config_collision",
        directory: "/workspace/project",
        surface: "command",
        names: ["beads:ready"],
      },
      {
        code: "config_collision",
        directory: "/workspace/project",
        surface: "agent",
        names: ["beads-task-agent"],
      },
    ]);
  });

  test("does not diagnose non-conflicting configuration", async () => {
    const fixture = createRuntime();
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");
    const config: MutablePluginConfig = {
      command: { local: { description: "local", template: "local" } },
      agent: { local: { description: "local", mode: "subagent" } },
    };

    await controller.configure(config);

    expect(config.command?.local?.template).toBe("local");
    expect(config.command?.["beads:ready"]).toBeDefined();
    expect(config.agent?.local?.description).toBe("local");
    expect(config.agent?.["beads-task-agent"]).toBeDefined();
    expect(fixture.diagnosticCalls).toEqual([]);
  });

  test("keeps config collisions non-fatal when diagnostics fail", async () => {
    const fixture = createRuntime();
    fixture.runtime.diagnose = mock(async () => {
      throw new Error("logging unavailable");
    });
    const controller = await createBeadsController(fixture.runtime, "/workspace/project");
    const config: MutablePluginConfig = {
      command: { "beads:ready": { description: "local", template: "local" } },
    };

    await expect(controller.configure(config)).resolves.toBeUndefined();
    expect(config.command?.["beads:ready"]?.template).toBe("local");
  });
});
