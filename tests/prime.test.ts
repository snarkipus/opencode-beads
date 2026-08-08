import { describe, expect, mock, test } from "bun:test";
import {
  PrimeProcessError,
  PrimeTimeoutError,
  runBdPrime,
  type PrimeProcess,
} from "../src/prime";

function stream(content: string): ReadableStream<Uint8Array> {
  return new Blob([content]).stream();
}

function completedProcess(exitCode: number, output = "context", error = "failure"): PrimeProcess {
  return {
    pid: 1,
    stdout: stream(output),
    stderr: stream(exitCode === 0 ? "" : error),
    exited: Promise.resolve(exitCode),
    kill: mock(() => {}),
  };
}

describe("runBdPrime", () => {
  test("returns stdout and cancels the timeout after success", async () => {
    let cancelled = false;
    const spawn = mock((_directory: string, _args: readonly string[]) =>
      completedProcess(0, "prime output")
    );

    const result = await runBdPrime("/project", {
      spawn,
      scheduleTimeout: () => () => {
        cancelled = true;
      },
    });

    expect(result).toBe("prime output");
    expect(spawn).toHaveBeenCalledWith("/project", []);
    expect(cancelled).toBeTrue();
  });

  test("reports non-zero process exits", async () => {
    await expect(
      runBdPrime("/project", { spawn: () => completedProcess(2) })
    ).rejects.toBeInstanceOf(PrimeProcessError);
  });

  test("does not hide full-prime failures behind another invocation", async () => {
    const genericFailure = mock((_directory: string, _args: readonly string[]) =>
      completedProcess(1, "", "database unavailable")
    );
    await expect(runBdPrime("/project", { spawn: genericFailure })).rejects.toBeInstanceOf(
      PrimeProcessError
    );
    expect(genericFailure).toHaveBeenCalledTimes(1);
    expect(genericFailure).toHaveBeenCalledWith("/project", []);
  });

  test("bounds stream draining after timeout", async () => {
    let triggerTimeout: () => void = () => {};
    let resolveExit: (exitCode: number) => void = () => {};
    let closeStdout: () => void = () => {};
    const exit = new Promise<number>((resolve) => {
      resolveExit = resolve;
    });
    const stdout = new ReadableStream<Uint8Array>({
      start(controller) {
        closeStdout = () => controller.close();
      },
    });
    const kill = mock((_signal?: NodeJS.Signals) => resolveExit(137));
    const killTree = mock((_signal?: NodeJS.Signals) => resolveExit(137));
    const process: PrimeProcess = {
      pid: 1,
      stdout,
      stderr: stream(""),
      exited: exit,
      kill,
      killTree,
    };

    const result = runBdPrime("/project", {
      timeoutMs: 25,
      drainTimeoutMs: 5,
      spawn: () => process,
      scheduleTimeout: (callback) => {
        triggerTimeout = callback;
        return () => {};
      },
    });
    let settled = false;
    void result.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );
    triggerTimeout();

    await expect(result).rejects.toBeInstanceOf(PrimeTimeoutError);
    expect(killTree).toHaveBeenCalledWith("SIGKILL");
    expect(kill).not.toHaveBeenCalled();
    expect(settled).toBeTrue();
    closeStdout();
  });
});
