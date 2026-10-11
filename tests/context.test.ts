import { describe, expect, mock, test } from "bun:test";
import {
  createContextController,
  renderBeadsContext,
  type AgentMode,
  type ContextRuntime,
} from "../src/context";
import type { GuardResult } from "../src/guard";
import { PrimeTimeoutError } from "../src/prime";

function fixture(
  options: {
    guard?: GuardResult | (() => Promise<GuardResult>);
    prime?: () => Promise<string>;
    modes?: Record<string, AgentMode>;
  } = {}
) {
  let time = 0;
  const guard = mock(
    async (_directory: string): Promise<GuardResult> =>
      typeof options.guard === "function" ? options.guard() : (options.guard ?? { kind: "ready" })
  );
  const prime = mock(async (_directory: string) => (options.prime ? options.prime() : "PRIME"));
  const agentMode = mock(async (agentID: string) => options.modes?.[agentID]);
  const diagnose = mock((_code: string, _sessionID: string) => {});
  const runtime: ContextRuntime = { guard, prime, agentMode, diagnose };
  const controller = createContextController(runtime, "/project", {
    retryMs: 1_000,
    now: () => time,
  });
  return {
    controller,
    guard,
    prime,
    agentMode,
    diagnose,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("context controller", () => {
  test("renders prime for primary agents and caches it per session", async () => {
    const f = fixture({ modes: { build: "primary" } });
    const first = await f.controller.systemFor("s1", "build");
    expect(first).toBe(renderBeadsContext("PRIME", "primary"));
    expect(await f.controller.systemFor("s1", "build")).toBe(first);
    expect(f.prime).toHaveBeenCalledTimes(1);
    expect(f.prime).toHaveBeenCalledWith("/project");
    await f.controller.systemFor("s2", "build");
    expect(f.prime).toHaveBeenCalledTimes(2);
  });

  test("gives task agents the task-agent audience without an agent lookup", async () => {
    const f = fixture();
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBe(
      renderBeadsContext("PRIME", "task-agent")
    );
    expect(await f.controller.systemFor("s2", "beads-task-agent-luna")).toBe(
      renderBeadsContext("PRIME", "task-agent")
    );
    expect(f.agentMode).not.toHaveBeenCalled();
  });

  test("excludes regular subagents and fails open for unknown agents", async () => {
    const f = fixture({ modes: { explore: "subagent", custom: "all" } });
    expect(await f.controller.systemFor("s1", "explore")).toBeUndefined();
    expect(await f.controller.systemFor("s1", "custom")).toBe(renderBeadsContext("PRIME", "primary"));
    expect(await f.controller.systemFor("s2", "mystery")).toBe(renderBeadsContext("PRIME", "primary"));
  });

  test("fails open and diagnoses when the agent lookup throws, then retries the lookup", async () => {
    const f = fixture();
    f.agentMode.mockImplementationOnce(async () => {
      throw new Error("lookup failed");
    });
    expect(await f.controller.systemFor("s1", "build")).toBe(renderBeadsContext("PRIME", "primary"));
    expect(f.diagnose).toHaveBeenCalledWith("agent_lookup_failed", "s1");
    await f.controller.systemFor("s2", "build");
    expect(f.agentMode).toHaveBeenCalledTimes(2);
  });

  test("coalesces concurrent requests for the same session", async () => {
    let release: (value: string) => void = () => {};
    const f = fixture({ prime: () => new Promise<string>((resolve) => (release = resolve)) });
    const pending = [f.controller.systemFor("s1", "beads-task-agent"), f.controller.systemFor("s1", "beads-task-agent")];
    await Promise.resolve();
    await Promise.resolve();
    release("PRIME");
    const [a, b] = await Promise.all(pending);
    expect(a).toBe(b);
    expect(f.prime).toHaveBeenCalledTimes(1);
  });

  test("injects the guard notice instead of running prime, and rechecks after the retry window", async () => {
    let guard: GuardResult = { kind: "migration-pending", installed: "1.3.1", store: "1.2.2" };
    const f = fixture({ guard: async () => guard });
    const withheld = await f.controller.systemFor("s1", "beads-task-agent");
    expect(withheld).toContain("<beads-notice>");
    expect(f.prime).not.toHaveBeenCalled();

    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBe(withheld);
    expect(f.guard).toHaveBeenCalledTimes(1);

    guard = { kind: "ready" };
    f.advance(1_001);
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBe(
      renderBeadsContext("PRIME", "task-agent")
    );
    expect(f.prime).toHaveBeenCalledTimes(1);
  });

  test("adds nothing for uninitialized projects and retries later", async () => {
    const f = fixture({ guard: { kind: "uninitialized" } });
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBeUndefined();
    await f.controller.systemFor("s1", "beads-task-agent");
    expect(f.guard).toHaveBeenCalledTimes(1);
    f.advance(1_001);
    await f.controller.systemFor("s1", "beads-task-agent");
    expect(f.guard).toHaveBeenCalledTimes(2);
  });

  test("treats guard exceptions as retryable absence", async () => {
    const f = fixture({
      guard: async () => {
        throw new Error("boom");
      },
    });
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBeUndefined();
    expect(f.prime).not.toHaveBeenCalled();
  });

  test("diagnoses prime failures and timeouts, and retries empty or failed prime later", async () => {
    let outcome: () => Promise<string> = async () => {
      throw new PrimeTimeoutError(10);
    };
    const f = fixture({ prime: () => outcome() });
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBeUndefined();
    expect(f.diagnose).toHaveBeenCalledWith("prime_timeout", "s1");

    outcome = async () => {
      throw new Error("exit 1");
    };
    f.advance(1_001);
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBeUndefined();
    expect(f.diagnose).toHaveBeenCalledWith("prime_failed", "s1");

    outcome = async () => "  \n";
    f.advance(1_001);
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBeUndefined();

    outcome = async () => "PRIME";
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBeUndefined();
    f.advance(1_001);
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toBe(
      renderBeadsContext("PRIME", "task-agent")
    );
  });

  test("refreshes prime after invalidation and forgets deleted sessions", async () => {
    let output = "FIRST";
    const f = fixture({ prime: async () => output });
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toContain("FIRST");
    output = "SECOND";
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toContain("FIRST");
    f.controller.invalidate("s1");
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toContain("SECOND");
    f.controller.forget("s1");
    output = "THIRD";
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toContain("THIRD");
  });

  test("keeps sessions with similar IDs independent when invalidating", async () => {
    let output = "FIRST";
    const f = fixture({ prime: async () => output });
    await f.controller.systemFor("s1", "beads-task-agent");
    await f.controller.systemFor("s10", "beads-task-agent");
    output = "SECOND";
    f.controller.invalidate("s1");
    expect(await f.controller.systemFor("s10", "beads-task-agent")).toContain("FIRST");
    expect(await f.controller.systemFor("s1", "beads-task-agent")).toContain("SECOND");
  });
});
