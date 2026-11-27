import { open } from "node:fs/promises";
import path from "node:path";
import { countManagedBlocks } from "./instructions";
import type { BeadsWorkspace, GuardResult, GuardRuntime } from "./guard";
import { PrimeProcessError, PrimeTimeoutError } from "./prime";

/** Scoped only to diagnostic subprocesses; ordinary Beads operations retain their environment. */
export const DIAGNOSTIC_ENV = {
  BD_DISABLE_METRICS: "1",
  BD_DISABLE_EVENT_FLUSH: "1",
  OTEL_SDK_DISABLED: "true",
};

type NativeHook = { Name: string; Installed: boolean; Version: string; IsShim: boolean; Outdated: boolean };
export type HookObservation = { name: string; installed: boolean; version: string; shim: boolean; outdated: boolean };

/**
 * Read native hook status without substituting a store-opening probe.
 *
 * @param directory - Confirmed directory for the native listing.
 * @param bd - Native command runner scoped to diagnostics.
 */
export async function collectHooks(
  directory: string,
  bd: GuardRuntime["bd"],
): Promise<HookObservation[] | "failed: bd hooks list observation unavailable or unsupported"> {
  try {
    const result: unknown = JSON.parse(await bd(directory, ["hooks", "list", "--json"]));
    if (typeof result !== "object" || result === null || !("hooks" in result) || !Array.isArray(result.hooks))
      throw new Error("unsupported hooks response");
    const hooks: unknown[] = result.hooks;
    if (hooks.length > 32) throw new Error("unsupported hooks response");
    const valid = hooks.every((hook): hook is NativeHook => {
      if (typeof hook !== "object" || hook === null) return false;
      return (
        "Name" in hook &&
        typeof hook.Name === "string" &&
        hook.Name.length <= 128 &&
        "Version" in hook &&
        typeof hook.Version === "string" &&
        hook.Version.length <= 128 &&
        "Installed" in hook &&
        typeof hook.Installed === "boolean" &&
        "IsShim" in hook &&
        typeof hook.IsShim === "boolean" &&
        "Outdated" in hook &&
        typeof hook.Outdated === "boolean"
      );
    });
    if (!valid) throw new Error("unsupported hooks response");
    return hooks.map((hook) => ({
      name: hook.Name,
      installed: hook.Installed,
      version: hook.Version,
      shim: hook.IsShim,
      outdated: hook.Outdated,
    }));
  } catch {
    return "failed: bd hooks list observation unavailable or unsupported";
  }
}

export type SyncTargetObservation =
  | { state: "resolved"; name: "origin" }
  | { state: "local-only" }
  | { state: "unknown"; reason: string; listingSkipped?: true };

/**
 * Classify native remote registration without fetching or checking reachability or history.
 *
 * @param directory - Confirmed directory for the native listing.
 * @param workspace - Native workspace evidence used to decide whether a strict-readonly listing is supported.
 * @param bd - Native command runner scoped to diagnostics.
 */
export async function collectSyncTarget(
  directory: string,
  workspace: BeadsWorkspace,
  bd: GuardRuntime["bd"],
): Promise<SyncTargetObservation> {
  let skipReason: string | undefined;
  // The supported CLI pins refuse strict readonly before opening a proxied store.
  if (workspace.proxied || workspace.doltMode === "proxied-server") skipReason = "proxied-server mode is unsupported";
  else if (!workspace.backend) skipReason = "native backend was not reported";
  else if (workspace.backend !== "dolt") skipReason = "native backend is not Dolt";
  else if (!workspace.doltMode) skipReason = "native Dolt mode was not reported";
  else if (workspace.doltMode === "other") skipReason = "unrecognized native Dolt mode";
  else if (workspace.doltMode === "embedded" && workspace.serverEndpoint)
    skipReason = "embedded mode conflicts with server endpoint evidence";
  if (skipReason) return { state: "unknown", reason: skipReason, listingSkipped: true };

  try {
    const remotes: unknown = JSON.parse(
      await bd(directory, ["--readonly", "dolt", "remote", "list", "--json", "--sandbox"]),
    );
    if (
      !Array.isArray(remotes) ||
      !remotes.every(
        (remote: unknown): remote is { name: string; status: "ok" } =>
          typeof remote === "object" &&
          remote !== null &&
          "name" in remote &&
          typeof remote.name === "string" &&
          remote.name.length > 0 &&
          "status" in remote &&
          remote.status === "ok",
      )
    )
      return { state: "unknown", reason: "native listing returned an unsupported response" };
    if (remotes.some((remote) => remote.name === "origin")) return { state: "resolved", name: "origin" };
    if (remotes.length === 0) {
      return workspace.doltMode === "embedded"
        ? { state: "local-only" }
        : { state: "unknown", reason: "empty native listing in server mode" };
    }
    return { state: "unknown", reason: "native origin was not listed" };
  } catch (error) {
    // Report only bounded failure categories: native output may contain remote URLs or credentials.
    let reason = "native listing failed";
    if (error instanceof PrimeTimeoutError) reason = "native listing timed out";
    else if (error instanceof PrimeProcessError) reason = `native listing exited with code ${error.exitCode}`;
    else if (error instanceof SyntaxError) reason = "native listing returned an unsupported response";
    return { state: "unknown", reason };
  }
}

type FileState = "available" | "missing" | "unreadable" | "truncated";

export type PluginHealthObservation = {
  scope: "context cwd_repo_root" | "confirmed session directory";
  managedInstructions: { state: FileState } & Partial<ReturnType<typeof countManagedBlocks>>;
  sharedSkill: "readable" | "missing" | "unreadable";
};

type WitnessObservation = {
  state:
    | Exclude<FileState, "available">
    | "unavailable"
    | "unsupported"
    | "match"
    | "differ"
    | "running version unavailable";
  recorded?: string;
  running?: string;
};

export type BeadsHealthObservation = {
  witness: WitnessObservation;
  remote: "not reported" | "configured" | "not configured";
  limitations: string;
};

/**
 * Read a file within a byte limit. Truncated results carry no text; only ENOENT means missing.
 * Other I/O failures are reported as unreadable.
 *
 * @param file - Path to the evidence file.
 * @param limit - Maximum bytes accepted as complete evidence.
 */
async function boundedFile(file: string, limit: number): Promise<{ state: FileState; text?: string }> {
  try {
    const handle = await open(file, "r");
    try {
      // Read one extra byte to tell an exact fit from truncation without reading the rest.
      const buffer = Buffer.alloc(limit + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      return bytesRead > limit
        ? { state: "truncated" }
        : { state: "available", text: buffer.subarray(0, bytesRead).toString("utf8") };
    } finally {
      await handle.close();
    }
  } catch (error) {
    return { state: (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "unreadable" };
  }
}

/**
 * Use the native repo root when known; otherwise inspect only the confirmed session directory.
 *
 * @param directory - Confirmed session directory used as a fallback.
 * @param guard - Native workspace observation, if ready.
 */
export async function collectPluginHealth(directory: string, guard: GuardResult): Promise<PluginHealthObservation> {
  const workspace = guard.kind === "ready" ? guard.workspace : undefined;
  const root = workspace?.repoRoot ?? directory;
  const [instructions, skill] = await Promise.all([
    boundedFile(path.join(root, "AGENTS.md"), 65_536),
    // Probe readability only: read at most two bytes and discard the contents.
    boundedFile(path.join(root, ".agents", "skills", "beads", "SKILL.md"), 1),
  ]);
  return {
    scope: workspace?.repoRoot ? "context cwd_repo_root" : "confirmed session directory",
    managedInstructions:
      instructions.state === "available"
        ? { state: "available", ...countManagedBlocks(instructions.text ?? "") }
        : { state: instructions.state },
    sharedSkill: skill.state === "truncated" || skill.state === "available" ? "readable" : skill.state,
  };
}

/**
 * Report advisory CLI-version and remote-configuration evidence, not schema or migration status.
 *
 * @param guard - Native workspace and running CLI version observation.
 */
export async function collectBeadsHealth(guard: GuardResult): Promise<BeadsHealthObservation> {
  const workspace = guard.kind === "ready" ? guard.workspace : undefined;
  const witness: { state: FileState | "unavailable"; text?: string } = workspace
    ? await boundedFile(path.join(workspace.path, ".local_version"), 256)
    : { state: "unavailable", text: undefined };
  const recorded = witness.text?.trim();
  const supported = recorded && /^\d+\.\d+\.\d+$/.test(recorded);
  let witnessObservation: WitnessObservation;
  if (!recorded) witnessObservation = { state: witness.state === "available" ? "unsupported" : witness.state };
  else if (!supported) witnessObservation = { state: "unsupported" };
  else {
    const running = guard.kind === "ready" ? guard.version : undefined;
    const state = running ? (recorded === running ? "match" : "differ") : "running version unavailable";
    witnessObservation = { state, recorded, running };
  }
  return {
    witness: witnessObservation,
    remote: workspace?.remote === undefined ? "not reported" : workspace.remote ? "configured" : "not configured",
    limitations: "Witnesses do not establish schema, reconciliation, hook freshness or maintenance completion.",
  };
}
