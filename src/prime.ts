export const DEFAULT_PRIME_TIMEOUT_MS = 10_000;

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
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill(signal?: NodeJS.Signals): void;
}

export interface PrimeExecutionOptions {
  timeoutMs?: number;
  spawn?: (directory: string, args: readonly string[]) => PrimeProcess;
  scheduleTimeout?: (callback: () => void, delayMs: number) => () => void;
}

export interface PrimeResult {
  mode: "full-compatibility" | "memories-only";
  output: string;
}

function spawnPrime(directory: string, args: readonly string[]): PrimeProcess {
  return Bun.spawn(["bd", "prime", ...args], {
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

async function runPrimeAttempt(
  directory: string,
  args: readonly string[],
  options: PrimeExecutionOptions = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PRIME_TIMEOUT_MS;
  const process = (options.spawn ?? spawnPrime)(directory, args);
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
      await completion.catch(() => undefined);
    }
  }
}

function isUnsupportedMemoriesFlag(error: unknown): boolean {
  return (
    error instanceof PrimeProcessError &&
    /(?:unknown flag|flag provided but not defined).*--memories-only/i.test(error.stderr)
  );
}

/** Load persistent memories, falling back narrowly for older bd versions. */
export async function runBdPrime(
  directory: string,
  options: PrimeExecutionOptions = {}
): Promise<PrimeResult> {
  try {
    return {
      mode: "memories-only",
      output: await runPrimeAttempt(directory, ["--memories-only"], options),
    };
  } catch (error) {
    if (!isUnsupportedMemoriesFlag(error)) throw error;
    return {
      mode: "full-compatibility",
      output: await runPrimeAttempt(directory, [], options),
    };
  }
}
