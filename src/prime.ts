import { kill as killProcess } from "node:process";

/** Default deadline for the child to exit and its output to be read. */
export const DEFAULT_PRIME_TIMEOUT_MS = 10_000;
/** Default time to wait for completion after interruption. */
export const DEFAULT_PRIME_DRAIN_TIMEOUT_MS = 1_000;

/** The invocation reached its execution deadline. */
export class PrimeTimeoutError extends Error {
  /**
   * @param timeoutMs Deadline in milliseconds.
   * @param command Command label used in the error message.
   */
  constructor(timeoutMs: number, command = "bd prime") {
    super(`${command} timed out after ${timeoutMs}ms`);
    this.name = "PrimeTimeoutError";
  }
}

/** The process exited unsuccessfully and both output streams were read. */
export class PrimeProcessError extends Error {
  /**
   * @param exitCode Status reported by the child.
   * @param stderr Captured standard error.
   * @param command Command label used in the error message.
   * @param stdout Captured standard output.
   */
  constructor(
    readonly exitCode: number,
    readonly stderr: string,
    command = "bd prime",
    readonly stdout = "",
  ) {
    super(`${command} exited with code ${exitCode}`);
    this.name = "PrimeProcessError";
  }
}

/** Spawned process whose exit and output the invocation owns. */
export interface PrimeProcess {
  pid: number;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill(signal?: NodeJS.Signals): void;
  /** Signal the process group when available; otherwise signal the child. */
  killTree?(signal?: NodeJS.Signals): void;
}

/** Per-invocation cancellation, deadlines, and optional execution seams. */
export interface PrimeExecutionOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  drainTimeoutMs?: number;
  /**
   * Synchronously start the process. The runner consumes its streams and handles interruption.
   * @param directory Child working directory.
   * @param args Arguments after the executable.
   * @param env Child environment overlay, passed only when supplied.
   */
  spawn?: (directory: string, args: readonly string[], env?: NodeJS.ProcessEnv) => PrimeProcess;
  env?: NodeJS.ProcessEnv;
  /**
   * Arm the execution deadline.
   * @param callback Interrupts the invocation when the deadline fires.
   * @param delayMs Deadline delay in milliseconds.
   * @returns A function the runner calls during race cleanup to cancel the timer.
   */
  scheduleTimeout?: (callback: () => void, delayMs: number) => () => void;
  /**
   * Arm the wait limit after a kill attempt.
   * @param callback Ends the drain wait when the deadline fires.
   * @param delayMs Drain limit in milliseconds.
   * @returns A function the runner calls when process completion eventually settles.
   */
  scheduleDrainTimeout?: (callback: () => void, delayMs: number) => () => void;
}

/**
 * Spawn a detached child with piped output and use a verified process group when available.
 * @param directory Child working directory.
 * @param args Arguments after the executable.
 * @param env Overrides merged into the inherited child environment.
 * @returns The child streams, exit promise, and signal operations.
 */
function spawnBd(directory: string, args: readonly string[], env?: NodeJS.ProcessEnv): PrimeProcess {
  const child = Bun.spawn(["bd", ...args], {
    cwd: directory,
    ...(env ? { env: { ...process.env, ...env } } : {}),
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    detached: true,
  });
  let processGroupID: number | undefined;
  if (process.platform !== "win32") {
    const group = Bun.spawnSync(["ps", "-o", "pgid=", "-p", String(child.pid)], {
      stdout: "pipe",
      stderr: "ignore",
      timeout: 100,
    });
    const parsed = Number.parseInt(new TextDecoder().decode(group.stdout).trim(), 10);
    if (group.exitCode === 0 && parsed === child.pid && parsed > 1) processGroupID = parsed;
  }

  return {
    pid: child.pid,
    stdout: child.stdout,
    stderr: child.stderr,
    exited: child.exited,
    kill: (signal) => child.kill(signal),
    killTree: (signal) => {
      if (processGroupID !== undefined) {
        killProcess(-processGroupID, signal);
      } else {
        child.kill(signal);
      }
    },
  };
}

/**
 * Arm a one-shot timer.
 * @param callback Work to perform when the timer fires.
 * @param delayMs Delay in milliseconds.
 * @returns A function that clears the timer.
 */
function scheduleTimeout(callback: () => void, delayMs: number): () => void {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
}

/**
 * Try tree SIGKILL, falling back to the child. Kill errors must not replace the interruption reason.
 * @param child Process owned by this invocation.
 */
function terminateProcessTree(child: PrimeProcess): void {
  try {
    (child.killTree ?? child.kill)("SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // The child may already have exited.
    }
  }
}

/**
 * Wait for completion or the drain deadline, which can expire before the streams close.
 * @param completion Process and output completion with any rejection already handled.
 * @param timeoutMs Maximum drain wait in milliseconds.
 * @param scheduler Arms the drain deadline and supplies its cancellation function.
 */
async function drainAfterKill(
  completion: Promise<unknown>,
  timeoutMs: number,
  scheduler: (callback: () => void, delayMs: number) => () => void,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const cancelTimeout = scheduler(resolve, timeoutMs);
    void completion.finally(() => {
      cancelTimeout();
      resolve();
    });
  });
}

/**
 * Own a single child and its output until completion or interruption, including a bounded drain.
 * @param directory Child working directory.
 * @param args Arguments after the executable.
 * @param options Cancellation, deadlines, and child execution settings.
 * @returns Stdout from a successful exit.
 */
async function runBdAttempt(
  directory: string,
  args: readonly string[],
  options: PrimeExecutionOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PRIME_TIMEOUT_MS;
  const drainTimeoutMs = options.drainTimeoutMs ?? DEFAULT_PRIME_DRAIN_TIMEOUT_MS;
  const command = ["bd", ...args].join(" ");
  options.signal?.throwIfAborted();
  const child = options.env
    ? (options.spawn ?? spawnBd)(directory, args, options.env)
    : (options.spawn ?? spawnBd)(directory, args);
  const stdout = new Response(child.stdout).text();
  const stderr = new Response(child.stderr).text();

  let interrupted = false;
  let rejectInterruption: (error: unknown) => void = () => {};
  const interruption = new Promise<never>((_resolve, reject) => {
    rejectInterruption = reject;
  });

  /**
   * Attempt termination synchronously, then reject the interruption promise.
   * @param getReason Supplies the rejection reason after the kill attempt.
   */
  function interrupt(getReason: () => unknown): void {
    interrupted = true;
    terminateProcessTree(child);
    rejectInterruption(getReason());
  }

  function onTimeout(): void {
    interrupt(() => new PrimeTimeoutError(timeoutMs, command));
  }

  function onAbort(): void {
    interrupt(() => options.signal?.reason ?? new DOMException("Aborted", "AbortError"));
  }

  const cancelTimeout = (options.scheduleTimeout ?? scheduleTimeout)(onTimeout, timeoutMs);
  options.signal?.addEventListener("abort", onAbort, { once: true });
  // Setup can abort the signal before the listener is installed.
  if (options.signal?.aborted) onAbort();

  /**
   * Return stdout or preserve both captured streams in a nonzero-exit error.
   * @param result Child exit code, stdout, and stderr in that order.
   */
  function readResult(result: [number, string, string]): string {
    const [exitCode, output, errorOutput] = result;
    if (exitCode !== 0) throw new PrimeProcessError(exitCode, errorOutput, command, output);
    return output;
  }

  const completion = Promise.all([child.exited, stdout, stderr]).then(readResult);

  try {
    return await Promise.race([completion, interruption]);
  } finally {
    // A late interruption during cleanup can still require a drain without changing the race result.
    cancelTimeout();
    options.signal?.removeEventListener("abort", onAbort);
    if (interrupted) {
      await drainAfterKill(
        completion.catch(() => undefined),
        drainTimeoutMs,
        options.scheduleDrainTimeout ?? scheduleTimeout,
      );
    }
  }
}

/**
 * Run one bounded `bd` invocation. A pre-aborted signal prevents spawn. After interruption,
 * wait for child completion or the drain deadline before returning the selected result.
 * @param directory Project directory used as the child working directory.
 * @param args Arguments after the executable.
 * @param options Cancellation, deadlines, and child execution settings.
 * @returns Captured stdout on success.
 * @throws {PrimeProcessError} The child exited unsuccessfully.
 * @throws {PrimeTimeoutError} The execution deadline won the race.
 * @throws The pre-abort reason, the reason from an abort that won the race, or a spawn or I/O failure.
 */
export async function runBd(
  directory: string,
  args: readonly string[],
  options: PrimeExecutionOptions = {},
): Promise<string> {
  return runBdAttempt(directory, args, options);
}

/**
 * Load Beads workflow context and persistent project memories with one bounded `bd prime`.
 * @param directory Project directory used as the child working directory.
 * @param options Execution settings and cancellation, forwarded to {@link runBd}.
 * @param flags Arguments appended after `prime`.
 * @returns The command's stdout with the same rejection behavior as {@link runBd}.
 */
export async function runBdPrime(
  directory: string,
  options: PrimeExecutionOptions = {},
  flags: readonly string[] = [],
): Promise<string> {
  return runBd(directory, ["prime", ...flags], options);
}
