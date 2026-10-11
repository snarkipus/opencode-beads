/**
 * Check the installed `bd` against everything this plugin relies on, in a disposable repository.
 *
 * Nothing upstream is vendored, so this is the compatibility tripwire: it exercises the real guard
 * and the commands named by the task-agent prompt. CI runs it against the validated release, and a
 * scheduled workflow runs it against the latest stable release.
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  checkBeadsStore,
  compareVersions,
  createGuardRuntime,
  MINIMUM_BD_VERSION,
  parseVersion,
} from "../src/guard";
import { minimizeBeadsInstructions } from "../src/instructions";
import { runBd } from "../src/prime";

const failures: string[] = [];
function check(condition: unknown, message: string, failureHint?: string): void {
  if (condition) console.log(`ok   ${message}`);
  else {
    const detail = failureHint ? `${message}\n     ${failureHint}` : message;
    console.log(`FAIL ${detail}`);
    failures.push(detail);
  }
}

async function attempt<T>(label: string, run: () => Promise<T>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    check(false, `${label}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function json(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function issueId(value: unknown): string | undefined {
  const record = Array.isArray(value) ? value[0] : value;
  const id = (record as { id?: unknown } | undefined)?.id;
  return typeof id === "string" ? id : undefined;
}

/** Hash every file outside .git and .beads, keyed by relative path. */
async function snapshot(directory: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const entry of await fs.readdir(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    const relative = path.relative(directory, full);
    if (/^(\.git|\.beads)(\/|$)/.test(relative)) continue;
    files.set(relative, new Bun.CryptoHasher("sha256").update(await fs.readFile(full)).digest("hex"));
  }
  return files;
}

async function git(cwd: string, ...args: string[]): Promise<void> {
  const child = Bun.spawn(["git", ...args], { cwd, stdout: "ignore", stderr: "pipe" });
  if ((await child.exited) !== 0) throw new Error(`git ${args.join(" ")} failed`);
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), "bd-contract-"));
// Isolate bd from the caller's configuration and workspaces.
process.env.HOME = path.join(root, "home");
delete process.env.BEADS_DIR;
await fs.mkdir(process.env.HOME);

try {
  const bd = (cwd: string, args: readonly string[]) => runBd(cwd, args, { timeoutMs: 60_000 });
  const guardRuntime = createGuardRuntime(bd);
  const repo = path.join(root, "repo");
  const bare = path.join(root, "bare");
  for (const directory of [repo, bare]) {
    await fs.mkdir(directory);
    await git(directory, "init", "-q");
  }
  await git(repo, "config", "user.email", "contract@example.invalid");
  await git(repo, "config", "user.name", "bd contract");

  const versionOutput = await attempt("bd version", () => bd(repo, ["version"]));
  const installed = versionOutput === undefined ? undefined : parseVersion(versionOutput);
  check(installed, `bd version is parseable (${versionOutput?.trim() ?? "no output"})`);
  const minimum = parseVersion(MINIMUM_BD_VERSION);
  check(
    installed && minimum && compareVersions(installed, minimum) >= 0,
    `bd ${installed?.join(".")} meets the supported minimum ${MINIMUM_BD_VERSION}`
  );

  check(
    (await checkBeadsStore(bare, guardRuntime)).kind === "uninitialized",
    "guard reports a repository without a workspace as uninitialized"
  );

  await attempt("bd init", () => bd(repo, ["init", "--skip-agents", "-q"]));
  const where = json(await attempt("bd where --json", () => bd(repo, ["where", "--json"]))) as
    | { path?: unknown }
    | undefined;
  const beadsPath = typeof where?.path === "string" ? where.path : undefined;
  check(beadsPath && (await fs.exists(beadsPath)), "bd where --json reports an existing .beads path");

  const markerPath = beadsPath ? path.join(beadsPath, ".local_version") : undefined;
  const readMarker = async () =>
    markerPath ? await fs.readFile(markerPath, "utf8").catch(() => undefined) : undefined;
  const initialMarker = await readMarker();
  check(
    initialMarker !== undefined && parseVersion(initialMarker)?.join(".") === installed?.join("."),
    `bd init writes .local_version for the installed version (${initialMarker?.trim()})`
  );
  check(
    (await checkBeadsStore(repo, guardRuntime)).kind === "ready",
    "guard reports a current store as ready"
  );

  // Commands named by the task-agent prompt and guidance.
  const created = json(
    await attempt("bd create", () => bd(repo, ["create", "contract probe", "-t", "task", "-p", "2", "--json"]))
  );
  const id = issueId(created);
  check(id, "bd create --json returns an issue id");
  if (id) {
    check(json(await attempt("bd ready --json", () => bd(repo, ["ready", "--json"]))) !== undefined, "bd ready --json returns JSON");
    check(json(await attempt("bd show --json", () => bd(repo, ["show", id, "--json"]))) !== undefined, "bd show <id> --json returns JSON");
    check(
      json(await attempt("bd update --claim", () => bd(repo, ["update", id, "--claim", "--json"]))) !== undefined,
      "bd update <id> --claim --json succeeds"
    );
    const discovered = issueId(
      json(
        await attempt("bd create --deps discovered-from", () =>
          bd(repo, ["create", "discovered probe", "--deps", `discovered-from:${id}`, "--json"])
        )
      )
    );
    check(discovered, "bd create --deps discovered-from:<id> succeeds");
    check(
      (await attempt("bd close --reason", () => bd(repo, ["close", id, "--reason", "contract", "--json"]))) !== undefined,
      "bd close <id> --reason --json succeeds"
    );
  }

  // Install shape: the plugin assumes plain `bd init` and never `bd setup opencode` (Claude Code parity).
  const setupRepo = path.join(root, "setup");
  await fs.mkdir(setupRepo);
  await git(setupRepo, "init", "-q");
  await git(setupRepo, "config", "user.email", "contract@example.invalid");
  await git(setupRepo, "config", "user.name", "bd contract");
  await attempt("bd init (default integrations)", () => bd(setupRepo, ["init", "-q"]));
  const readAgents = () => fs.readFile(path.join(setupRepo, "AGENTS.md"), "utf8").catch(() => "");
  const initAgents = await readAgents();
  check(
    /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:minimal\b[^>]*-->/.test(initAgents),
    "bd init writes the minimal AGENTS.md profile (a pointer to bd prime), the install premise"
  );
  const reassess =
    "REASSESS: upstream may now integrate OpenCode natively; review whether this plugin is still needed (docs/beads-artifact-policy.md).";
  const openCodeFiles = ["opencode.json", "opencode.jsonc", ".opencode"];
  const initOpenCode = (
    await Promise.all(openCodeFiles.map(async (file) => ((await fs.exists(path.join(setupRepo, file))) ? file : "")))
  ).filter(Boolean);
  check(initOpenCode.length === 0, `bd init writes no OpenCode integration files (${initOpenCode.join(", ") || "none"})`, reassess);

  const before = await snapshot(setupRepo);
  await attempt("bd setup opencode", () => bd(setupRepo, ["setup", "opencode"]));
  const after = await snapshot(setupRepo);
  const changed = [...new Set([...before.keys(), ...after.keys()])]
    .filter((file) => before.get(file) !== after.get(file))
    .sort();
  check(
    changed.join(",") === "AGENTS.md",
    `bd setup opencode only edits AGENTS.md (changed: ${changed.join(", ") || "nothing"})`,
    reassess
  );
  const setupList = await attempt("bd setup --list", () => bd(setupRepo, ["setup", "--list"]));
  const opencodeRecipe = setupList?.split("\n").find((line) => /^\s*opencode\b/.test(line)) ?? "";
  check(
    /AGENTS\.md/.test(opencodeRecipe),
    `bd setup --list still describes the opencode recipe as an AGENTS.md section ("${opencodeRecipe.trim()}")`,
    reassess
  );

  // The blocks the plugin minimizes while prime is attached, for projects where setup was run anyway.
  const agentsFile = await readAgents();
  check(
    /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:full\b[^>]*-->/.test(agentsFile) &&
      agentsFile.includes("<!-- END BEADS INTEGRATION -->"),
    "bd setup opencode writes a full-profile block with the expected markers"
  );
  const minimized = minimizeBeadsInstructions(agentsFile);
  check(
    minimized.replaced > 0 && !minimized.text.includes("profile:full"),
    `the plugin replaces bd's duplicate AGENTS.md blocks (${minimized.replaced} block(s), ${agentsFile.length} -> ${minimized.text.length} chars)`
  );

  // The guard's marker contract: prime never refreshes it, bd migrate schema always does.
  if (markerPath) {
    await fs.writeFile(markerPath, "0.0.1\n");
    const prime = await attempt("bd prime", () => bd(repo, ["prime"]));
    check(prime?.trim(), "bd prime succeeds with workflow output");
    check((await readMarker())?.trim() === "0.0.1", "bd prime does not update .local_version");
    check(
      (await checkBeadsStore(repo, guardRuntime)).kind === "migration-pending",
      "guard withholds prime for a stale .local_version"
    );
    await attempt("bd migrate schema", () => bd(repo, ["migrate", "schema", "--json"]));
    check(
      parseVersion((await readMarker()) ?? "")?.join(".") === installed?.join("."),
      "bd migrate schema refreshes .local_version"
    );
    check(
      (await checkBeadsStore(repo, guardRuntime)).kind === "ready",
      "guard is ready again after bd migrate schema"
    );
  }
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} bd contract check(s) failed.`);
  process.exit(1);
}
console.log("\nbd contract satisfied.");
