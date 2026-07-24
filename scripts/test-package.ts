import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-beads-package-"));
const archiveArgument = process.argv.indexOf("--archive");
const providedArchive =
  archiveArgument >= 0 && process.argv[archiveArgument + 1]
    ? path.resolve(process.argv[archiveArgument + 1] as string)
    : undefined;
const checksumArgument = process.argv.indexOf("--sha256");
const expectedArchiveChecksum =
  checksumArgument >= 0 ? process.argv[checksumArgument + 1] : undefined;
const sourceManifest = JSON.parse(
  await fs.readFile(path.join(projectDir, "package.json"), "utf8")
) as {
  name: string;
  version: string;
  type: string;
  main: string;
  types: string;
  exports: Record<string, unknown>;
  files: string[];
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies: Record<string, string>;
  peerDependenciesMeta: Record<string, { optional?: boolean }>;
  repository: { type: string; url: string };
  homepage: string;
  bugs: { url: string };
};

async function run(command: string[], cwd = projectDir): Promise<void> {
  const process = Bun.spawn(command, { cwd, stdout: "ignore", stderr: "inherit" });
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} exited with code ${exitCode}`);
  }
}

async function filesBelow(root: string, directory = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    const relativePath = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await filesBelow(root, relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files.sort();
}

try {
  let archive: string;
  let archiveName: string;
  if (providedArchive) {
    archive = providedArchive;
    archiveName = path.basename(providedArchive);
    if (!(await fs.stat(archive)).isFile()) throw new Error("Provided package archive is not a file");
  } else {
    await run(["bun", "pm", "pack", "--destination", tempDir, "--quiet"]);
    const archives = (await fs.readdir(tempDir)).filter((file) => file.endsWith(".tgz"));
    if (archives.length !== 1) throw new Error("Expected exactly one package archive");
    archiveName = archives[0] ?? "";
    if (!archiveName) throw new Error("Package archive is missing");
    archive = path.join(tempDir, archiveName);
  }
  const archiveChecksum = createHash("sha256")
    .update(await fs.readFile(archive))
    .digest("hex");
  if (expectedArchiveChecksum && archiveChecksum !== expectedArchiveChecksum) {
    throw new Error(
      `Provided archive checksum differs: expected ${expectedArchiveChecksum}, got ${archiveChecksum}`
    );
  }

  const consumerDir = path.join(tempDir, "consumer");
  await fs.mkdir(consumerDir);
  await fs.writeFile(
    path.join(consumerDir, "package.json"),
    JSON.stringify({ private: true, dependencies: { [sourceManifest.name]: archive } })
  );
  await run(["bun", "install", "--ignore-scripts"], consumerDir);

  const packageDir = path.join(consumerDir, "node_modules", ...sourceManifest.name.split("/"));
  const manifest = JSON.parse(
    await fs.readFile(path.join(packageDir, "package.json"), "utf-8")
  ) as typeof sourceManifest;
  if (
    manifest.name !== "@snarkipus/opencode-beads" ||
    manifest.version !== sourceManifest.version ||
    manifest.type !== "module"
  ) {
    throw new Error("Packed package has an unexpected name or version");
  }
  if (
    manifest.main !== "./src/plugin.ts" ||
    manifest.types !== "./src/plugin.ts" ||
    JSON.stringify(manifest.exports) !==
      JSON.stringify({
        ".": { types: "./src/plugin.ts", import: "./src/plugin.ts" },
      })
  ) {
    throw new Error("Packed package has an unexpected root export contract");
  }
  if (
    JSON.stringify(manifest.files) !==
    JSON.stringify(["src", "vendor", "README.md", "LICENSE"])
  ) {
    throw new Error("Packed package has an unexpected files contract");
  }
  if (manifest.bin !== undefined) {
    throw new Error("Packed package unexpectedly registers a companion CLI");
  }
  const opencodeRange = ">=1.18.3 <2";
  if (
    manifest.dependencies !== undefined ||
    JSON.stringify(manifest.peerDependencies) !==
      JSON.stringify({
        "@opencode-ai/plugin": opencodeRange,
        "@opencode-ai/sdk": opencodeRange,
      }) ||
    !manifest.peerDependenciesMeta["@opencode-ai/plugin"]?.optional ||
    !manifest.peerDependenciesMeta["@opencode-ai/sdk"]?.optional
  ) {
    throw new Error("Packed package has an unexpected OpenCode dependency contract");
  }
  if (
    manifest.repository.url !== "git+https://github.com/snarkipus/opencode-beads.git" ||
    manifest.homepage !== "https://github.com/snarkipus/opencode-beads#readme" ||
    manifest.bugs.url !== "https://github.com/snarkipus/opencode-beads/issues"
  ) {
    throw new Error("Packed package has unexpected fork ownership metadata");
  }

  const expectedPackedFiles = ["LICENSE", "README.md", "package.json"];
  for (const directory of ["src", "vendor"]) {
    expectedPackedFiles.push(
      ...(await filesBelow(path.join(projectDir, directory))).map((file) => `${directory}/${file}`)
    );
  }
  const packedFiles = await filesBelow(packageDir);
  if (packedFiles.join("\0") !== expectedPackedFiles.sort().join("\0")) {
    throw new Error(
      `Packed package inventory differs:\nexpected ${expectedPackedFiles.sort().join("\n")}\nactual ${packedFiles.join("\n")}`
    );
  }
  for (const excluded of ["CHANGELOG.md", "bun.lock", "tsconfig.json", "tests", "scripts", ".github"]) {
    if (packedFiles.some((file) => file === excluded || file.startsWith(`${excluded}/`))) {
      throw new Error(`Packed package unexpectedly includes ${excluded}`);
    }
  }

  const entry = Bun.resolveSync(sourceManifest.name, consumerDir);
  if (entry !== path.join(packageDir, manifest.main)) {
    throw new Error("Packed package root export did not resolve to the plugin entry point");
  }
  const loaded = await import(pathToFileURL(entry).href);
  if (typeof loaded.BeadsPlugin !== "function") {
    throw new Error("Packed package does not export BeadsPlugin");
  }

  const vendorCommands = await fs.readdir(path.join(packageDir, "vendor", "commands"));
  if (vendorCommands.length === 0) throw new Error("Packed package has no vendor commands");

  if (await fs.exists(path.join(packageDir, "dist"))) {
    throw new Error("Packed package unexpectedly contains a dist payload");
  }
  if (await fs.exists(path.join(packageDir, "src", "init-cli.ts"))) {
    throw new Error("Packed package unexpectedly contains the companion CLI source");
  }

  const hooks = await loaded.BeadsPlugin({
    client: {},
    directory: consumerDir,
    worktree: consumerDir,
  });
  if (typeof hooks.config !== "function") throw new Error("Packed plugin has no config hook");
  const config: Record<string, unknown> = {};
  await hooks.config(config);
  const commands = config.command as Record<string, { template?: string }> | undefined;
  const agents = config.agent as Record<string, { prompt?: string }> | undefined;
  if (Object.keys(commands ?? {}).length !== 27 || !commands?.["beads:ready"]?.template) {
    throw new Error("Packed plugin did not load the complete command inventory");
  }
  if (commands?.["beads:setup"] !== undefined) {
    throw new Error("Packed plugin unexpectedly loaded /beads:setup");
  }
  const taskAgentPrompt = agents?.["beads-task-agent"]?.prompt;
  if (!taskAgentPrompt) {
    throw new Error("Packed plugin did not load the task agent");
  }
  if (
    taskAgentPrompt.length >= 1_000 ||
    taskAgentPrompt.includes("Agent Delegation") ||
    !taskAgentPrompt.includes("Full `bd prime` workflow context is injected") ||
    !taskAgentPrompt.includes("bd update <id> --claim --json")
  ) {
    throw new Error("Packed task-agent prompt lacks the bounded workflow fallback");
  }
  const cli = path.join(consumerDir, "node_modules", ".bin", "opencode-beads");
  if (await fs.exists(cli)) throw new Error("Packed package unexpectedly installed a companion CLI");

  const finalArchiveChecksum = createHash("sha256")
    .update(await fs.readFile(archive))
    .digest("hex");
  if (finalArchiveChecksum !== archiveChecksum) {
    throw new Error("Package archive changed during consumer validation");
  }

  console.log(
    `Validated ${archiveName} (${archiveChecksum}); loaded packed plugin with ${vendorCommands.length} vendor command files`
  );
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
