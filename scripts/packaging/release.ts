import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface PackageManifest {
  name?: unknown;
  version?: unknown;
  type?: unknown;
  main?: unknown;
  types?: unknown;
  exports?: unknown;
  files?: unknown;
  peerDependencies?: unknown;
  peerDependenciesMeta?: unknown;
  repository?: unknown;
  homepage?: unknown;
  bugs?: unknown;
  publishConfig?: unknown;
}

/** Absolute archive path and lowercase hexadecimal SHA-256 of its bytes. */
export interface ReleaseArchive {
  path: string;
  sha256: string;
}

/**
 * Format a workflow output as an explicit local path for npm, using forward slashes.
 * @param projectDirectory Base directory for the relative output.
 * @param archivePath Path to the archive.
 */
export function releaseOutputPath(projectDirectory: string, archivePath: string): string {
  const relative = path.relative(projectDirectory, archivePath).split(path.sep).join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * List non-directory entries as sorted, slash-separated paths relative to the root.
 * @param root Inventory base directory.
 * @param directory Subdirectory relative to the root for this recursion step.
 */
async function filesBelow(root: string, directory = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    const relativePath = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await filesBelow(root, relativePath)));
    else files.push(relativePath);
  }
  return files.sort();
}

/**
 * Return stdout on success or throw with stderr (or the exit code) on command failure.
 * @param command Executable and arguments passed directly to Bun.spawn.
 * @param cwd Working directory for the command.
 */
async function capture(command: string[], cwd: string): Promise<string> {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed: ${stderr.trim() || `exit ${exitCode}`}`);
  }
  return stdout;
}

/**
 * Parse package.json and report both read and parse failures as an invalid manifest.
 * @param projectDirectory Directory containing package.json.
 */
async function readManifest(projectDirectory: string): Promise<PackageManifest> {
  try {
    return JSON.parse(await fs.readFile(path.join(projectDirectory, "package.json"), "utf8")) as PackageManifest;
  } catch (error) {
    throw new Error(`Invalid package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Read the name and supported release version, reporting name errors first.
 * @param manifest Parsed package manifest.
 */
function requireIdentity(manifest: PackageManifest): { name: string; version: string } {
  if (typeof manifest.name !== "string" || !manifest.name) {
    throw new Error("package.json name must be a non-empty string");
  }
  if (typeof manifest.version !== "string") {
    throw new Error("package.json version must be a valid semver release");
  }
  releaseChannel(manifest.version);
  return { name: manifest.name, version: manifest.version };
}

/** npm distribution tag and GitHub prerelease flag for the same release. */
export interface ReleaseChannel {
  distTag: string;
  prerelease: boolean;
}

/**
 * Map stable versions to latest and beta versions to next. Throw for unsupported versions.
 * @param version Package version in stable or beta.N form, with N a positive integer.
 */
export function releaseChannel(version: string): ReleaseChannel {
  const numeric = "(?:0|[1-9]\\d*)";
  if (new RegExp(`^${numeric}\\.${numeric}\\.${numeric}$`).test(version)) {
    return { distTag: "latest", prerelease: false };
  }
  if (new RegExp(`^${numeric}\\.${numeric}\\.${numeric}-beta\\.[1-9]\\d*$`).test(version)) {
    return { distTag: "next", prerelease: true };
  }
  throw new Error(`Unsupported release channel/version: ${version}`);
}

/**
 * Refuse contradictory npm and GitHub channel metadata before building or publishing.
 * @param version Package version that determines the expected channel.
 * @param metadata Channel values to check.
 */
function validateChannel(version: string, metadata: ReleaseChannel): void {
  const expected = releaseChannel(version);
  if (metadata.distTag !== expected.distTag || metadata.prerelease !== expected.prerelease) {
    throw new Error(
      `Release channel mismatch: ${version} requires --tag ${expected.distTag} and prerelease=${expected.prerelease}`,
    );
  }
}

/**
 * Return the package identity after checking the optional channel, Git tag, changelog and README in that order.
 * @param projectDirectory Directory containing package.json, CHANGELOG.md and README.md.
 * @param releaseTag Git tag in v<version> form.
 * @param channel npm and GitHub metadata to check when supplied.
 */
export async function validateReleaseMetadata(
  projectDirectory: string,
  releaseTag: string,
  channel?: ReleaseChannel,
): Promise<{ name: string; version: string }> {
  const manifest = await readManifest(projectDirectory);
  const identity = requireIdentity(manifest);
  if (channel) validateChannel(identity.version, channel);
  const expectedTag = `v${identity.version}`;
  if (releaseTag !== expectedTag) {
    throw new Error(`Release tag ${releaseTag} does not match package version ${expectedTag}`);
  }

  const changelog = await fs.readFile(path.join(projectDirectory, "CHANGELOG.md"), "utf8");
  if (!new RegExp(`^## \\[${escapeRegex(identity.version)}\\]$`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md has no release heading for ${identity.version}`);
  }

  const readme = await fs.readFile(path.join(projectDirectory, "README.md"), "utf8");
  const legacyRemoval = `bunx ${identity.name}@0.8.0 remove`;
  const legacyRemovalLine = new RegExp(`^[\\t ]*${escapeRegex(legacyRemoval)}[\\t ]*\\r?$`, "gm");
  const releaseReferences = readme.replace(legacyRemovalLine, "");
  const referencePattern = new RegExp(`${escapeRegex(identity.name)}@(\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)`, "g");
  const documentedVersions = [...releaseReferences.matchAll(referencePattern)].map((match) => match[1]);
  if (!documentedVersions.includes(identity.version)) {
    throw new Error(`README.md has no versioned ${identity.name} installation example; expected ${identity.version}`);
  }
  const staleVersion = documentedVersions.find((version) => version !== identity.version);
  if (staleVersion) {
    throw new Error(`README.md references ${identity.name}@${staleVersion}, expected ${identity.version}`);
  }
  return identity;
}

/**
 * Build the sorted list of archive entries from the fixed root files and packaged trees.
 * @param projectDirectory Project tree to inventory.
 */
async function expectedArchiveInventory(projectDirectory: string): Promise<string[]> {
  const expected = ["LICENSE", "README.md", "package.json"];
  for (const directory of ["src", "assets/oc-beads"]) {
    expected.push(...(await filesBelow(path.join(projectDirectory, directory))).map((file) => `${directory}/${file}`));
  }
  return expected.sort();
}

/**
 * Read the archive bytes at the point of the check and return a lowercase hexadecimal SHA-256.
 * @param archivePath Resolved path to the archive on disk.
 */
async function archiveSha256(archivePath: string): Promise<string> {
  return createHash("sha256")
    .update(await fs.readFile(archivePath))
    .digest("hex");
}

/**
 * Check the packed inventory and manifest against the project, then return the archive path and digest.
 * @param projectDirectory Project tree used for the comparison.
 * @param archivePath Absolute path or path relative to the project directory.
 */
export async function inspectReleaseArchive(projectDirectory: string, archivePath: string): Promise<ReleaseArchive> {
  const archive = path.resolve(projectDirectory, archivePath);
  const listed = await capture(["tar", "-tzf", archive], projectDirectory);
  const inventory = listed
    .split(/\r?\n/)
    .filter((entry) => entry.startsWith("package/") && !entry.endsWith("/"))
    .map((entry) => entry.slice("package/".length))
    .sort();
  const expected = await expectedArchiveInventory(projectDirectory);
  if (inventory.join("\0") !== expected.join("\0")) {
    throw new Error(
      `Release archive inventory differs:\nexpected ${expected.join("\n")}\nactual ${inventory.join("\n")}`,
    );
  }

  const packedManifest = JSON.parse(
    await capture(["tar", "-xOzf", archive, "package/package.json"], projectDirectory),
  ) as PackageManifest;
  const sourceManifest = await readManifest(projectDirectory);
  requireIdentity(packedManifest);
  if (JSON.stringify(packedManifest) !== JSON.stringify(sourceManifest)) {
    throw new Error("Release archive package.json differs from the checked-in package.json");
  }

  return {
    path: archive,
    sha256: await archiveSha256(archive),
  };
}

/**
 * Validate metadata, pack into an empty output directory and return the inspected archive.
 * The caller owns the output directory and any files left there after a failure.
 * @param projectDirectory Project to validate and pack.
 * @param releaseTag Git tag in v<version> form.
 * @param outputDirectory Absolute or project-relative directory. It is created if missing and must be empty before packing.
 * @param channel npm and GitHub metadata to check when supplied.
 */
export async function prepareReleaseArchive(
  projectDirectory: string,
  releaseTag: string,
  outputDirectory: string,
  channel?: ReleaseChannel,
): Promise<ReleaseArchive> {
  await validateReleaseMetadata(projectDirectory, releaseTag, channel);
  const output = path.resolve(projectDirectory, outputDirectory);
  await fs.mkdir(output, { recursive: true });
  if ((await fs.readdir(output)).length !== 0) {
    throw new Error(`Release output directory must be empty: ${output}`);
  }
  await capture(["bun", "pm", "pack", "--destination", output, "--quiet"], projectDirectory);
  const archives = (await fs.readdir(output)).filter((file) => file.endsWith(".tgz"));
  if (archives.length !== 1 || !archives[0]) {
    throw new Error(`Expected exactly one release archive, found ${archives.length}`);
  }
  return inspectReleaseArchive(projectDirectory, path.join(output, archives[0]));
}

/**
 * Check the supplied digest first, then inspect the inventory and manifest and compute the returned digest.
 * @param projectDirectory Project tree used for the comparison.
 * @param archivePath Absolute path or path relative to the project directory.
 * @param expectedSha256 Expected lowercase hexadecimal digest, compared verbatim.
 */
export async function verifyReleaseArchive(
  projectDirectory: string,
  archivePath: string,
  expectedSha256: string,
): Promise<ReleaseArchive> {
  const resolvedArchive = path.resolve(projectDirectory, archivePath);
  const actualSha256 = await archiveSha256(resolvedArchive);
  if (actualSha256 !== expectedSha256) {
    throw new Error(`Release archive digest changed: expected ${expectedSha256}, got ${actualSha256}`);
  }
  return inspectReleaseArchive(projectDirectory, resolvedArchive);
}

/**
 * Read the token after the first occurrence of a flag, or throw if its value is missing.
 * @param args CLI tokens.
 * @param name Exact flag spelling.
 */
function argument(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index < 0 ? undefined : args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing required ${name}`);
  return value;
}

/**
 * Require an explicit GitHub prerelease boolean.
 * @param args CLI tokens containing --prerelease true or --prerelease false.
 */
function prereleaseArgument(args: string[]): boolean {
  const value = argument(args, "--prerelease");
  if (value !== "true" && value !== "false") throw new Error("--prerelease must be true or false");
  return value === "true";
}

async function main(args: string[]): Promise<void> {
  const command = args[0];
  if (command === "prepare") {
    const projectDirectory = process.cwd();
    const identity = requireIdentity(await readManifest(projectDirectory));
    const channel = { ...releaseChannel(identity.version), prerelease: prereleaseArgument(args) };
    const releaseTag = argument(args, "--tag");
    const outputDirectory = argument(args, "--output");
    const result = await prepareReleaseArchive(projectDirectory, releaseTag, outputDirectory, channel);
    const archiveOutput = releaseOutputPath(projectDirectory, result.path);
    console.log(`Validated release archive ${archiveOutput} (${result.sha256})`);
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(
        process.env.GITHUB_OUTPUT,
        `archive=${archiveOutput}\nsha256=${result.sha256}\ndist_tag=${channel.distTag}\n`,
      );
    }
    return;
  }
  if (command === "verify") {
    const projectDirectory = process.cwd();
    await validateReleaseMetadata(projectDirectory, argument(args, "--tag"), {
      distTag: argument(args, "--dist-tag"),
      prerelease: prereleaseArgument(args),
    });
    const archivePath = argument(args, "--archive");
    const expectedSha256 = argument(args, "--sha256");
    const result = await verifyReleaseArchive(projectDirectory, archivePath, expectedSha256);
    console.log(`Verified release archive ${path.relative(projectDirectory, result.path)} (${result.sha256})`);
    return;
  }
  throw new Error(
    "Usage: bun scripts/packaging/release.ts prepare --tag <tag> --prerelease <true|false> --output <dir> | verify --archive <tgz> --sha256 <digest> --tag <tag> --dist-tag <next|latest> --prerelease <true|false>",
  );
}

if (import.meta.main) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
