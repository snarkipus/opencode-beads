import { PrimeProcessError } from "./prime";

/** Oldest Beads release this adapter supports. */
export const MINIMUM_BD_VERSION = "1.3.1";

export type Version = readonly [number, number, number];

/** CLI and config-only workspace compatibility; not a store health assessment. */
export type GuardResult =
  | { kind: "ready" }
  | { kind: "uninitialized" }
  | { kind: "unavailable" }
  | { kind: "probe-failed" }
  | { kind: "unsupported"; installed: string };

export interface GuardRuntime {
  /** Run `bd` with arguments in the project directory and return stdout. */
  bd(directory: string, args: readonly string[]): Promise<string>;
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

/** Check the CLI minimum and config-only workspace without opening the native store. */
export async function checkBeadsStore(
  directory: string,
  runtime: GuardRuntime
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
    // Never substitute `where` or silently treat an unsupported/failed workspace probe as absence.
    return { kind: "probe-failed" };
  }
  const beadsPath = location?.path;
  if (typeof beadsPath !== "string" || !beadsPath) return { kind: "uninitialized" };

  return { kind: "ready" };
}

/** Build config-only compatibility observation from a bounded `bd` runner. */
export function createGuardRuntime(bd: GuardRuntime["bd"]): GuardRuntime {
  return { bd };
}

/** Explain failed compatibility checks without suggesting a bypass or store repair. */
export function guardNotice(result: GuardResult): string | undefined {
  switch (result.kind) {
    case "probe-failed":
      return `<beads-notice>
Beads workflow context was not loaded: the config-only \`bd context --json\` workspace probe failed or returned an unsupported result. Workspace discovery is unconfirmed. Do not substitute \`bd where\` or manual prime; report the CLI contract failure to the user.
</beads-notice>`;
    case "unsupported":
      return `<beads-notice>
Beads workflow context was not loaded: the installed bd ${result.installed} is older than ${MINIMUM_BD_VERSION}, the minimum this OpenCode integration supports. Tell the user to upgrade bd before relying on Beads in this session.
</beads-notice>`;
    default:
      return undefined;
  }
}
