import { readFile } from "node:fs/promises";

const roots = ["internal/templates/skills/beads/", "plugins/beads/"];
const shaPattern = /^[0-9a-f]{40}$/;
type SourceFetch = (url: string, init?: RequestInit) => Promise<Response>;
type RecordValue = Record<string, unknown>;
type SourceFile = { sha: string; mode: string };
type Change = {
  kind: "added" | "deleted" | "edited" | "renamed";
  path: string;
  previousPath?: string;
  before?: SourceFile;
  after?: SourceFile;
  beforeUrl?: string;
  afterUrl?: string;
};

/** Reject absent or malformed API/inventory records rather than supplying empty defaults. */
function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing or malformed record");
  return value as RecordValue;
}

function sha(value: unknown): string {
  if (typeof value !== "string" || !shaPattern.test(value)) throw new Error("Missing or malformed immutable Git SHA");
  return value;
}

function sourcePath(value: unknown): string {
  if (typeof value !== "string" || !value || value.split("/").some((p) => !p || p === "." || p === "..") || /[\x00-\x1f\\]/.test(value)) {
    throw new Error("Missing or malformed source path");
  }
  return value;
}

function underRoot(path: string): boolean {
  return roots.some((root) => path.startsWith(root));
}

/** Read only marketplace-main provenance; release inventory and local adaptation bytes are unrelated. */
function selection(inventory: unknown) {
  const main = record(record(inventory).marketplace_main);
  if (typeof main.repository !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(main.repository)) {
    throw new Error("Missing or malformed marketplace-main repository");
  }
  const commit = sha(main.commit);
  if (!Array.isArray(main.files) || main.files.length === 0) throw new Error("Missing marketplace-main file inventory");
  const expected = new Map<string, string>();
  for (const value of main.files) {
    const file = record(value);
    const path = sourcePath(file.path);
    if (expected.has(path)) throw new Error("Duplicate inventory path");
    expected.set(path, sha(file.git_blob));
  }
  for (const root of roots) {
    if (![...expected.keys()].some((path) => path.startsWith(root))) throw new Error("Inventory is missing a selected root");
  }
  const supportPaths = [...expected.keys()].filter((path) => !underRoot(path)).sort();
  return { repository: main.repository, commit, expected, supportPaths };
}

/** Require an explicitly complete recursive tree at the exact resolved tree identity. */
function selectedTree(value: unknown, treeSha: string, supportPaths: string[]): Map<string, SourceFile> {
  const tree = record(value);
  if (tree.sha !== treeSha || tree.truncated !== false || !Array.isArray(tree.tree)) {
    throw new Error("Tree identity, completeness or entries unavailable (possibly truncated)");
  }
  const seen = new Set<string>();
  const selected = new Map<string, SourceFile>();
  const modes: Record<string, string> = { "040000": "tree", "100644": "blob", "100755": "blob", "120000": "blob", "160000": "commit" };
  for (const value of tree.tree) {
    const entry = record(value);
    const path = sourcePath(entry.path);
    const id = sha(entry.sha);
    if (seen.has(path)) throw new Error("Duplicate tree path");
    seen.add(path);
    if (typeof entry.mode !== "string" || !modes[entry.mode] || modes[entry.mode] !== entry.type) {
      throw new Error("Missing or malformed tree entry type/mode");
    }
    if (underRoot(path) || supportPaths.includes(path)) {
      if (entry.type === "tree") continue;
      if (entry.type !== "blob") throw new Error("Selected source is not a blob");
      selected.set(path, { sha: id, mode: entry.mode });
    }
  }
  return selected;
}

/** Compare upstream membership and Git blob/mode facts; uniquely paired exact moves are renames. */
function compare(before: Map<string, SourceFile>, after: Map<string, SourceFile>): Change[] {
  const removed = [...before.keys()].filter((path) => !after.has(path)).sort();
  const added = [...after.keys()].filter((path) => !before.has(path)).sort();
  const same = (a: SourceFile, b: SourceFile) => a.sha === b.sha && a.mode === b.mode;
  const changes: Change[] = [];
  const renamed = new Set<string>();
  for (const path of removed) {
    const old = before.get(path)!;
    const matches = added.filter((next) => same(old, after.get(next)!));
    const uniqueOld = removed.filter((other) => same(old, before.get(other)!)).length === 1;
    const next = matches.length === 1 && uniqueOld ? matches[0] : undefined;
    if (next !== undefined) {
      renamed.add(next);
      changes.push({ kind: "renamed", path: next, previousPath: path, before: old, after: after.get(next)! });
    } else {
      changes.push({ kind: "deleted", path, before: old });
    }
  }
  for (const path of added) {
    if (!renamed.has(path)) changes.push({ kind: "added", path, after: after.get(path)! });
  }
  for (const [path, old] of before) {
    const next = after.get(path);
    if (next && !same(old, next)) changes.push({ kind: "edited", path, before: old, after: next });
  }
  return changes.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

/** Collect informational MAIN source evidence. Exit 2 means collection unavailable, never incompatibility. */
export async function runSourceCheck(
  inventory: unknown,
  fetchSource: SourceFetch = (url, init) => fetch(url, init)
): Promise<{ exitCode: 0 | 2; stdout: string }> {
  const context: Record<string, unknown> = { channel: "development-source" };
  try {
    const scope = selection(inventory);
    const web = `https://github.com/${scope.repository}`;
    const api = `https://api.github.com/repos/${scope.repository}`;
    context.repository = scope.repository;
    context.baselineCommit = scope.commit;
    context.baselineUrl = `${web}/tree/${scope.commit}`;
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const get = async (path: string): Promise<unknown> => {
      let response: Response;
      try {
        response = await fetchSource(`${api}${path}`, { headers, signal: AbortSignal.timeout(20_000), redirect: "error" });
      } catch {
        // Do not print transport errors, which may contain credentials or arbitrary remote text.
        throw new Error(`GitHub retrieval unavailable: ${path}`);
      }
      if (!response.ok) throw new Error(`GitHub retrieval unavailable: ${path} (HTTP ${response.status})`);
      try {
        return await response.json();
      } catch {
        throw new Error(`GitHub response is not valid JSON: ${path}`);
      }
    };
    const repo = record(await get(""));
    if (typeof repo.default_branch !== "string" || !repo.default_branch.trim()) throw new Error("Missing default branch");
    const branch = repo.default_branch;
    const candidate = record(await get(`/commits/${encodeURIComponent(branch)}`));
    const candidateCommit = sha(candidate.sha);
    const candidateTree = sha(record(record(candidate.commit).tree).sha);
    context.defaultBranch = branch;
    context.candidateCommit = candidateCommit;
    context.candidateUrl = `${web}/tree/${candidateCommit}`;
    context.reviewUrl = `${web}/compare/${scope.commit}..${candidateCommit}`;
    const baseline = candidateCommit === scope.commit ? candidate : record(await get(`/commits/${scope.commit}`));
    if (baseline.sha !== scope.commit) throw new Error("Baseline commit identity mismatch");
    const baselineTree = sha(record(record(baseline.commit).tree).sha);
    const before = selectedTree(await get(`/git/trees/${baselineTree}?recursive=1`), baselineTree, scope.supportPaths);
    // The reviewed inventory proves the baseline retrieval contains the entire selected membership.
    if (before.size !== scope.expected.size || [...scope.expected].some(([path, blob]) => before.get(path)?.sha !== blob)) {
      throw new Error("Baseline selected tree does not match reviewed inventory");
    }
    const after = baselineTree === candidateTree ? before
      : selectedTree(await get(`/git/trees/${candidateTree}?recursive=1`), candidateTree, scope.supportPaths);
    const sourceUrl = (commit: string, path: string) => `${web}/blob/${commit}/${path.split("/").map(encodeURIComponent).join("/")}`;
    const changes = compare(before, after).map((change) => ({
      ...change,
      ...(change.before ? { beforeUrl: sourceUrl(scope.commit, change.previousPath ?? change.path) } : {}),
      ...(change.after ? { afterUrl: sourceUrl(candidateCommit, change.path) } : {}),
    }));
    return {
      exitCode: 0,
      stdout: JSON.stringify({
        kind: "completed", level: "info", ...context,
        status: changes.length ? "changed" : "unchanged",
        summary: "Completed MAIN comparison: development-source information only; tagged CLI support remains independent.",
        scope: { roots, supportPaths: scope.supportPaths },
        selectedFiles: { baseline: before.size, candidate: after.size }, changes,
      }, null, 2),
    };
  } catch (error) {
    return { exitCode: 2, stdout: JSON.stringify({
      kind: "unavailable", ...context,
      error: error instanceof Error ? error.message : "Source comparison unavailable",
    }, null, 2) };
  }
}

if (import.meta.main) {
  let result: { exitCode: 0 | 2; stdout: string };
  try {
    if (process.argv.length !== 2) throw new Error("Usage: bun scripts/check-beads-integration.ts (no baseline advancement option)");
    const inventory = JSON.parse(await readFile(new URL("../docs/claude-code-integration-inventory.json", import.meta.url), "utf8"));
    result = await runSourceCheck(inventory);
  } catch {
    result = { exitCode: 2, stdout: JSON.stringify({ kind: "unavailable", channel: "development-source", error: "Unable to load inventory or invalid arguments; use bun scripts/check-beads-integration.ts without arguments" }, null, 2) };
  }
  console.log(result.stdout);
  process.exitCode = result.exitCode;
}
