export const DEFAULT_PRIME_TIMEOUT_MS = 10_000;

export class PrimeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`bd prime timed out after ${timeoutMs}ms`);
    this.name = "PrimeTimeoutError";
  }
}

export class PrimeProcessError extends Error {
  constructor(readonly exitCode: number) {
    super(`bd prime exited with code ${exitCode}`);
    this.name = "PrimeProcessError";
  }
}

export interface PrimeProcess {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill(signal?: NodeJS.Signals): void;
}

export interface PrimeExecutionOptions {
  timeoutMs?: number;
  spawn?: (directory: string) => PrimeProcess;
  scheduleTimeout?: (callback: () => void, delayMs: number) => () => void;
}

function spawnPrime(directory: string): PrimeProcess {
  return Bun.spawn(["bd", "prime"], {
    cwd: directory,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
}

function scheduleTimeout(callback: () => void, delayMs: number): () => void {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
}

/** Run bd prime with bounded execution and complete process cleanup. */
export async function runBdPrime(
  directory: string,
  options: PrimeExecutionOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PRIME_TIMEOUT_MS;
  const process = (options.spawn ?? spawnPrime)(directory);
  const stdout = new Response(process.stdout).text();
  const stderr = new Response(process.stderr).text();

  let timedOut = false;
  let rejectTimeout: (error: PrimeTimeoutError) => void = () => {};
  const timeout = new Promise<never>((_resolve, reject) => {
    rejectTimeout = reject;
  });
  const cancelTimeout = (options.scheduleTimeout ?? scheduleTimeout)(() => {
    timedOut = true;
    process.kill("SIGKILL");
    rejectTimeout(new PrimeTimeoutError(timeoutMs));
  }, timeoutMs);

  const completion = Promise.all([process.exited, stdout, stderr]).then(
    ([exitCode, output]) => {
      if (exitCode !== 0) throw new PrimeProcessError(exitCode);
      return output;
    }
  );

  try {
    return await Promise.race([completion, timeout]);
  } finally {
    cancelTimeout();
    if (timedOut) {
      await completion.catch(() => undefined);
    }
  }
}
