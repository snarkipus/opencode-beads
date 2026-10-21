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
import { PrimeProcessError, runBd } from "../src/prime";

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
    check(
      false,
      `${label}: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof PrimeProcessError
        ? [error.stderr.trim(), error.stdout.trim()].filter(Boolean).join("\n     ")
        : undefined
    );
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

// Isolate bd from the caller's configuration and workspaces. Bun.spawn ignores later edits to
// process.env, so the script re-runs itself with the isolated environment instead.
const isolatedRoot = process.env.BD_CONTRACT_ROOT;
if (isolatedRoot === undefined) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bd-contract-"));
  const home = path.join(root, "home");
  await fs.mkdir(home);
  const env: Record<string, string | undefined> = { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, ".config"), XDG_DATA_HOME: path.join(home, ".local/share"), BD_CONTRACT_ROOT: root };
  delete env.BEADS_DIR;
  const child = Bun.spawn([process.execPath, import.meta.path], { env, stdio: ["ignore", "inherit", "inherit"] });
  const exitCode = await child.exited;
  await fs.rm(root, { recursive: true, force: true });
  process.exit(exitCode);
}
const root = isolatedRoot;

try {
  const actor = process.env.BEADS_ACTOR ?? "bd-contract";
  const bd = async (cwd: string, args: readonly string[]): Promise<string> => {
    const argv = [...args];
    const write = ["init", "create", "update", "close", "remember", "setup", "migrate", "dep"].includes(argv[0] ?? "") && !(argv[0] === "dep" && argv[1] === "list");
    const terminator = argv.indexOf("--");
    argv.splice(terminator < 0 ? argv.length : terminator, 0, ...(write ? ["--actor", actor] : []), "--sandbox");
    try {
      const stdout = await runBd(cwd, argv, { timeoutMs: 60_000 });
      console.log(`observed ${JSON.stringify({ cwd, argv, exitCode: 0, stdout })}`);
      return stdout;
    } catch (error) {
      console.log(`observed ${JSON.stringify({ cwd, argv, exitCode: error instanceof PrimeProcessError ? error.exitCode : null, stdout: error instanceof PrimeProcessError ? error.stdout : undefined, stderr: error instanceof PrimeProcessError ? error.stderr : undefined, error: String(error) })}`);
      throw error;
    }
  };
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

  const bareGuard = await checkBeadsStore(bare, guardRuntime);
  check(
    bareGuard.kind === "uninitialized",
    `guard reports a repository without a workspace as uninitialized (actual: ${bareGuard.kind})`
  );
  if (bareGuard.kind !== "uninitialized") {
    await attempt("bd context --json (uninitialized diagnostic)", () => bd(bare, ["context", "--json"]));
  }

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

  const initialFullPrime = await attempt("prime before issue writes", () => bd(repo, ["prime", "--full"]));

  // Commands named by the task-agent prompt and guidance.
  const priorNotes = "Prior attempt failed; retain this evidence.\nNext action: verify append.";
  const created = json(
    await attempt("bd create", () => bd(repo, ["create", "contract probe", "-t", "task", "-p", "2", "--notes", priorNotes, "--json"]))
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
    const checkpoint = "Validated append contract.\nLiteral '$ARGUMENTS' $(no-shell) `text`.";
    const appended = json(await attempt("bd update --append-notes", () =>
      bd(repo, ["update", id, "--append-notes", checkpoint, "--json"])
    )) as Array<{ id?: unknown; notes?: unknown }> | undefined;
    const expectedNotes = `${priorNotes}\n${checkpoint}`;
    check(Array.isArray(appended) && appended[0]?.id === id && appended[0]?.notes === expectedNotes,
      "append acknowledgement retains prior notes and exact multiline checkpoint");
    const recovered = json(await attempt("bd show appended notes", () =>
      bd(repo, ["show", id, "--json"])
    )) as Array<{ id?: unknown; notes?: unknown; assignee?: unknown; status?: unknown; created_by?: unknown }> | undefined;
    check(Array.isArray(recovered) && recovered[0]?.id === id && recovered[0]?.notes === expectedNotes,
      "a fresh show retains both prior notes and the appended checkpoint");
    check(Array.isArray(recovered) && recovered[0]?.assignee === actor && recovered[0]?.status === "in_progress" && recovered[0]?.created_by === actor,
      `created_by and claimed assignee use the explicit test executor (${actor})`);
    // Daily-loop contracts: exact supported argv, returned records and bounded query shapes.
    const rows = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
    const parent = issueId(json(await attempt("create parent", () => bd(repo, ["create", "--title", "contract parent", "--type", "epic", "--priority", "2", "--json"]))));
    const child = json(await attempt("create option-like title and selected fields", () => bd(repo, ["create", "--title", "--assignee=x", "--type", "task", "--priority", "1", "--description", "contract-marker description", "--acceptance", "contract acceptance", "--design", "contract design", "--parent", parent!, "--deps", `discovered-from:${id}`, "--labels", "contract-label", "--json"])));
    const childId = issueId(child);
    const childRecord = (Array.isArray(child) ? child[0] : child) as Record<string, unknown> | undefined;
    check(childId && childRecord?.title === "--assignee=x" && !childRecord.assignee && childRecord.created_by === actor && childRecord.acceptance_criteria === "contract acceptance" && childRecord.design === "contract design", "create preserves flag-like title as data, generated ID, selected fields and no auto-assignee");
    for (const type of ["bug", "feature", "chore"]) {
      const value = json(await attempt(`create ${type}`, () => bd(repo, ["create", "--title", `contract ${type}`, "--type", type, "--priority", "2", "--json"])));
      check(issueId(value), `create supports ${type}`);
    }
    if (childId && parent) {
      for (const [view, flags] of [
        ["ready", ["--parent", parent, "--label", "contract-label"]],
        ["list", ["--parent", parent, "--label", "contract-label", "--status", "open"]],
        ["search", ["--label", "contract-label", "--status", "open", "--", "--assignee=x"]],
      ] as const) {
        const args = [view, "--limit", "2", "--json", ...flags];
        const value = json(await attempt(`find ${view} filtered`, () => bd(repo, args)));
        check(rows(value).length === 1 && rows(value)[0]?.id === childId, `${view} supports declared filters, terminator and bounded array result`);
      }
      for (const view of ["ready", "list", "search"]) {
        const text = view === "search" ? ["--", "contract"] : [];
        const value = json(await attempt(`${view} limit`, () => bd(repo, [view, "--limit", "2", "--json", ...text])));
        check(rows(value).length === 2, `${view} enforces limit for limit+1 projection`);
      }
      for (const direction of ["down", "up"]) {
        const value = json(await attempt(`dep list ${direction}`, () => bd(repo, ["dep", "list", direction === "down" ? childId : parent, "--direction", direction, "--type", "parent-child", "--json"])));
        check(rows(value).some(r => r.id === (direction === "down" ? parent : childId) && r.dependency_type === "parent-child"), `dep list ${direction} preserves typed direct edge direction`);
      }
      const blocker = issueId(json(await attempt("create independent blocker", () => bd(repo, ["create", "--title", "contract blocker", "--json"]))));
      await attempt("add blocker", () => bd(repo, ["dep", "add", childId, blocker!, "--type", "blocks", "--json"]));
      const blocked = json(await attempt("blocked filters", () => bd(repo, ["blocked", "--parent", parent, "--label", "contract-label", "--json"])));
      check(rows(blocked).some(r => r.id === childId), "blocked returns scoped array (no limit supported; completeness unknown)");
      const allEdges = json(await attempt("dep list all", () => bd(repo, ["dep", "list", childId, "--direction", "down", "--json"])));
      check(rows(allEdges).some(r => r.id === blocker && r.dependency_type === "blocks"), "dep list without type retains dependency_type");
      const changed = rows(json(await attempt("selected update fields", () => bd(repo, ["update", childId, "--status", "blocked", "--priority", "3", "--add-label", "added", "--remove-label", "contract-label", "--json"]))))[0];
      check(changed?.status === "blocked" && changed.priority === 3 && Array.isArray(changed.labels) && changed.labels.includes("added") && !changed.labels.includes("contract-label"), "selected update returns requested status, priority and labels");
      for (const status of ["deferred", "open", "in_progress"]) {
        const changed = rows(json(await attempt(`update status ${status}`, () => bd(repo, ["update", childId, "--status", status, "--json"]))))[0];
        check(changed?.status === status, `update status ${status} is evidenced`);
      }
    }
    // Intentional fixture assignment is distinct from the actual executor/audit author.
    const occupied = issueId(json(await attempt("create occupied fixture", () => bd(repo, ["create", "--title", "occupied fixture", "--assignee", "fixture-owner", "--json"]))));
    if (occupied) {
      try { await bd(repo, ["update", occupied, "--claim", "--json"]); check(false, "claim conflict refuses another assignee"); }
      catch (error) {
        check(error instanceof PrimeProcessError && error.exitCode === 1 && error.stdout.trim() === "" && error.stderr.includes("issue already claimed: already assigned to") && error.stderr.includes("fixture-owner"), "claim conflict has exit 1, empty stdout and explicit already-assigned diagnostic");
      }
    }
    try { await bd(repo, ["show", "contract-not-found", "--json"]); check(false, "missing show refuses unknown ID"); }
    catch (error) { check(error instanceof PrimeProcessError && error.exitCode !== 0, "unknown single-ID show remains a failure, never synthetic missing"); }
    for (const view of ["ready", "list", "search"]) {
      const value = json(await attempt(`${view} assignee`, () => bd(repo, [view, "--assignee", actor, "--limit", "2", "--json", ...(view === "search" ? ["--", "contract"] : [])])));
      check(view === "ready" ? rows(value).length === 0 : rows(value).some(r => r.id === id), `${view} filters by actual assignee (ready excludes in_progress)`);
    }
    const issuePrime = await attempt("prime after issue updates", () => bd(repo, ["prime", "--full"]));
    console.log(`observed prime issue comparison: ${JSON.stringify({ equal: initialFullPrime === issuePrime, conclusion: "bounded observation only; retain conservative issue-write invalidation" })}`);
    const discovered = issueId(
      json(
        await attempt("bd create --deps discovered-from", () =>
          bd(repo, ["create", "discovered probe", "--deps", `discovered-from:${id}`, "--json"])
        )
      )
    );
    check(discovered, "bd create --deps discovered-from:<id> succeeds");
    const closed = rows(json(await attempt("bd close --reason", () => bd(repo, ["close", id, "--reason", "contract", "--json"]))))[0];
    check(closed?.id === id && closed.status === "closed", "close acknowledges exact target in closed state");
  }

  // Real supported memory results, without injecting empty rows or manufacturing commit outcomes.
  const initialMemories = json(await attempt("bd memories (empty)", () => bd(repo, ["memories", "--json"])));
  check(initialMemories !== null && typeof initialMemories === "object" && !Array.isArray(initialMemories) &&
    "schema_version" in initialMemories && initialMemories.schema_version === 1 && Object.keys(initialMemories).length === 1,
    "a fresh store returns versioned metadata with no memory entries", `Observed JSON: ${JSON.stringify(initialMemories)}`);
  const emptyKey = "contract-empty";
  try {
    await bd(repo, ["remember", "--key", emptyKey, "--json", "--", ""]);
    check(false, "bd remember rejects empty content");
  } catch (error) {
    const response = json(error instanceof PrimeProcessError ? error.stdout : undefined) as { error?: unknown } | undefined;
    check(error instanceof PrimeProcessError && error.exitCode === 1 && response?.error === "memory content cannot be empty",
      "bd remember rejects empty content with exit 1 and its JSON diagnostic");
    if (error instanceof PrimeProcessError) console.log(`observed empty remember: ${error.stdout.trim()}`);
  }
  for (const key of [emptyKey, "contract-missing"]) {
    try {
      await bd(repo, ["recall", key, "--json"]);
      check(false, `bd recall ${key} exits 1 for a missing memory`);
    } catch (error) {
      const response = json(error instanceof PrimeProcessError ? error.stdout : undefined) as
        { key?: unknown; value?: unknown; found?: unknown } | undefined;
      check(error instanceof PrimeProcessError && error.exitCode === 1 && response?.key === key && response.value === "" && response.found === false,
        `bd recall ${key} reports missing with empty value, found=false and exit 1`);
      if (error instanceof PrimeProcessError) console.log(`observed missing recall: ${error.stdout.trim()}`);
    }
  }
  const memoryKey = "contract-knowledge";
  const memory = "Reusable contract-marker knowledge.\nLiteral '$ARGUMENTS' $(no-shell) `text`.";
  const remembered = json(await attempt("bd remember", () =>
    bd(repo, ["remember", "--key", memoryKey, "--json", "--", memory])
  )) as { key?: unknown; value?: unknown; action?: unknown } | undefined;
  check(remembered?.key === memoryKey && remembered.value === memory && remembered.action === "remembered",
    "bd remember returns the explicit key, exact content and remembered action");
  console.log(`observed remember: ${JSON.stringify(remembered)}`);
  const recalled = json(await attempt("bd recall (found)", () => bd(repo, ["recall", memoryKey, "--json"]))) as
    { key?: unknown; value?: unknown; found?: unknown } | undefined;
  check(recalled?.key === memoryKey && recalled.value === memory && recalled.found === true,
    "bd recall finds the exact stored multiline memory");
  const updatedMemory = `${memory}\nUpdated contract-marker evidence.`;
  const updated = json(await attempt("bd remember (update)", () =>
    bd(repo, ["remember", "--key", memoryKey, "--json", "--", updatedMemory])
  )) as { key?: unknown; value?: unknown; action?: unknown } | undefined;
  check(updated?.key === memoryKey && updated.value === updatedMemory && updated.action === "updated",
    "remembering the same key updates it in place with the updated action");
  console.log(`observed updated remember: ${JSON.stringify(updated)}`);
  for (const args of [["memories", "--json"], ["memories", "--json", "--", "contract-marker"]]) {
    const memories = json(await attempt(`bd ${args.join(" ")}`, () => bd(repo, args))) as Record<string, unknown> | undefined;
    check(memories && !Array.isArray(memories) && memories.schema_version === 1 && Object.keys(memories).length === 2 && memories[memoryKey] === updatedMemory,
      `${args.join(" ")} returns versioned metadata and only the updated memory, with no empty or duplicate record`, `Observed JSON: ${JSON.stringify(memories)}`);
  }
  const noMatches = json(await attempt("bd memories (no match)", () =>
    bd(repo, ["memories", "--json", "--", "absent-contract-marker"])
  ));
  check(noMatches !== null && typeof noMatches === "object" && !Array.isArray(noMatches) &&
    "schema_version" in noMatches && noMatches.schema_version === 1 && Object.keys(noMatches).length === 1,
    "a successful memory search with no matches returns versioned metadata and no memory entries", `Observed JSON: ${JSON.stringify(noMatches)}`);

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
  const preserved = minimizeBeadsInstructions(agentsFile);
  check(
    preserved.replaced === 0 && preserved.text === agentsFile,
    "the plugin preserves managed instructions when their body is not supplied in context"
  );
  const minimized = minimizeBeadsInstructions(agentsFile, agentsFile);
  check(
    minimized.replaced > 0 && !minimized.text.includes("profile:full"),
    `the plugin replaces bd's duplicate AGENTS.md blocks (${minimized.replaced} block(s), ${agentsFile.length} -> ${minimized.text.length} chars)`
  );

  // The guard's marker contract: prime never refreshes it, bd migrate schema always does.
  if (markerPath) {
    await fs.writeFile(markerPath, "0.0.1\n");
    const prime = await attempt("bd prime", () => bd(repo, ["prime"]));
    check(prime?.trim(), "bd prime succeeds with workflow output");
    const stealthPrime = await attempt("bd prime --stealth", () => bd(repo, ["prime", "--stealth"]));
    check(stealthPrime?.trim(), "bd prime --stealth succeeds (the stealth plugin option)");
    // bd shrinks prime to MCP reminders when Claude Code's settings list a Beads MCP server, even
    // though OpenCode has none; the plugin passes --full to keep the CLI workflow.
    const claudeSettings = path.join(process.env.HOME!, ".claude", "settings.json");
    await fs.mkdir(path.dirname(claudeSettings), { recursive: true });
    await fs.writeFile(claudeSettings, JSON.stringify({ mcpServers: { beads: { command: "beads-mcp" } } }));
    const mcpPrime = await attempt("bd prime (Claude MCP configured)", () => bd(repo, ["prime"]));
    const fullPrime = await attempt("bd prime --full --stealth (Claude MCP configured)", () =>
      bd(repo, ["prime", "--full", "--stealth"])
    );
    check(
      fullPrime?.includes("## Essential Commands"),
      "bd prime --full --stealth keeps the CLI workflow when Claude Code has a Beads MCP server"
    );
    check(
      mcpPrime !== undefined && !mcpPrime.includes("## Essential Commands"),
      "bd prime without --full still drops to MCP mode (the reason the plugin passes --full)",
      "REASSESS: bd may no longer read Claude Code's MCP settings; --full stays harmless."
    );
    await fs.rm(path.dirname(claudeSettings), { recursive: true, force: true });
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
