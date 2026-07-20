import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const VENDOR_MANIFEST = "manifest.json";
export const VENDOR_SOURCES = Object.freeze([
  {
    source: "plugins/beads/agents/task-agent.md",
    target: "agents/task-agent.md",
  },
  {
    source: "plugins/beads/skills/beads/commands",
    target: "commands",
  },
]);

interface Semver {
  major: bigint;
  minor: bigint;
  patch: bigint;
}

export interface VendorFileRecord {
  path: string;
  bytes: number;
  sha256: string;
}

export interface VendorManifest {
  schemaVersion: 1;
  repository: string;
  tag: string;
  commit: string;
  sources: typeof VENDOR_SOURCES;
  files: VendorFileRecord[];
}

export interface ExpectedVendorProvenance {
  repository: string;
  tag: string;
  commit: string;
}

export interface VendorRelease {
  tag: string;
  commit: string;
}

function parseStableTag(tag: string): Semver | undefined {
  const match = tag.match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  if (!match) return undefined;

  const [, major, minor, patch] = match;
  if (major === undefined || minor === undefined || patch === undefined) return undefined;
  return { major: BigInt(major), minor: BigInt(minor), patch: BigInt(patch) };
}

function compareSemver(left: Semver, right: Semver): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (left[key] < right[key]) return -1;
    if (left[key] > right[key]) return 1;
  }
  return 0;
}

/** Select the newest stable semver release from git ls-remote output. */
export function selectStableRelease(lsRemoteOutput: string): VendorRelease {
  const releases = new Map<
    string,
    { tagCommit?: string; peeledCommit?: string; version: Semver }
  >();

  for (const line of lsRemoteOutput.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = line.match(/^([0-9a-fA-F]{40})\s+refs\/tags\/([^\s^]+)(\^\{\})?$/);
    const commit = match?.[1]?.toLowerCase();
    const tag = match?.[2];
    const version = tag ? parseStableTag(tag) : undefined;
    if (!commit || !tag || !version) continue;

    const release = releases.get(tag) ?? { version };
    const existingCommit = match[3] ? release.peeledCommit : release.tagCommit;
    if (releases.has(tag) && existingCommit && existingCommit !== commit) {
      throw new Error(`Conflicting commits for vendor tag: ${tag}`);
    }
    if (match[3]) release.peeledCommit = commit;
    else release.tagCommit = commit;
    releases.set(tag, release);
  }

  const candidates = [...releases].flatMap(([tag, release]) => {
    const commit = release.peeledCommit ?? release.tagCommit;
    return commit ? [{ tag, commit, version: release.version }] : [];
  });
  candidates.sort(
    (left, right) =>
      compareSemver(right.version, left.version) ||
      (left.tag < right.tag ? -1 : left.tag > right.tag ? 1 : 0)
  );
  const selected = candidates[0];
  if (!selected) throw new Error("No stable semver Beads tags found");
  return { tag: selected.tag, commit: selected.commit };
}

/** Select the newest stable semver tag from git ls-remote output. */
export function selectStableTag(lsRemoteOutput: string): string {
  return selectStableRelease(lsRemoteOutput).tag;
}

async function listVendorFiles(vendorDir: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(relativeDir: string): Promise<void> {
    const entries = await fs.readdir(path.join(vendorDir, relativeDir), { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDir, entry.name);
      if (entry.isDirectory()) await visit(relativePath);
      else if (entry.isFile()) files.push(relativePath);
      else throw new Error(`Unsupported vendor entry: ${relativePath}`);
    }
  }

  await visit("agents");
  await visit("commands");
  return files.sort();
}

async function fileRecord(vendorDir: string, relativePath: string): Promise<VendorFileRecord> {
  const content = await fs.readFile(path.join(vendorDir, relativePath));
  return {
    path: relativePath,
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

/** Build deterministic provenance for a validated vendor candidate. */
export async function createVendorManifest(
  vendorDir: string,
  repository: string,
  tag: string,
  commit: string
): Promise<VendorManifest> {
  if (!repository) throw new Error("Vendor repository is required");
  if (!parseStableTag(tag)) throw new Error(`Vendor tag is not stable semver: ${tag}`);
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`Invalid vendor commit SHA: ${commit}`);

  const files = await listVendorFiles(vendorDir);
  if (files.length === 0) throw new Error("Vendor inventory is empty");

  return {
    schemaVersion: 1,
    repository,
    tag,
    commit,
    sources: VENDOR_SOURCES,
    files: await Promise.all(files.map((relativePath) => fileRecord(vendorDir, relativePath))),
  };
}

export function serializeVendorManifest(manifest: VendorManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function parseManifest(content: string): VendorManifest {
  const parsed: unknown = JSON.parse(content);
  if (!isRecord(parsed)) {
    throw new Error("Vendor manifest must be an object");
  }
  const values = parsed;
  if (!hasExactKeys(values, ["schemaVersion", "repository", "tag", "commit", "sources", "files"])) {
    throw new Error("Vendor manifest has unexpected or missing fields");
  }
  if (values.schemaVersion !== 1) throw new Error("Unsupported vendor manifest schema");
  if (typeof values.repository !== "string" || !values.repository) throw new Error("Missing vendor repository");
  if (typeof values.tag !== "string" || !parseStableTag(values.tag)) throw new Error("Invalid vendor tag");
  if (typeof values.commit !== "string" || !/^[0-9a-f]{40}$/.test(values.commit)) throw new Error("Invalid vendor commit");
  if (JSON.stringify(values.sources) !== JSON.stringify(VENDOR_SOURCES)) throw new Error("Vendor source paths differ from the expected inventory");
  if (!Array.isArray(values.files) || values.files.length === 0) {
    throw new Error("Missing vendor file inventory");
  }

  const files = values.files.map((value): VendorFileRecord => {
    if (!isRecord(value)) {
      throw new Error("Invalid vendor file record");
    }
    const record = value;
    if (!hasExactKeys(record, ["path", "bytes", "sha256"])) {
      throw new Error("Vendor file record has unexpected or missing fields");
    }
    if (typeof record.path !== "string" || !record.path) throw new Error("Invalid vendor file path");
    if (typeof record.bytes !== "number" || !Number.isSafeInteger(record.bytes) || record.bytes < 0) throw new Error("Invalid vendor file size");
    if (typeof record.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(record.sha256)) throw new Error("Invalid vendor file checksum");
    return { path: record.path, bytes: record.bytes, sha256: record.sha256 };
  });

  return {
    schemaVersion: 1,
    repository: values.repository,
    tag: values.tag,
    commit: values.commit,
    sources: VENDOR_SOURCES,
    files,
  };
}

/** Validate manifest inventory and checksums against files on disk. */
export async function validateVendorManifest(
  vendorDir: string,
  expected?: ExpectedVendorProvenance
): Promise<VendorManifest> {
  const manifest = parseManifest(
    await fs.readFile(path.join(vendorDir, VENDOR_MANIFEST), "utf-8")
  );
  if (
    expected &&
    (manifest.repository !== expected.repository ||
      manifest.tag !== expected.tag ||
      manifest.commit !== expected.commit)
  ) {
    throw new Error("Vendor release provenance differs from the resolved upstream release");
  }
  const actualPaths = await listVendorFiles(vendorDir);
  const manifestPaths = manifest.files.map((file) => file.path);
  if (JSON.stringify(manifestPaths) !== JSON.stringify([...manifestPaths].sort())) {
    throw new Error("Vendor manifest inventory is not sorted");
  }
  if (JSON.stringify(manifestPaths) !== JSON.stringify(actualPaths)) {
    throw new Error("Vendor file inventory differs from the manifest");
  }

  for (const expected of manifest.files) {
    const actual = await fileRecord(vendorDir, expected.path);
    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
      throw new Error(`Vendor checksum mismatch: ${expected.path}`);
    }
  }

  return manifest;
}
