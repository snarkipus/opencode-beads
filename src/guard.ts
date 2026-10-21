import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrimeProcessError } from "./prime";

/** Oldest Beads release this adapter supports. */
export const MINIMUM_BD_VERSION = "1.3.1";

export type Version = readonly [number, number, number];

/** Outcome of checking whether automatic `bd prime` may open the project store. */
export type GuardResult =
  | { kind: "ready" }
  | { kind: "uninitialized" }
  | { kind: "unavailable" }
  | { kind: "probe-failed" }
  | { kind: "unsupported"; installed: string }
  | { kind: "migration-pending"; installed: string; store: string | undefined };

export interface GuardRuntime {
  /** Run `bd` with arguments in the project directory and return stdout. */
  bd(directory: string, args: readonly string[]): Promise<string>;
  /** Read a UTF-8 file, resolving undefined when it does not exist. */
  readText(path: string): Promise<string | undefined>;
}

export interface GuardOptions {
  /** Let automatic prime apply pending schema migrations instead of withholding context. */
  autoMigrate?: boolean;
}

export interface BeadsWorkspace {
  path: string;
}

/** Config-only context avoids `where`'s opportunistic embedded-store prefix lookup. */
export async function probeBeadsWorkspace(directory: string, runtime: GuardRuntime): Promise<BeadsWorkspace | undefined> {
  let output: string;
  try {
    output = await runtime.bd(directory, ["context", "--json"]);
  } catch (error) {
    if (!(error instanceof PrimeProcessError) || error.exitCode !== 1) throw error;
    // bd 1.3.1 reports absence through this versioned error rather than a successful context.
    const response: unknown = JSON.parse(error.stdout);
    if (typeof response === "object" && response !== null && !Array.isArray(response)) {
      const data = response as Record<string, unknown>;
      if (data.schema_version === 1 && data.error === "cannot resolve repo context: no .beads directory found") {
        return undefined;
      }
    }
    throw error;
  }
  const location: unknown = JSON.parse(output);
  if (typeof location !== "object" || location === null) throw new Error("Invalid bd context response");
  const data = location as Record<string, unknown>;
  if (typeof data.beads_dir !== "string") throw new Error("Unsupported bd context response");
  if (!data.beads_dir) return undefined;
  return { path: data.beads_dir };
}

/** Parse the leading `major.minor.patch` triple; pre-release suffixes are ignored. */
export function parseVersion(text: string): Version | undefined {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Compare two parsed versions; negative when `left` is older. */
export function compareVersions(left: Version, right: Version): number {
  for (let index = 0; index < 3; index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function formatVersion(version: Version): string {
  return version.join(".");
}

async function readTextIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/**
 * Decide whether automatic `bd prime` is safe without opening the store.
 *
 * Beads 1.3+ migrates an embedded store in place, irreversibly, on the first command that opens
 * it, and `--readonly` does not prevent that. `bd version` and `bd context --json` skip store
 * initialization; `where` can open storage to recover a missing prefix and is not used here.
 * `.beads/.local_version` records the newest binary that opened the store through an
 * ordinary command (but not `bd prime`), so an older or missing value means a migration may be
 * pending. `bd migrate schema` is idempotent and updates it, clearing a stale marker.
 */
export async function checkBeadsStore(
  directory: string,
  runtime: GuardRuntime,
  options: GuardOptions = {}
): Promise<GuardResult> {
  let installedOutput: string;
  try {
    installedOutput = await runtime.bd(directory, ["version"]);
  } catch {
    return { kind: "unavailable" };
  }
  const installed = parseVersion(installedOutput);
  if (!installed) return { kind: "unavailable" };
  const minimum = parseVersion(MINIMUM_BD_VERSION) as Version;
  if (compareVersions(installed, minimum) < 0) {
    return { kind: "unsupported", installed: formatVersion(installed) };
  }

  let location: BeadsWorkspace | undefined;
  try {
    location = await probeBeadsWorkspace(directory, runtime);
  } catch {
    // Never substitute `where` or silently treat an unsupported/failed safety probe as absence.
    return { kind: "probe-failed" };
  }
  const beadsPath = location?.path;
  if (typeof beadsPath !== "string" || !beadsPath) return { kind: "uninitialized" };

  if (options.autoMigrate) return { kind: "ready" };

  let marker: string | undefined;
  try {
    marker = await runtime.readText(join(beadsPath, ".local_version"));
  } catch {
    marker = undefined;
  }
  const store = marker === undefined ? undefined : parseVersion(marker);
  if (!store || compareVersions(store, installed) < 0) {
    return {
      kind: "migration-pending",
      installed: formatVersion(installed),
      store: store ? formatVersion(store) : undefined,
    };
  }
  return { kind: "ready" };
}

/** Build the guard runtime from a bounded `bd` runner and the local filesystem. */
export function createGuardRuntime(bd: GuardRuntime["bd"]): GuardRuntime {
  return { bd, readText: readTextIfPresent };
}

/** Explain withheld context to the agent so it neither migrates the store nor guesses. */
export function guardNotice(result: GuardResult): string | undefined {
  switch (result.kind) {
    case "probe-failed":
      return `<beads-notice>
Beads workflow context was withheld: the config-only \`bd context --json\` safety probe failed or returned an unsupported result. Store authority is unknown. Do not substitute \`bd where\` or manual prime; report the CLI contract failure to the user.
</beads-notice>`;
    case "unsupported":
      return `<beads-notice>
Beads workflow context was not loaded: the installed bd ${result.installed} is older than ${MINIMUM_BD_VERSION}, the minimum this OpenCode integration supports. Tell the user to upgrade bd before relying on Beads in this session.
</beads-notice>`;
    case "migration-pending": {
      const store = result.store ? `bd ${result.store}` : "an unknown bd version";
      return `<beads-notice>
Beads workflow context was withheld: this project's Beads store was last opened by ${store}, and the installed bd ${result.installed} may apply irreversible schema migrations on first use. Do not run bd commands in this session. Tell the user to back up the .beads directory and then run \`bd migrate schema\`, or to set the opencode-beads plugin option "autoMigrate": true to allow automatic migration.
</beads-notice>`;
    }
    default:
      return undefined;
  }
}
