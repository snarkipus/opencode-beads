#!/usr/bin/env bun

import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInitCommand, type InitCommand, type InitScope } from "./init";

const USAGE = "Usage: opencode-beads <init|check|update|remove> [--global] [--dry-run] [--json]";
const VALID_COMMANDS: InitCommand[] = ["init", "check", "update", "remove"];
const VALID_FLAGS = new Set(["--global", "--dry-run", "--json"]);

interface CliOptions {
  command: InitCommand;
  scope: InitScope;
  dryRun: boolean;
  json: boolean;
}

type CliErrorCode =
  | "GIT_DISCOVERY_FAILED"
  | "OPERATION_FAILED"
  | "PACKAGED_ARTIFACT_INVALID"
  | "USAGE";

class CliFailure extends Error {
  constructor(readonly code: CliErrorCode, message: string, readonly humanMessage = message) {
    super(message);
  }
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function parseArgs(args: string[]): CliOptions {
  const commands = args.filter((arg) => !arg.startsWith("--"));
  const flags = args.filter((arg) => arg.startsWith("--"));
  const command = commands[0];
  if (
    commands.length !== 1 ||
    !VALID_COMMANDS.includes(command as InitCommand) ||
    flags.some((flag) => !VALID_FLAGS.has(flag)) ||
    new Set(flags).size !== flags.length
  ) {
    throw new Error(USAGE);
  }
  return {
    command: command as InitCommand,
    scope: flags.includes("--global") ? "global" : "project",
    dryRun: flags.includes("--dry-run"),
    json: flags.includes("--json"),
  };
}

async function discoverWorktree(cwd: string): Promise<string> {
  try {
    const process = Bun.spawn(["git", "rev-parse", "--show-toplevel"], {
      cwd,
      stdout: "pipe",
      stderr: "ignore",
    });
    const output = await new Response(process.stdout).text();
    if ((await process.exited) !== 0 || !output.trim()) throw new Error("git failed");
    return resolve(output.trim());
  } catch {
    throw new CliFailure("GIT_DISCOVERY_FAILED", "Unable to discover git worktree from cwd");
  }
}

/** Run the companion lifecycle CLI and return its process exit code. */
export async function runCli(
  args = process.argv.slice(2),
  environment: {
    cwd?: string;
    home?: string;
    packageRoot?: string;
    xdgConfigHome?: string;
  } = {}
): Promise<number> {
  const jsonRequested = args.includes("--json");
  let options: CliOptions;
  try {
    options = parseArgs(args);
  } catch (error) {
    if (jsonRequested) writeJson({ ok: false, code: "USAGE", message: USAGE });
    else console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  try {
    const packageRoot = environment.packageRoot ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
    let packageJson: { version?: unknown };
    try {
      packageJson = (await Bun.file(resolve(packageRoot, "package.json")).json()) as { version?: unknown };
      if (typeof packageJson.version !== "string") throw new Error("Package version is missing");
    } catch (error) {
      throw new CliFailure(
        "PACKAGED_ARTIFACT_INVALID",
        "Packaged artifacts failed validation",
        error instanceof Error ? error.message : String(error)
      );
    }
    const cwd = resolve(environment.cwd ?? process.cwd());
    const home = resolve(environment.home ?? homedir());
    const xdgConfigHome = environment.xdgConfigHome ?? process.env.XDG_CONFIG_HOME;
    const opencodeConfigDirectory =
      xdgConfigHome && isAbsolute(xdgConfigHome)
        ? resolve(xdgConfigHome, "opencode")
        : join(home, ".config", "opencode");
    let result;
    try {
      result = await runInitCommand(options.command, {
        cwd,
        worktree: await discoverWorktree(cwd),
        home,
        opencodeConfigDirectory,
        packageRoot,
        packageVersion: packageJson.version,
        scope: options.scope,
        dryRun: options.dryRun,
      });
    } catch (error) {
      if (error instanceof CliFailure) throw error;
      const humanMessage = error instanceof Error ? error.message : String(error);
      const packaged = humanMessage.startsWith("Invalid packaged artifact");
      throw new CliFailure(
        packaged ? "PACKAGED_ARTIFACT_INVALID" : "OPERATION_FAILED",
        packaged ? "Packaged artifacts failed validation" : "Lifecycle operation failed",
        humanMessage
      );
    }
    let exitCode: number;
    let code: "CHECK_NOT_CURRENT" | "LIFECYCLE_REFUSED" | "OK";
    let message: string;
    if (!result.ok) {
      exitCode = 2;
      code = "LIFECYCLE_REFUSED";
      message = result.error ?? "Lifecycle command refused";
    } else if (options.command === "check" && result.state !== "current") {
      exitCode = 1;
      code = "CHECK_NOT_CURRENT";
      message = "Managed skill is not current";
    } else {
      exitCode = 0;
      code = "OK";
      message = "Lifecycle command completed";
    }
    if (options.json) {
      writeJson({ ...result, code, message });
    } else if (result.ok) {
      const verb = result.changed ? (result.dryRun ? "Would change" : "Changed") : "No change";
      console.log(`${verb}: ${result.target} (${result.state})`);
    } else {
      console.error(`${result.error}: ${result.target}`);
    }
    return exitCode;
  } catch (error) {
    const failure =
      error instanceof CliFailure
        ? error
        : new CliFailure(
            "OPERATION_FAILED",
            "Lifecycle operation failed",
            error instanceof Error ? error.message : String(error)
          );
    if (options.json) writeJson({ ok: false, code: failure.code, message: failure.message });
    else console.error(failure.humanMessage);
    return 2;
  }
}

if (import.meta.main) process.exitCode = await runCli();
