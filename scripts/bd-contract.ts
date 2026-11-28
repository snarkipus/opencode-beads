/**
 * Check native `bd` assumptions in disposable repositories.
 *
 * The scenario exercises CLI behavior, the workspace guard, and managed instruction reduction.
 * Setup shape and MCP-sensitive prime output also check premises for the integration design.
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { checkBeadsStore, compareVersions, createGuardRuntime, MINIMUM_BD_VERSION, parseVersion } from "../src/guard";
import { minimizeBeadsInstructions } from "../src/instructions";
import { PrimeProcessError, runBd } from "../src/prime";

/**
 * Decode native output without throwing, preserving valid JSON values including null and arrays.
 * @param text CLI output, or undefined when a failed invocation has already been reported.
 * @returns The decoded value, or undefined for absent or invalid JSON.
 */
function decodeJsonOrUndefined(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Read the ID from one issue or the first row of a native issue response.
 * @param value Decoded native issue output.
 */
function issueId(value: unknown): string | undefined {
  const record = Array.isArray(value) ? value[0] : value;
  const id = (record as { id?: unknown } | undefined)?.id;
  return typeof id === "string" ? id : undefined;
}

/**
 * Hash fixture files by relative path, excluding the root .git and .beads directories.
 * @param directory Fixture root to inspect.
 */
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

/**
 * Run fixture Git setup, stopping the contract if a command fails.
 * @param cwd Fixture repository.
 * @param args Exact Git setup arguments.
 */
async function git(cwd: string, ...args: string[]): Promise<void> {
  const child = Bun.spawn(["git", ...args], { cwd, stdout: "ignore", stderr: "pipe" });
  if ((await child.exited) !== 0) throw new Error(`git ${args.join(" ")} failed`);
}

/**
 * Set the local Git identity for fixtures where Beads writes.
 * @param directory Initialized fixture repository.
 */
async function configureFixtureGit(directory: string): Promise<void> {
  await git(directory, "config", "user.email", "contract@example.invalid");
  await git(directory, "config", "user.name", "bd contract");
}

/**
 * Read the native list shape for checks that require specific rows or a nonzero count.
 * @param value Decoded CLI output.
 */
function issueRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

/**
 * Check the named assignee result against the expected issue state.
 * @param value Parsed native list output.
 * @param view CLI view whose filters were used.
 * @param id Claimed issue expected in list and search.
 */
export function matchesAssigneeView(value: unknown, view: "ready" | "list" | "search", id: string): boolean {
  if (!Array.isArray(value)) return false;
  if (view === "ready") return value.length === 0;
  return value.some((row: unknown) => issueId(row) === id && !Array.isArray(row));
}

/**
 * Recognize the native diagnostic for a missing single issue.
 * @param error Failure from the native show invocation.
 * @param id Exact requested issue ID.
 */
export function isMissingIssue(error: unknown, id: string): boolean {
  if (!(error instanceof PrimeProcessError) || error.exitCode !== 1) return false;
  const response = decodeJsonOrUndefined(error.stdout);
  return (
    response !== null &&
    typeof response === "object" &&
    "error" in response &&
    response.error === "no issues found matching the provided IDs" &&
    error.stderr.split(/\r?\n/).some((line) => line === `Issue ${id} not found`)
  );
}

/**
 * Recognize a versioned memory listing containing only schema metadata.
 * @param value Parsed native memories output.
 */
function isEmptyMemoryList(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "schema_version" in value &&
    value.schema_version === 1 &&
    Object.keys(value).length === 1
  );
}

/**
 * Run the native observations in the subprocess with its isolated environment.
 * @param root Scratch directory and working directory supplied by the allocator.
 * @returns Exit status for the contract verdict.
 */
export async function runContract(root: string): Promise<number> {
  const failures: string[] = [];

  /**
   * Print each verdict and retain failures for the final status.
   * @param condition Evidence evaluated for truthiness.
   * @param message Verdict text.
   * @param failureHint Additional detail printed only on failure.
   */
  function check(condition: unknown, message: string, failureHint?: string): void {
    if (condition) console.log(`ok   ${message}`);
    else {
      const detail = failureHint ? `${message}\n     ${failureHint}` : message;
      console.log(`FAIL ${detail}`);
      failures.push(detail);
    }
  }

  /**
   * Record a failed native call and let later observations continue without its output.
   * @param label Description used in failure output.
   * @param cwd Working directory of the native invocation.
   * @param args Subcommand arguments before fixture flags are added.
   */
  async function attempt(label: string, cwd: string, args: readonly string[]): Promise<string | undefined> {
    try {
      return await bd(cwd, args);
    } catch (error) {
      check(
        false,
        `${label}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof PrimeProcessError
          ? [error.stderr.trim(), error.stdout.trim()].filter(Boolean).join("\n     ")
          : undefined,
      );
      return undefined;
    }
  }

  /**
   * Observe a JSON invocation and decode its output for the caller's assertion.
   * @param label Description used if the invocation fails.
   * @param cwd Working directory of the native invocation.
   * @param args Subcommand arguments before fixture flags are added.
   */
  async function attemptJson(label: string, cwd: string, args: readonly string[]): Promise<unknown> {
    return decodeJsonOrUndefined(await attempt(label, cwd, args));
  }

  const actor = process.env.BEADS_ACTOR ?? "bd-contract";
  /**
   * Apply fixture flags and log the native outcome before returning or rethrowing.
   * @param cwd Working directory of the native invocation.
   * @param args Subcommand arguments before fixture flags are added.
   */
  async function bd(cwd: string, args: readonly string[]): Promise<string> {
    const argv = [...args];
    const write =
      ["init", "create", "update", "close", "remember", "setup", "migrate", "dep"].includes(argv[0] ?? "") &&
      !(argv[0] === "dep" && argv[1] === "list");
    const terminator = argv.indexOf("--");
    argv.splice(terminator < 0 ? argv.length : terminator, 0, ...(write ? ["--actor", actor] : []), "--sandbox");
    try {
      const stdout = await runBd(cwd, argv, { timeoutMs: 60_000 });
      console.log(`observed ${JSON.stringify({ cwd, argv, exitCode: 0, stdout })}`);
      return stdout;
    } catch (error) {
      const nativeError = error instanceof PrimeProcessError ? error : undefined;
      const observation = {
        cwd,
        argv,
        exitCode: nativeError ? nativeError.exitCode : null,
        stdout: nativeError?.stdout,
        stderr: nativeError?.stderr,
        error: String(error),
      };
      console.log(`observed ${JSON.stringify(observation)}`);
      throw error;
    }
  }

  const repo = path.join(root, "repo");
  const literalText = "Literal '$ARGUMENTS' $(no-shell) `text`.";

  /**
   * Initialize the fixtures and check the native observations used by the guard and diagnostics.
   * @returns Full prime output before issue writes, for comparison in the next phase.
   */
  async function observeWorkspacePrerequisites(): Promise<string | undefined> {
    const guardRuntime = createGuardRuntime(bd);
    const bare = path.join(root, "bare");
    for (const directory of [repo, bare]) {
      await fs.mkdir(directory);
      await git(directory, "init", "-q");
    }
    await configureFixtureGit(repo);

    const versionOutput = await attempt("bd version", repo, ["version"]);
    const installed = versionOutput === undefined ? undefined : parseVersion(versionOutput);
    check(installed, `bd version is parseable (${versionOutput?.trim() ?? "no output"})`);
    const minimum = parseVersion(MINIMUM_BD_VERSION);
    check(
      installed && minimum && compareVersions(installed, minimum) >= 0,
      `bd ${installed?.join(".")} meets the supported minimum ${MINIMUM_BD_VERSION}`,
    );

    const bareGuard = await checkBeadsStore(bare, guardRuntime);
    check(
      bareGuard.kind === "uninitialized",
      `guard reports a repository without a workspace as uninitialized (actual: ${bareGuard.kind})`,
    );
    if (bareGuard.kind !== "uninitialized") {
      await attempt("bd context --json (uninitialized diagnostic)", bare, ["context", "--json"]);
    }

    await attempt("bd init", repo, ["init", "--skip-agents", "-q"]);
    const where = (await attemptJson("bd where --json", repo, ["where", "--json"])) as { path?: unknown } | undefined;
    const beadsPath = typeof where?.path === "string" ? where.path : undefined;
    check(beadsPath && (await fs.exists(beadsPath)), "bd where --json reports an existing .beads path");

    check(
      (await checkBeadsStore(repo, guardRuntime)).kind === "ready",
      "CLI/workspace compatibility checks pass (not SQL health certification)",
    );

    const hooks = (await attemptJson("bd hooks list --json", repo, ["hooks", "list", "--json"])) as
      | { hooks?: unknown }
      | undefined;
    check(
      Array.isArray(hooks?.hooks) &&
        hooks.hooks.every(
          (hook: unknown) =>
            typeof hook === "object" &&
            hook !== null &&
            typeof Reflect.get(hook, "Name") === "string" &&
            typeof Reflect.get(hook, "Version") === "string" &&
            ["Installed", "IsShim", "Outdated"].every((key) => typeof Reflect.get(hook, key) === "boolean"),
        ),
      "native hook-list JSON has the supported status fields",
    );

    return await attempt("prime before issue writes", repo, ["prime", "--full"]);
  }

  /**
   * Exercise the issue and dependency commands used by the adapter and task-agent guidance.
   * @param initialFullPrime Prime output observed before any issue writes.
   */
  async function checkIssuesAndDependencies(initialFullPrime: string | undefined): Promise<void> {
    const priorNotes = "Prior attempt failed; retain this evidence.\nNext action: verify append.";
    const created = await attemptJson("bd create", repo, [
      "create",
      "contract probe",
      "-t",
      "task",
      "-p",
      "2",
      "--notes",
      priorNotes,
      "--json",
    ]);
    const id = issueId(created);
    check(id, "bd create --json returns an issue id");
    if (!id) return;

    const showIssue = ["show", id, "--json"];
    check(
      (await attemptJson("bd ready --json", repo, ["ready", "--json"])) !== undefined,
      "bd ready --json returns JSON",
    );
    check((await attemptJson("bd show --json", repo, showIssue)) !== undefined, "bd show <id> --json returns JSON");
    check(
      (await attemptJson("bd update --claim", repo, ["update", id, "--claim", "--json"])) !== undefined,
      "bd update <id> --claim --json succeeds",
    );
    const checkpoint = `Validated append contract.\n${literalText}`;
    const appended = (await attemptJson("bd update --append-notes", repo, [
      "update",
      id,
      "--append-notes",
      checkpoint,
      "--json",
    ])) as Array<{ id?: unknown; notes?: unknown }> | undefined;
    const expectedNotes = `${priorNotes}\n${checkpoint}`;
    check(
      Array.isArray(appended) && appended[0]?.id === id && appended[0]?.notes === expectedNotes,
      "append acknowledgement retains prior notes and exact multiline checkpoint",
    );
    const recovered = (await attemptJson("bd show appended notes", repo, showIssue)) as
      | Array<{ id?: unknown; notes?: unknown; assignee?: unknown; status?: unknown; created_by?: unknown }>
      | undefined;
    check(
      Array.isArray(recovered) && recovered[0]?.id === id && recovered[0]?.notes === expectedNotes,
      "a fresh show retains both prior notes and the appended checkpoint",
    );
    check(
      Array.isArray(recovered) &&
        recovered[0]?.assignee === actor &&
        recovered[0]?.status === "in_progress" &&
        recovered[0]?.created_by === actor,
      `created_by and claimed assignee use the explicit test executor (${actor})`,
    );
    // Daily-loop contracts: exact supported argv, returned records and bounded query shapes.
    const parent = issueId(
      await attemptJson("create parent", repo, [
        "create",
        "--title",
        "contract parent",
        "--type",
        "epic",
        "--priority",
        "2",
        "--json",
      ]),
    );
    const child = await attemptJson("create option-like title and selected fields", repo, [
      "create",
      "--title",
      "--assignee=x",
      "--type",
      "task",
      "--priority",
      "1",
      "--description",
      "contract-marker description",
      "--acceptance",
      "contract acceptance",
      "--design",
      "contract design",
      "--parent",
      parent!,
      "--deps",
      `discovered-from:${id}`,
      "--labels",
      "contract-label",
      "--json",
    ]);
    const childId = issueId(child);
    const childRecord = (Array.isArray(child) ? child[0] : child) as Record<string, unknown> | undefined;
    check(
      childId &&
        childRecord?.title === "--assignee=x" &&
        !childRecord.assignee &&
        childRecord.created_by === actor &&
        childRecord.acceptance_criteria === "contract acceptance" &&
        childRecord.design === "contract design",
      "create preserves flag-like title as data, generated ID, selected fields and no auto-assignee",
    );
    for (const type of ["bug", "feature", "chore"]) {
      const value = await attemptJson(`create ${type}`, repo, [
        "create",
        "--title",
        `contract ${type}`,
        "--type",
        type,
        "--priority",
        "2",
        "--json",
      ]);
      check(issueId(value), `create supports ${type}`);
    }
    if (childId && parent) {
      for (const [view, flags] of [
        ["ready", ["--parent", parent, "--label", "contract-label"]],
        ["list", ["--parent", parent, "--label", "contract-label", "--status", "open"]],
        ["search", ["--label", "contract-label", "--status", "open", "--", "--assignee=x"]],
      ] as const) {
        const args = [view, "--limit", "2", "--json", ...flags];
        const value = await attemptJson(`find ${view} filtered`, repo, args);
        const matches = issueRows(value);
        check(
          matches.length === 1 && matches[0]?.id === childId,
          `${view} supports declared filters, terminator and bounded array result`,
        );
      }
      for (const view of ["ready", "list", "search"]) {
        const text = view === "search" ? ["--", "contract"] : [];
        const value = await attemptJson(`${view} limit`, repo, [view, "--limit", "2", "--json", ...text]);
        check(issueRows(value).length === 2, `${view} enforces limit for limit+1 projection`);
      }
      for (const direction of ["down", "up"]) {
        const value = await attemptJson(`dep list ${direction}`, repo, [
          "dep",
          "list",
          direction === "down" ? childId : parent,
          "--direction",
          direction,
          "--type",
          "parent-child",
          "--json",
        ]);
        check(
          issueRows(value).some(
            (r) => r.id === (direction === "down" ? parent : childId) && r.dependency_type === "parent-child",
          ),
          `dep list ${direction} preserves typed direct edge direction`,
        );
      }
      const blocker = issueId(
        await attemptJson("create independent blocker", repo, ["create", "--title", "contract blocker", "--json"]),
      );
      await attempt("add blocker", repo, ["dep", "add", childId, blocker!, "--type", "blocks", "--json"]);
      const blocked = await attemptJson("blocked filters", repo, [
        "blocked",
        "--parent",
        parent,
        "--label",
        "contract-label",
        "--json",
      ]);
      check(
        issueRows(blocked).some((r) => r.id === childId),
        "blocked returns scoped array (no limit supported; completeness unknown)",
      );
      const allEdges = await attemptJson("dep list all", repo, [
        "dep",
        "list",
        childId,
        "--direction",
        "down",
        "--json",
      ]);
      check(
        issueRows(allEdges).some((r) => r.id === blocker && r.dependency_type === "blocks"),
        "dep list without type retains dependency_type",
      );
      const changed = issueRows(
        await attemptJson("selected update fields", repo, [
          "update",
          childId,
          "--status",
          "blocked",
          "--priority",
          "3",
          "--add-label",
          "added",
          "--remove-label",
          "contract-label",
          "--json",
        ]),
      )[0];
      check(
        changed?.status === "blocked" &&
          changed.priority === 3 &&
          Array.isArray(changed.labels) &&
          changed.labels.includes("added") &&
          !changed.labels.includes("contract-label"),
        "selected update returns requested status, priority and labels",
      );
      for (const status of ["deferred", "open", "in_progress"]) {
        const changed = issueRows(
          await attemptJson(`update status ${status}`, repo, ["update", childId, "--status", status, "--json"]),
        )[0];
        check(changed?.status === status, `update status ${status} is evidenced`);
      }
    }
    // Intentional fixture assignment is distinct from the actual executor/audit author.
    const occupied = issueId(
      await attemptJson("create occupied fixture", repo, [
        "create",
        "--title",
        "occupied fixture",
        "--assignee",
        "fixture-owner",
        "--json",
      ]),
    );
    if (occupied) {
      try {
        await bd(repo, ["update", occupied, "--claim", "--json"]);
        check(false, "claim conflict refuses another assignee");
      } catch (error) {
        check(
          error instanceof PrimeProcessError &&
            error.exitCode === 1 &&
            error.stdout.trim() === "" &&
            error.stderr.includes("issue already claimed: already assigned to") &&
            error.stderr.includes("fixture-owner"),
          "claim conflict has exit 1, empty stdout and explicit already-assigned diagnostic",
        );
      }
    }
    const missingId = "contract-not-found";
    try {
      await bd(repo, ["show", missingId, "--json"]);
      check(false, "missing show refuses unknown ID");
    } catch (error) {
      check(
        isMissingIssue(error, missingId),
        "unknown single-ID show exits 1 with the native missing-issue diagnostics",
      );
    }
    for (const view of ["ready", "list", "search"] as const) {
      const value = await attemptJson(`${view} assignee`, repo, [
        view,
        "--assignee",
        actor,
        "--limit",
        "2",
        "--json",
        ...(view === "search" ? ["--", "contract"] : []),
      ]);
      check(matchesAssigneeView(value, view, id), `${view} filters by actual assignee (ready excludes in_progress)`);
    }
    const issuePrime = await attempt("prime after issue updates", repo, ["prime", "--full"]);
    console.log(
      `observed prime issue comparison: ${JSON.stringify({ equal: initialFullPrime === issuePrime, conclusion: "bounded observation only; retain conservative issue-write invalidation" })}`,
    );
    const discovered = issueId(
      await attemptJson("bd create --deps discovered-from", repo, [
        "create",
        "discovered probe",
        "--deps",
        `discovered-from:${id}`,
        "--json",
      ]),
    );
    check(discovered, "bd create --deps discovered-from:<id> succeeds");
    const closed = issueRows(
      await attemptJson("bd close --reason", repo, ["close", id, "--reason", "contract", "--json"]),
    )[0];
    check(closed?.id === id && closed.status === "closed", "close acknowledges exact target in closed state");
  }

  /** Check native memory output and missing or invalid content diagnostics. */
  async function checkMemories(): Promise<void> {
    const initialMemories = await attemptJson("bd memories (empty)", repo, ["memories", "--json"]);
    check(
      isEmptyMemoryList(initialMemories),
      "a fresh store returns versioned metadata with no memory entries",
      `Observed JSON: ${JSON.stringify(initialMemories)}`,
    );
    const emptyKey = "contract-empty";
    try {
      await bd(repo, ["remember", "--key", emptyKey, "--json", "--", ""]);
      check(false, "bd remember rejects empty content");
    } catch (error) {
      const response = decodeJsonOrUndefined(error instanceof PrimeProcessError ? error.stdout : undefined) as
        | { error?: unknown }
        | undefined;
      check(
        error instanceof PrimeProcessError &&
          error.exitCode === 1 &&
          response?.error === "memory content cannot be empty",
        "bd remember rejects empty content with exit 1 and its JSON diagnostic",
      );
      if (error instanceof PrimeProcessError) console.log(`observed empty remember: ${error.stdout.trim()}`);
    }
    for (const key of [emptyKey, "contract-missing"]) {
      try {
        await bd(repo, ["recall", key, "--json"]);
        check(false, `bd recall ${key} exits 1 for a missing memory`);
      } catch (error) {
        const response = decodeJsonOrUndefined(error instanceof PrimeProcessError ? error.stdout : undefined) as
          | { key?: unknown; value?: unknown; found?: unknown }
          | undefined;
        check(
          error instanceof PrimeProcessError &&
            error.exitCode === 1 &&
            response?.key === key &&
            response.value === "" &&
            response.found === false,
          `bd recall ${key} reports missing with empty value, found=false and exit 1`,
        );
        if (error instanceof PrimeProcessError) console.log(`observed missing recall: ${error.stdout.trim()}`);
      }
    }
    const memoryKey = "contract-knowledge";
    const memory = `Reusable contract-marker knowledge.\n${literalText}`;
    const remembered = (await attemptJson("bd remember", repo, [
      "remember",
      "--key",
      memoryKey,
      "--json",
      "--",
      memory,
    ])) as { key?: unknown; value?: unknown; action?: unknown } | undefined;
    check(
      remembered?.key === memoryKey && remembered.value === memory && remembered.action === "remembered",
      "bd remember returns the explicit key, exact content and remembered action",
    );
    console.log(`observed remember: ${JSON.stringify(remembered)}`);
    const recalled = (await attemptJson("bd recall (found)", repo, ["recall", memoryKey, "--json"])) as
      | { key?: unknown; value?: unknown; found?: unknown }
      | undefined;
    check(
      recalled?.key === memoryKey && recalled.value === memory && recalled.found === true,
      "bd recall finds the exact stored multiline memory",
    );
    const updatedMemory = `${memory}\nUpdated contract-marker evidence.`;
    const updated = (await attemptJson("bd remember (update)", repo, [
      "remember",
      "--key",
      memoryKey,
      "--json",
      "--",
      updatedMemory,
    ])) as { key?: unknown; value?: unknown; action?: unknown } | undefined;
    check(
      updated?.key === memoryKey && updated.value === updatedMemory && updated.action === "updated",
      "remembering the same key updates it in place with the updated action",
    );
    console.log(`observed updated remember: ${JSON.stringify(updated)}`);
    for (const args of [
      ["memories", "--json"],
      ["memories", "--json", "--", "contract-marker"],
    ]) {
      const memories = (await attemptJson(`bd ${args.join(" ")}`, repo, args)) as Record<string, unknown> | undefined;
      check(
        memories &&
          !Array.isArray(memories) &&
          memories.schema_version === 1 &&
          Object.keys(memories).length === 2 &&
          memories[memoryKey] === updatedMemory,
        `${args.join(" ")} returns versioned metadata and only the updated memory, with no empty or duplicate record`,
        `Observed JSON: ${JSON.stringify(memories)}`,
      );
    }
    const noMatches = await attemptJson("bd memories (no match)", repo, [
      "memories",
      "--json",
      "--",
      "absent-contract-marker",
    ]);
    check(
      isEmptyMemoryList(noMatches),
      "a successful memory search with no matches returns versioned metadata and no memory entries",
      `Observed JSON: ${JSON.stringify(noMatches)}`,
    );
  }

  /** Check setup premises, managed instruction reduction, and the native prime options. */
  async function checkSetupAndPrime(): Promise<void> {
    // REASSESS premises: default init and the setup recipe describe upstream integration shape.
    const setupRepo = path.join(root, "setup");
    await fs.mkdir(setupRepo);
    await git(setupRepo, "init", "-q");
    await configureFixtureGit(setupRepo);
    await attempt("bd init (default integrations)", setupRepo, ["init", "-q"]);
    const agentsPath = path.join(setupRepo, "AGENTS.md");
    // A missing or unreadable file gives the marker checks empty input.
    const readAgents = () => fs.readFile(agentsPath, "utf8").catch(() => "");
    const initAgents = await readAgents();
    check(
      /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:minimal\b[^>]*-->/.test(initAgents),
      "bd init writes the minimal AGENTS.md profile (a pointer to bd prime), the install premise",
    );
    const reassess =
      "REASSESS: upstream may now integrate OpenCode natively; review whether this plugin is still needed (docs/beads-artifact-policy.md).";
    const openCodeFiles = ["opencode.json", "opencode.jsonc", ".opencode"];
    const initOpenCode = (
      await Promise.all(openCodeFiles.map(async (file) => ((await fs.exists(path.join(setupRepo, file))) ? file : "")))
    ).filter(Boolean);
    check(
      initOpenCode.length === 0,
      `bd init writes no OpenCode integration files (${initOpenCode.join(", ") || "none"})`,
      reassess,
    );

    const before = await snapshot(setupRepo);
    await attempt("bd setup opencode", setupRepo, ["setup", "opencode"]);
    const after = await snapshot(setupRepo);
    const changed = [...new Set([...before.keys(), ...after.keys()])]
      .filter((file) => before.get(file) !== after.get(file))
      .sort();
    const changedFiles = changed.join(", ");
    check(
      changedFiles === "AGENTS.md",
      `bd setup opencode only edits AGENTS.md (changed: ${changedFiles || "nothing"})`,
      reassess,
    );
    const setupList = await attempt("bd setup --list", setupRepo, ["setup", "--list"]);
    const opencodeRecipe = setupList?.split("\n").find((line) => /^\s*opencode\b/.test(line)) ?? "";
    check(
      /AGENTS\.md/.test(opencodeRecipe),
      `bd setup --list still describes the opencode recipe as an AGENTS.md section ("${opencodeRecipe.trim()}")`,
      reassess,
    );

    // The blocks the plugin minimizes while prime is attached, for projects where setup was run anyway.
    const agentsFile = await readAgents();
    check(
      /<!-- BEGIN BEADS INTEGRATION\b[^>]*\bprofile:full\b[^>]*-->/.test(agentsFile) &&
        agentsFile.includes("<!-- END BEADS INTEGRATION -->"),
      "bd setup opencode writes a full-profile block with the expected markers",
    );
    const preserved = minimizeBeadsInstructions(agentsFile);
    check(
      preserved.replaced === 0 && preserved.text === agentsFile,
      "the plugin preserves managed instructions when their body is not supplied in context",
    );
    const minimized = minimizeBeadsInstructions(agentsFile, agentsFile);
    check(
      minimized.replaced > 0 && !minimized.text.includes("profile:full"),
      `the plugin replaces bd's duplicate AGENTS.md blocks (${minimized.replaced} block(s), ${agentsFile.length} -> ${minimized.text.length} chars)`,
    );

    // Native assumptions for the prime options used by the integration.
    const prime = await attempt("bd prime", repo, ["prime"]);
    check(prime?.trim(), "bd prime succeeds with workflow output");
    const stealthPrime = await attempt("bd prime --stealth", repo, ["prime", "--stealth"]);
    check(stealthPrime?.trim(), "bd prime --stealth succeeds (the stealth plugin option)");
    // Sample both modes before checking the full-output requirement and its MCP premise.
    const claudeSettings = path.join(process.env.HOME!, ".claude", "settings.json");
    await fs.mkdir(path.dirname(claudeSettings), { recursive: true });
    await fs.writeFile(claudeSettings, JSON.stringify({ mcpServers: { beads: { command: "beads-mcp" } } }));
    const mcpPrime = await attempt("bd prime (Claude MCP configured)", repo, ["prime"]);
    const fullPrime = await attempt("bd prime --full --stealth (Claude MCP configured)", repo, [
      "prime",
      "--full",
      "--stealth",
    ]);
    const workflowHeading = "## Essential Commands";
    check(
      fullPrime?.includes(workflowHeading),
      "bd prime --full --stealth keeps the CLI workflow when Claude Code has a Beads MCP server",
    );
    // REASSESS premise: the default MCP behavior motivates the explicit --full flag.
    check(
      mcpPrime !== undefined && !mcpPrime.includes(workflowHeading),
      "bd prime without --full still drops to MCP mode (the reason the plugin passes --full)",
      "REASSESS: bd may no longer read Claude Code's MCP settings; --full stays harmless.",
    );
    await fs.rm(path.dirname(claudeSettings), { recursive: true, force: true });
  }

  const initialFullPrime = await observeWorkspacePrerequisites();
  await checkIssuesAndDependencies(initialFullPrime);
  await checkMemories();
  await checkSetupAndPrime();

  if (failures.length > 0) {
    console.error(`\n${failures.length} bd contract check(s) failed.`);
    return 1;
  }
  console.log("\nbd contract satisfied.");
  return 0;
}

if (import.meta.main) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bd-contract-"));
  try {
    const home = path.join(root, "home");
    await fs.mkdir(home);
    // Bun.spawn inherits the startup environment. Start a fresh Bun process with
    // only the fixture configuration and selected runtime settings.
    const child = Bun.spawn(
      [
        process.execPath,
        "--no-env-file",
        "-e",
        `import { runContract } from ${JSON.stringify(import.meta.path)}; process.exitCode = await runContract(process.cwd());`,
      ],
      {
        cwd: root,
        env: {
          PATH: process.env.PATH,
          BEADS_ACTOR: process.env.BEADS_ACTOR,
          DO_NOT_TRACK: process.env.DO_NOT_TRACK,
          HOME: home,
          // Keep native temp files and sandbox path checks within the owned fixture.
          TMPDIR: root,
          XDG_CONFIG_HOME: path.join(home, ".config"),
          XDG_DATA_HOME: path.join(home, ".local/share"),
        },
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
    process.exitCode = await child.exited;
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
