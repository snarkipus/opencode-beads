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
  bin?: unknown;
  peerDependencies?: unknown;
  peerDependenciesMeta?: unknown;
  repository?: unknown;
  homepage?: unknown;
  bugs?: unknown;
  publishConfig?: unknown;
}

export interface ReleaseArchive {
  path: string;
  sha256: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function filesBelow(root: string, directory = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    const relativePath = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await filesBelow(root, relativePath)));
    else files.push(relativePath);
  }
  return files.sort();
}

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

async function readManifest(projectDirectory: string): Promise<PackageManifest> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(projectDirectory, "package.json"), "utf8")
    ) as PackageManifest;
  } catch (error) {
    throw new Error(
      `Invalid package.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function requireIdentity(manifest: PackageManifest): { name: string; version: string } {
  if (typeof manifest.name !== "string" || !manifest.name) {
    throw new Error("package.json name must be a non-empty string");
  }
  if (
    typeof manifest.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)
  ) {
    throw new Error("package.json version must be a valid semver release");
  }
  return { name: manifest.name, version: manifest.version };
}

/** Validate release identity across the Git tag and checked-in user-facing metadata. */
export async function validateReleaseMetadata(
  projectDirectory: string,
  releaseTag: string
): Promise<{ name: string; version: string }> {
  const manifest = await readManifest(projectDirectory);
  const identity = requireIdentity(manifest);
  const expectedTag = `v${identity.version}`;
  if (releaseTag !== expectedTag) {
    throw new Error(`Release tag ${releaseTag} does not match package version ${expectedTag}`);
  }

  const changelog = await fs.readFile(path.join(projectDirectory, "CHANGELOG.md"), "utf8");
  if (!new RegExp(`^## \\[${escapeRegex(identity.version)}\\]$`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md has no release heading for ${identity.version}`);
  }

  const readme = await fs.readFile(path.join(projectDirectory, "README.md"), "utf8");
  const referencePattern = new RegExp(
    `${escapeRegex(identity.name)}@(\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)`,
    "g"
  );
  const documentedVersions = [...readme.matchAll(referencePattern)].map((match) => match[1]);
  if (documentedVersions.length === 0) {
    throw new Error(`README.md has no versioned ${identity.name} installation example`);
  }
  const staleVersion = documentedVersions.find((version) => version !== identity.version);
  if (staleVersion) {
    throw new Error(
      `README.md references ${identity.name}@${staleVersion}, expected ${identity.version}`
    );
  }
  return identity;
}

async function expectedArchiveInventory(projectDirectory: string): Promise<string[]> {
  const expected = ["LICENSE", "README.md", "package.json"];
  for (const directory of ["dist", "src", "vendor"]) {
    expected.push(
      ...(await filesBelow(path.join(projectDirectory, directory))).map(
        (file) => `${directory}/${file}`
      )
    );
  }
  return expected.sort();
}

/** Inspect one packed archive and return the digest used by all later release steps. */
export async function inspectReleaseArchive(
  projectDirectory: string,
  archivePath: string
): Promise<ReleaseArchive> {
  const archive = path.resolve(projectDirectory, archivePath);
  const listed = await capture(["tar", "-tzf", archive], projectDirectory);
  const inventory = listed
    .split("\n")
    .filter((entry) => entry.startsWith("package/") && !entry.endsWith("/"))
    .map((entry) => entry.slice("package/".length))
    .sort();
  const expected = await expectedArchiveInventory(projectDirectory);
  if (inventory.join("\0") !== expected.join("\0")) {
    throw new Error(
      `Release archive inventory differs:\nexpected ${expected.join("\n")}\nactual ${inventory.join("\n")}`
    );
  }

  const packedManifest = JSON.parse(
    await capture(["tar", "-xOzf", archive, "package/package.json"], projectDirectory)
  ) as PackageManifest;
  const sourceManifest = await readManifest(projectDirectory);
  requireIdentity(packedManifest);
  if (JSON.stringify(packedManifest) !== JSON.stringify(sourceManifest)) {
    throw new Error("Release archive package.json differs from the checked-in package.json");
  }

  return {
    path: archive,
    sha256: createHash("sha256").update(await fs.readFile(archive)).digest("hex"),
  };
}

/** Build and inspect exactly one release archive after metadata validation. */
export async function prepareReleaseArchive(
  projectDirectory: string,
  releaseTag: string,
  outputDirectory: string
): Promise<ReleaseArchive> {
  await validateReleaseMetadata(projectDirectory, releaseTag);
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

/** Recheck the immutable publication input immediately before npm receives it. */
export async function verifyReleaseArchive(
  projectDirectory: string,
  archivePath: string,
  expectedSha256: string
): Promise<ReleaseArchive> {
  const resolvedArchive = path.resolve(projectDirectory, archivePath);
  const actualSha256 = createHash("sha256")
    .update(await fs.readFile(resolvedArchive))
    .digest("hex");
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `Release archive digest changed: expected ${expectedSha256}, got ${actualSha256}`
    );
  }
  return inspectReleaseArchive(projectDirectory, resolvedArchive);
}

function argument(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index < 0 ? undefined : args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing required ${name}`);
  return value;
}

async function main(args: string[]): Promise<void> {
  const command = args[0];
  if (command === "prepare") {
    const result = await prepareReleaseArchive(
      process.cwd(),
      argument(args, "--tag"),
      argument(args, "--output")
    );
    const relativeArchive = path.relative(process.cwd(), result.path);
    console.log(`Validated release archive ${relativeArchive} (${result.sha256})`);
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(
        process.env.GITHUB_OUTPUT,
        `archive=${relativeArchive}\nsha256=${result.sha256}\n`
      );
    }
    return;
  }
  if (command === "verify") {
    const result = await verifyReleaseArchive(
      process.cwd(),
      argument(args, "--archive"),
      argument(args, "--sha256")
    );
    console.log(
      `Verified release archive ${path.relative(process.cwd(), result.path)} (${result.sha256})`
    );
    return;
  }
  throw new Error(
    "Usage: bun scripts/release.ts prepare --tag <tag> --output <dir> | verify --archive <tgz> --sha256 <digest>"
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
