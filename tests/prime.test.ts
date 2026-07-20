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

    expect(result).toEqual({ mode: "memories-only", output: "prime output" });
    expect(spawn).toHaveBeenCalledWith("/project", ["--memories-only"]);
    expect(cancelled).toBeTrue();
  });

  test("reports non-zero process exits", async () => {
    await expect(
      runBdPrime("/project", { spawn: () => completedProcess(2) })
    ).rejects.toBeInstanceOf(PrimeProcessError);
  });

  test("falls back only when memories-only is unsupported", async () => {
    const spawn = mock((_directory: string, args: readonly string[]) =>
      args.length
        ? completedProcess(1, "", "unknown flag: --memories-only")
        : completedProcess(0, "full context")
    );

    await expect(runBdPrime("/project", { spawn })).resolves.toEqual({
      mode: "full-compatibility",
      output: "full context",
    });
    expect(spawn.mock.calls.map((call) => call[1])).toEqual([["--memories-only"], []]);

    const genericFailure = mock((_directory: string, _args: readonly string[]) =>
      completedProcess(1, "", "database unavailable")
    );
    await expect(runBdPrime("/project", { spawn: genericFailure })).rejects.toBeInstanceOf(
      PrimeProcessError
    );
    expect(genericFailure).toHaveBeenCalledTimes(1);
  });

  test("kills and awaits a process after timeout", async () => {
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
    const process: PrimeProcess = {
      stdout,
      stderr: stream(""),
      exited: exit,
      kill,
    };

    const result = runBdPrime("/project", {
      timeoutMs: 25,
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

    await Promise.resolve();
    expect(settled).toBeFalse();
    closeStdout();
    await expect(result).rejects.toBeInstanceOf(PrimeTimeoutError);
    expect(kill).toHaveBeenCalledWith("SIGKILL");
  });
});
