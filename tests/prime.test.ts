import { describe, expect, mock, test } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DIAGNOSTIC_ENV } from "../src/diagnostics";
import {
  PrimeProcessError,
  PrimeTimeoutError,
  runBdPrime,
  runBd,
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
  test("refuses a cancelled invocation before spawn", async () => {
    const abort = new AbortController();
    abort.abort();
    const spawn = mock(() => completedProcess(0));
    await expect(runBd("/project", ["show", "task-1"], { signal: abort.signal, spawn })).rejects.toHaveProperty("name", "AbortError");
    expect(spawn).not.toHaveBeenCalled();
  });

  test("aborts the process tree and bounds draining without retrying an interrupted write", async () => {
    const abort = new AbortController();
    const killTree = mock(() => {});
    const spawn = mock(() => ({
      ...completedProcess(0),
      stdout: new ReadableStream<Uint8Array>(),
      exited: new Promise<number>(() => {}),
      killTree,
    }));
    const pending = runBd("/project", ["update", "task-1", "--append-notes", "one\ntwo"], {
      signal: abort.signal, spawn, drainTimeoutMs: 1,
    });
    abort.abort();
    await expect(pending).rejects.toHaveProperty("name", "AbortError");
    expect(killTree).toHaveBeenCalledWith("SIGKILL");
    expect(spawn).toHaveBeenCalledTimes(1);
  });
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
    expect(spawn).toHaveBeenCalledWith("/project", ["prime"]);
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
    expect(genericFailure).toHaveBeenCalledWith("/project", ["prime"]);
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


test.skipIf(process.platform === "win32")("diagnostic overlay reaches a POSIX child while ordinary execution inherits its parent", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "bd-env-"));
  const binary = path.join(directory, "bd");
  await writeFile(binary, '#!/bin/sh\nprintf "%s|%s|%s|%s" "$BD_DISABLE_METRICS" "$BD_DISABLE_EVENT_FLUSH" "$OTEL_SDK_DISABLED" "$DIAGNOSTIC_TEST_SENTINEL"\n');
  await chmod(binary, 0o755);
  const code = `import { runBd } from ${JSON.stringify(new URL("../src/prime.ts", import.meta.url).href)};
const overlay = ${JSON.stringify(DIAGNOSTIC_ENV)};
console.log(await runBd(${JSON.stringify(directory)}, ["version"], { env: overlay }));
console.log(await runBd(${JSON.stringify(directory)}, ["prime"]));`;
  try {
    const child = Bun.spawn([process.execPath, "-e", code], { cwd: directory, stdout: "pipe", stderr: "pipe", env: { PATH: `${directory}:/usr/bin:/bin`, HOME: directory, XDG_CONFIG_HOME: directory, XDG_CACHE_HOME: directory, TMPDIR: directory, BD_DISABLE_METRICS: "true", BD_DISABLE_EVENT_FLUSH: "true", OTEL_SDK_DISABLED: "TRUE", DIAGNOSTIC_TEST_SENTINEL: "preserved" } });
    const output = await new Response(child.stdout).text();
    const errors = await new Response(child.stderr).text();
    expect({ exit: await child.exited, output, errors }).toEqual({ exit: 0, output: "1|1|true|preserved\ntrue|true|TRUE|preserved\n", errors: "" });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("passes a diagnostic environment overlay through the injected spawn seam", async () => {
  const spawn = mock((_directory: string, _args: readonly string[], _env?: NodeJS.ProcessEnv) => completedProcess(0));
  await runBd("/project", ["version"], { spawn, env: DIAGNOSTIC_ENV });
  expect(spawn).toHaveBeenCalledWith("/project", ["version"], DIAGNOSTIC_ENV);
  await runBdPrime("/project", { spawn });
  expect(spawn).toHaveBeenLastCalledWith("/project", ["prime"]);
});
