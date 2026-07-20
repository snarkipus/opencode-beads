import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import {
  beadsSkillLocations,
  inspectBeadsSkillLocations,
  type ManagedSkillState,
  type SkillLocation,
} from "./skill-collision-policy";

export const OWNERSHIP_MANIFEST = ".opencode-beads-manifest.json";
const OWNER = "opencode-beads";
const PAYLOAD_PATHS = [
  "SKILL.md",
  "references/DEPENDENCIES.md",
  "references/ISSUE_CREATION.md",
  "references/RESUMABILITY.md",
] as const;

export type InitCommand = "check" | "init" | "remove" | "update";
export type InitState = "conflicting" | "current" | "missing" | "modified" | "stale";
export type InitScope = "global" | "project";

interface ArtifactFile {
  path: string;
  bytes: number;
  sha256: string;
}

interface ArtifactSource {
  source: string;
  sourceSha256: string;
  target: string;
}

const ARTIFACT_SOURCES: ArtifactSource[] = [
  {
    source: "plugins/beads/skills/beads/SKILL.md",
    sourceSha256: "01555fe65d19be401d820d9dec029cd048fb0791d433b4b575374477d6f1d827",
    target: "SKILL.md",
  },
  {
    source: "plugins/beads/skills/beads/resources/DEPENDENCIES.md",
    sourceSha256: "9c3327611bfbdc47124736dd0cc928bfeff1c135d4ae79d4ea46cba1900df335",
    target: "references/DEPENDENCIES.md",
  },
  {
    source: "plugins/beads/skills/beads/resources/ISSUE_CREATION.md",
    sourceSha256: "ff465ed1fb13fbb6c42b42ec15c1bd8fd677c4661237e4fc1675c179f7fca460",
    target: "references/ISSUE_CREATION.md",
  },
  {
    source: "plugins/beads/skills/beads/resources/RESUMABILITY.md",
    sourceSha256: "8a7db4e967ace1b4f60dc85e3fb2d02f70749a18056fe90c61b2685bb172d7df",
    target: "references/RESUMABILITY.md",
  },
];

interface ArtifactManifest {
  schemaVersion: 1;
  owner: typeof OWNER;
  upstream: { repository: string; tag: string; commit: string };
  adaptationRevision: number;
  sources: ArtifactSource[];
  files: ArtifactFile[];
}

export interface InitMutationFileSystem {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined | void>;
  mkdtemp(prefix: string): Promise<string>;
  rmdir(path: string): Promise<void>;
  writeFile(
    path: string,
    data: string | Uint8Array,
    options?: { flag?: "w" | "wx" }
  ): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  cp(
    source: string,
    destination: string,
    options: { recursive: true; errorOnExist: true; force: false }
  ): Promise<void>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
}

interface OwnershipManifest {
  schemaVersion: 1;
  owner: typeof OWNER;
  packageVersion: string;
  upstream: { tag: string; commit: string };
  adaptationRevision: number;
  scope: InitScope;
  target: string;
  files: Array<Pick<ArtifactFile, "path" | "sha256">>;
}

export interface InitInputs {
  cwd: string;
  worktree: string;
  home: string;
  packageRoot: string;
  packageVersion: string;
  scope?: InitScope;
  dryRun?: boolean;
  /** Test seam for mutation failures; reads always use the real filesystem. */
  mutationFileSystem?: InitMutationFileSystem;
}

export type InitPlanOperation = {
  action: "mkdir" | "remove" | "rmdir" | "write-manifest" | "write-payload";
  path: string;
};

export interface InitResult {
  command: InitCommand;
  scope: InitScope;
  target: string;
  state: InitState;
  ok: boolean;
  changed: boolean;
  dryRun: boolean;
  plan: InitPlanOperation[];
  collisions: string[];
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function validRelativePath(path: string): boolean {
  return path.length > 0 && !path.startsWith("/") && !path.split(/[\\/]/).includes("..");
}

function sha256(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(path, "utf8"));
}

function parseArtifactManifest(value: unknown): ArtifactManifest {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["schemaVersion", "owner", "upstream", "adaptationRevision", "sources", "files"]) ||
    value.schemaVersion !== 1 ||
    value.owner !== OWNER ||
    typeof value.adaptationRevision !== "number" ||
    !Number.isInteger(value.adaptationRevision) ||
    !isRecord(value.upstream) ||
    !exactKeys(value.upstream, ["repository", "tag", "commit"]) ||
    typeof value.upstream.repository !== "string" ||
    typeof value.upstream.tag !== "string" ||
    typeof value.upstream.commit !== "string" ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.files)
  ) {
    throw new Error("invalid packaged manifest schema");
  }
  if (
    value.upstream.repository !== "https://github.com/gastownhall/beads.git" ||
    value.upstream.tag !== "v1.0.5" ||
    value.upstream.commit !== "6a3f515ced18406c189c55fff789a4925bfaa35c" ||
    value.adaptationRevision !== 1
  ) {
    throw new Error("packaged manifest provenance is not the reviewed adaptation");
  }

  const sources = value.sources.map((source, index): ArtifactSource => {
    if (
      !isRecord(source) ||
      !exactKeys(source, ["source", "sourceSha256", "target"]) ||
      typeof source.source !== "string" ||
      typeof source.sourceSha256 !== "string" ||
      typeof source.target !== "string"
    ) {
      throw new Error(`invalid packaged manifest source ${index}`);
    }
    return {
      source: source.source,
      sourceSha256: source.sourceSha256,
      target: source.target,
    };
  });
  if (JSON.stringify(sources) !== JSON.stringify(ARTIFACT_SOURCES)) {
    throw new Error("packaged manifest must contain the fixed sorted source mappings");
  }

  const files = value.files.map((file, index): ArtifactFile => {
    if (
      !isRecord(file) ||
      !exactKeys(file, ["path", "bytes", "sha256"]) ||
      typeof file.path !== "string" ||
      !validRelativePath(file.path) ||
      typeof file.bytes !== "number" ||
      !Number.isInteger(file.bytes) ||
      file.bytes < 0 ||
      typeof file.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    ) {
      throw new Error(`invalid packaged manifest file ${index}`);
    }
    return { path: file.path, bytes: file.bytes, sha256: file.sha256 };
  });
  const paths = files.map((file) => file.path);
  if (
    paths.join("\0") !== [...paths].sort().join("\0") ||
    paths.join("\0") !== PAYLOAD_PATHS.join("\0")
  ) {
    throw new Error("packaged manifest must contain the fixed sorted payload inventory");
  }
  return {
    schemaVersion: 1,
    owner: OWNER,
    upstream: {
      repository: value.upstream.repository,
      tag: value.upstream.tag,
      commit: value.upstream.commit,
    },
    adaptationRevision: value.adaptationRevision,
    sources,
    files,
  };
}

function parseOwnershipManifest(value: unknown): OwnershipManifest | undefined {
  if (!isRecord(value) || value.owner !== OWNER) return undefined;
  if (
    !exactKeys(value, [
      "schemaVersion",
      "owner",
      "packageVersion",
      "upstream",
      "adaptationRevision",
      "scope",
      "target",
      "files",
    ]) ||
    value.schemaVersion !== 1 ||
    typeof value.packageVersion !== "string" ||
    value.packageVersion.length === 0 ||
    !isRecord(value.upstream) ||
    !exactKeys(value.upstream, ["tag", "commit"]) ||
    typeof value.upstream.tag !== "string" ||
    value.upstream.tag.length === 0 ||
    typeof value.upstream.commit !== "string" ||
    value.upstream.commit.length === 0 ||
    typeof value.adaptationRevision !== "number" ||
    !Number.isInteger(value.adaptationRevision) ||
    value.adaptationRevision < 1 ||
    (value.scope !== "project" && value.scope !== "global") ||
    typeof value.target !== "string" ||
    !Array.isArray(value.files)
  ) {
    return undefined;
  }
  const files: OwnershipManifest["files"] = [];
  for (const file of value.files) {
    if (
      !isRecord(file) ||
      !exactKeys(file, ["path", "sha256"]) ||
      typeof file.path !== "string" ||
      !validRelativePath(file.path) ||
      file.path === OWNERSHIP_MANIFEST ||
      typeof file.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    ) {
      return undefined;
    }
    files.push({ path: file.path, sha256: file.sha256 });
  }
  const paths = files.map((file) => file.path);
  if (new Set(paths).size !== paths.length || paths.join("\0") !== [...paths].sort().join("\0")) {
    return undefined;
  }
  return {
    schemaVersion: 1,
    owner: OWNER,
    packageVersion: value.packageVersion,
    upstream: { tag: value.upstream.tag, commit: value.upstream.commit },
    adaptationRevision: value.adaptationRevision,
    scope: value.scope,
    target: value.target,
    files,
  };
}

async function listTree(root: string): Promise<{ files: string[]; symlink: boolean }> {
  const files: string[] = [];
  let symlink = false;
  async function visit(directory: string): Promise<void> {
    const entries = await fs.readdir(join(root, directory), { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        symlink = true;
        files.push(path);
      } else if (entry.isDirectory()) {
        await visit(path);
      } else {
        files.push(path);
      }
    }
  }
  await visit("");
  return { files: files.sort(), symlink };
}

async function loadArtifacts(packageRoot: string): Promise<{
  manifest: ArtifactManifest;
  contents: Map<string, Uint8Array>;
}> {
  const initRoot = join(packageRoot, "dist", "init");
  let manifest: ArtifactManifest;
  try {
    manifest = parseArtifactManifest(await readJson(join(initRoot, "manifest.json")));
  } catch (error) {
    throw new Error(`Invalid packaged artifact manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
  const contents = new Map<string, Uint8Array>();
  for (const file of manifest.files) {
    const path = join(initRoot, "artifacts", "beads", file.path);
    const stats = await fs.lstat(path).catch(() => undefined);
    if (!stats?.isFile() || stats.isSymbolicLink()) {
      throw new Error(`Invalid packaged artifact ${file.path}: missing, symlinked, or not a file`);
    }
    const content = await fs.readFile(path);
    if (content.byteLength !== file.bytes || sha256(content) !== file.sha256) {
      throw new Error(`Invalid packaged artifact ${file.path}: size or checksum mismatch`);
    }
    contents.set(file.path, content);
  }
  const tree = await listTree(join(initRoot, "artifacts", "beads"));
  if (tree.symlink || tree.files.join("\0") !== manifest.files.map((file) => file.path).join("\0")) {
    throw new Error("Invalid packaged artifacts: inventory differs from manifest");
  }
  return { manifest, contents };
}

function expectedOwnership(
  artifact: ArtifactManifest,
  packageVersion: string,
  scope: InitScope,
  target: string
): OwnershipManifest {
  return {
    schemaVersion: 1,
    owner: OWNER,
    packageVersion,
    upstream: { tag: artifact.upstream.tag, commit: artifact.upstream.commit },
    adaptationRevision: artifact.adaptationRevision,
    scope,
    target,
    files: artifact.files.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
  };
}

async function inspectTarget(
  target: string,
  scope: InitScope,
  expected: OwnershipManifest
): Promise<{ state: InitState; ownership?: OwnershipManifest }> {
  let stats;
  try {
    stats = await fs.lstat(target);
  } catch (error) {
    if (isMissing(error)) return { state: "missing" };
    return { state: "conflicting" };
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) return { state: "conflicting" };

  const manifestPath = join(target, OWNERSHIP_MANIFEST);
  const manifestStats = await fs.lstat(manifestPath).catch(() => undefined);
  if (!manifestStats?.isFile() || manifestStats.isSymbolicLink()) return { state: "conflicting" };
  let ownership: OwnershipManifest | undefined;
  try {
    ownership = parseOwnershipManifest(await readJson(manifestPath));
  } catch {
    return { state: "conflicting" };
  }
  if (!ownership || resolve(ownership.target) !== target || ownership.scope !== scope) {
    return { state: "conflicting" };
  }

  const tree = await listTree(target);
  const expectedFiles = [...ownership.files.map((file) => file.path), OWNERSHIP_MANIFEST].sort();
  if (tree.symlink || tree.files.join("\0") !== expectedFiles.join("\0")) {
    return { state: "modified", ownership };
  }
  for (const file of ownership.files) {
    const content = await fs.readFile(join(target, file.path)).catch(() => undefined);
    if (!content || sha256(content) !== file.sha256) return { state: "modified", ownership };
  }
  const metadataMatches =
    ownership.packageVersion === expected.packageVersion &&
    ownership.upstream.tag === expected.upstream.tag &&
    ownership.upstream.commit === expected.upstream.commit &&
    ownership.adaptationRevision === expected.adaptationRevision &&
    ownership.scope === expected.scope &&
    ownership.target === expected.target &&
    JSON.stringify(ownership.files) === JSON.stringify(expected.files);
  return metadataMatches
    ? { state: "current", ownership }
    : { state: "stale", ownership };
}

function targetFor(inputs: InitInputs, scope: InitScope): string {
  return scope === "global"
    ? resolve(inputs.home, ".config", "opencode", "skills", "beads")
    : resolve(inputs.worktree, ".opencode", "skills", "beads");
}

async function assertNoTargetSymlink(target: string, boundary: string): Promise<void> {
  const parts = relative(resolve(boundary), target).split(sep).filter(Boolean);
  let current = resolve(boundary);
  for (const part of parts) {
    current = join(current, part);
    const stats = await fs.lstat(current).catch((error) => {
      if (isMissing(error)) return undefined;
      throw error;
    });
    if (stats?.isSymbolicLink()) throw new Error(`Refusing symlink in target path: ${current}`);
  }
}

function refusal(command: InitCommand, state: InitState): string | undefined {
  if (command === "check") return undefined;

  const isManagedState = state === "current" || state === "stale";
  if (command === "init") {
    return state === "modified" || state === "conflicting"
      ? `Refusing to initialize ${state} skill`
      : undefined;
  }
  if (command === "update") {
    return isManagedState ? undefined : `Refusing to update ${state} skill`;
  }
  return isManagedState ? undefined : `Refusing to remove ${state} skill`;
}

async function installPlan(target: string, old: OwnershipManifest | undefined, expected: OwnershipManifest): Promise<InitPlanOperation[]> {
  const operations: InitPlanOperation[] = [];
  const targetStats = await fs.lstat(target).catch(() => undefined);
  const references = join(target, "references");
  const referenceStats = await fs.lstat(references).catch(() => undefined);
  if (!targetStats) operations.push({ action: "mkdir", path: target });
  if (!referenceStats) operations.push({ action: "mkdir", path: references });
  const expectedPaths = new Set(expected.files.map((file) => file.path));
  for (const path of old?.files.map((file) => file.path).filter((path) => !expectedPaths.has(path)).sort() ?? []) {
    operations.push({ action: "remove", path: join(target, path) });
  }
  const expectedDirectories = new Set(expected.files.map((file) => dirname(file.path)).filter((path) => path !== "."));
  const obsoleteDirectories = new Set<string>();
  for (const file of old?.files ?? []) {
    for (let directory = dirname(file.path); directory !== "."; directory = dirname(directory)) {
      if (!expectedDirectories.has(directory)) obsoleteDirectories.add(directory);
    }
  }
  for (const directory of [...obsoleteDirectories].sort().reverse()) {
    operations.push({ action: "rmdir", path: join(target, directory) });
  }
  for (const file of expected.files) operations.push({ action: "write-payload", path: join(target, file.path) });
  operations.push({ action: "write-manifest", path: join(target, OWNERSHIP_MANIFEST) });
  return operations;
}

function removePlan(target: string, ownership: OwnershipManifest): InitPlanOperation[] {
  const directories = new Set<string>();
  for (const file of ownership.files) {
    for (let directory = dirname(file.path); directory !== "."; directory = dirname(directory)) {
      directories.add(directory);
    }
  }
  return [
    ...ownership.files.map((file) => ({ action: "remove" as const, path: join(target, file.path) })),
    { action: "remove", path: join(target, OWNERSHIP_MANIFEST) },
    ...[...directories]
      .sort((left, right) => right.split("/").length - left.split("/").length || left.localeCompare(right))
      .map((directory) => ({ action: "rmdir" as const, path: join(target, directory) })),
    { action: "rmdir", path: target },
  ];
}

function transactionPrefix(target: string, kind: "backup" | "recovery" | "stage"): string {
  return `.${basename(target)}.opencode-beads-${kind}-`;
}

async function staleTransactions(target: string): Promise<string[]> {
  const parent = dirname(target);
  const entries = await fs.readdir(parent).catch((error) => {
    if (isMissing(error)) return [];
    throw error;
  });
  const prefixes = (["backup", "recovery", "stage"] as const).map((kind) => transactionPrefix(target, kind));
  return entries
    .filter((entry) => prefixes.some((prefix) => entry.startsWith(prefix)))
    .sort()
    .map((entry) => join(parent, entry));
}

async function cleanup(mutationFs: InitMutationFileSystem, path: string): Promise<void> {
  await mutationFs.rm(path, { recursive: true, force: true }).catch(() => undefined);
}

async function buildStage(
  contents: Map<string, Uint8Array>,
  ownership: OwnershipManifest,
  target: string,
  mutationFs: InitMutationFileSystem
): Promise<string> {
  await mutationFs.mkdir(dirname(target), { recursive: true });
  const stage = await mutationFs.mkdtemp(join(dirname(target), transactionPrefix(target, "stage")));
  try {
    for (const file of ownership.files) {
      const content = contents.get(file.path);
      if (!content) throw new Error(`Missing planned payload for ${file.path}`);
      await mutationFs.mkdir(dirname(join(stage, file.path)), { recursive: true });
      await mutationFs.writeFile(join(stage, file.path), content, { flag: "wx" });
    }
    await mutationFs.writeFile(
      join(stage, OWNERSHIP_MANIFEST),
      `${JSON.stringify(ownership, null, 2)}\n`,
      { flag: "wx" }
    );
    return stage;
  } catch (error) {
    await cleanup(mutationFs, stage);
    throw error;
  }
}

async function installTransaction(
  target: string,
  targetExists: boolean,
  contents: Map<string, Uint8Array>,
  ownership: OwnershipManifest,
  mutationFs: InitMutationFileSystem
): Promise<void> {
  const stage = await buildStage(contents, ownership, target, mutationFs);
  if (!targetExists) {
    try {
      await mutationFs.rename(stage, target);
    } catch (error) {
      await cleanup(mutationFs, stage);
      throw error;
    }
    return;
  }

  let backup: string | undefined;
  let recovery: string | undefined;
  let moved = false;
  try {
    backup = await mutationFs.mkdtemp(join(dirname(target), transactionPrefix(target, "backup")));
    recovery = await mutationFs.mkdtemp(join(dirname(target), transactionPrefix(target, "recovery")));
    await mutationFs.rmdir(backup);
    await mutationFs.rmdir(recovery);
    await mutationFs.rename(target, backup);
    moved = true;
    await mutationFs.cp(backup, recovery, { recursive: true, errorOnExist: true, force: false });
    await mutationFs.rename(stage, target);
    try {
      await mutationFs.rm(backup, { recursive: true });
    } catch (error) {
      await mutationFs.rename(target, stage);
      await mutationFs.rename(recovery, target);
      await cleanup(mutationFs, stage);
      await cleanup(mutationFs, backup);
      throw error;
    }
    await cleanup(mutationFs, recovery);
  } catch (error) {
    if (moved && !(await fs.exists(target))) {
      const restore = backup && (await fs.exists(backup)) ? backup : recovery;
      if (restore && (await fs.exists(restore))) await mutationFs.rename(restore, target);
    }
    await cleanup(mutationFs, stage);
    if (backup) await cleanup(mutationFs, backup);
    if (recovery) await cleanup(mutationFs, recovery);
    throw error;
  }
}

async function removeTransaction(target: string, mutationFs: InitMutationFileSystem): Promise<void> {
  let backup: string | undefined;
  let recovery: string | undefined;
  let moved = false;
  try {
    backup = await mutationFs.mkdtemp(join(dirname(target), transactionPrefix(target, "backup")));
    recovery = await mutationFs.mkdtemp(join(dirname(target), transactionPrefix(target, "recovery")));
    await mutationFs.rmdir(backup);
    await mutationFs.rmdir(recovery);
    await mutationFs.rename(target, backup);
    moved = true;
    await mutationFs.cp(backup, recovery, { recursive: true, errorOnExist: true, force: false });
    await mutationFs.rm(backup, { recursive: true });
    await cleanup(mutationFs, recovery);
  } catch (error) {
    if (moved && !(await fs.exists(target))) {
      const restore = recovery && (await fs.exists(recovery)) ? recovery : backup;
      if (restore && (await fs.exists(restore))) await mutationFs.rename(restore, target);
    }
    if (backup) await cleanup(mutationFs, backup);
    if (recovery) await cleanup(mutationFs, recovery);
    throw error;
  }
}

/** Validate, inspect, plan, and optionally execute one managed-skill lifecycle command. */
export async function runInitCommand(command: InitCommand, inputs: InitInputs): Promise<InitResult> {
  const scope = inputs.scope ?? "project";
  const cwd = resolve(inputs.cwd);
  const worktree = resolve(inputs.worktree);
  const home = resolve(inputs.home);
  const target = targetFor({ ...inputs, worktree, home }, scope);
  // This call validates cwd containment even when no collision locations exist.
  beadsSkillLocations(cwd, worktree, home);
  const { manifest: artifact, contents } = await loadArtifacts(resolve(inputs.packageRoot));
  const expected = expectedOwnership(artifact, inputs.packageVersion, scope, target);
  await assertNoTargetSymlink(target, scope === "global" ? home : worktree);
  const transactions = await staleTransactions(target);
  const targetInspection = await inspectTarget(target, scope, expected);

  const inspections = await inspectBeadsSkillLocations(
    cwd,
    worktree,
    home,
    async (location: SkillLocation): Promise<ManagedSkillState | "differently-managed" | undefined> => {
      const locationScope = location.scope;
      const locationExpected = expectedOwnership(artifact, inputs.packageVersion, locationScope, resolve(location.path));
      const inspection = await inspectTarget(resolve(location.path), locationScope, locationExpected);
      if (inspection.state === "current" || inspection.state === "stale" || inspection.state === "modified") return inspection.state;
      if (inspection.state === "conflicting") return "differently-managed";
      return undefined;
    }
  );
  const collisions = [
    ...transactions,
    ...inspections
      .filter((inspection) => resolve(inspection.path) !== target && inspection.state !== "absent")
      .map((inspection) => resolve(inspection.path)),
  ].sort();
  const state: InitState = collisions.length > 0 ? "conflicting" : targetInspection.state;
  const error = refusal(command, state);
  const canMutate = error === undefined;
  const shouldInstall =
    canMutate &&
    ((command === "init" && (state === "missing" || state === "stale")) ||
      (command === "update" && state === "stale"));
  const shouldRemove = canMutate && command === "remove";

  let plan: InitPlanOperation[] = [];
  if (shouldInstall) {
    plan = await installPlan(target, targetInspection.ownership, expected);
  } else if (shouldRemove && targetInspection.ownership) {
    plan = removePlan(target, targetInspection.ownership);
  }
  const changed = plan.length > 0;
  if (canMutate && changed && !inputs.dryRun) {
    const mutationFs = inputs.mutationFileSystem ?? fs;
    if (shouldInstall) {
      await installTransaction(target, targetInspection.state !== "missing", contents, expected, mutationFs);
    } else {
      await removeTransaction(target, mutationFs);
    }
  }
  return {
    command,
    scope,
    target,
    state,
    ok: error === undefined,
    changed,
    dryRun: inputs.dryRun ?? false,
    plan,
    collisions,
    ...(error ? { error } : {}),
  };
}
