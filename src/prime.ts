import { kill as killProcess } from "node:process";

export const DEFAULT_PRIME_TIMEOUT_MS = 10_000;
export const DEFAULT_PRIME_DRAIN_TIMEOUT_MS = 1_000;

export class PrimeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`bd prime timed out after ${timeoutMs}ms`);
    this.name = "PrimeTimeoutError";
  }
}

export class PrimeProcessError extends Error {
  constructor(readonly exitCode: number, readonly stderr: string) {
    super(`bd prime exited with code ${exitCode}`);
    this.name = "PrimeProcessError";
  }
}

export interface PrimeProcess {
  pid: number;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill(signal?: NodeJS.Signals): void;
  killTree?(signal?: NodeJS.Signals): void;
}

export interface PrimeExecutionOptions {
  timeoutMs?: number;
  drainTimeoutMs?: number;
  spawn?: (directory: string, args: readonly string[]) => PrimeProcess;
  scheduleTimeout?: (callback: () => void, delayMs: number) => () => void;
  scheduleDrainTimeout?: (callback: () => void, delayMs: number) => () => void;
}

function spawnPrime(directory: string, args: readonly string[]): PrimeProcess {
  const child = Bun.spawn(["bd", "prime", ...args], {
    cwd: directory,
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

function scheduleTimeout(callback: () => void, delayMs: number): () => void {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
}

function terminateProcessTree(child: PrimeProcess): void {
  try {
    (child.killTree ?? child.kill)("SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // Timeout remains authoritative if the process exited concurrently.
    }
  }
}

async function drainAfterKill(
  completion: Promise<unknown>,
  timeoutMs: number,
  scheduler: (callback: () => void, delayMs: number) => () => void
): Promise<void> {
  await new Promise<void>((resolve) => {
    const cancelTimeout = scheduler(resolve, timeoutMs);
    void completion.finally(() => {
      cancelTimeout();
      resolve();
    });
  });
}

async function runPrimeAttempt(
  directory: string,
  args: readonly string[],
  options: PrimeExecutionOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PRIME_TIMEOUT_MS;
  const drainTimeoutMs = options.drainTimeoutMs ?? DEFAULT_PRIME_DRAIN_TIMEOUT_MS;
  const child = (options.spawn ?? spawnPrime)(directory, args);
  const stdout = new Response(child.stdout).text();
  const stderr = new Response(child.stderr).text();

  let timedOut = false;
  let rejectTimeout: (error: PrimeTimeoutError) => void = () => {};
  const timeout = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject;
  });
  const cancelTimeout = (options.scheduleTimeout ?? scheduleTimeout)(() => {
    timedOut = true;
    terminateProcessTree(child);
    rejectTimeout(new PrimeTimeoutError(timeoutMs));
  }, timeoutMs);

  const completion = Promise.all([child.exited, stdout, stderr]).then(
    ([exitCode, output, errorOutput]) => {
      if (exitCode !== 0) throw new PrimeProcessError(exitCode, errorOutput);
      return output;
    }
  );

  try {
    return await Promise.race([completion, timeout]);
  } finally {
    cancelTimeout();
    if (timedOut) {
      await drainAfterKill(
        completion.catch(() => undefined),
        drainTimeoutMs,
        options.scheduleDrainTimeout ?? scheduleTimeout
      );
    }
  }
}

/** Load the canonical Beads workflow and persistent project memories. */
export async function runBdPrime(
  directory: string,
  options: PrimeExecutionOptions = {}
): Promise<string> {
  return runPrimeAttempt(directory, [], options);
}
