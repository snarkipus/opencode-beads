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
  bin: Record<string, string>;
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

async function capture(
  command: string[],
  cwd: string,
  env?: Record<string, string>
): Promise<string> {
  const process = Bun.spawn(command, {
    cwd,
    env: { ...Bun.env, ...env },
    stdout: "pipe",
    stderr: "inherit",
  });
  const output = await new Response(process.stdout).text();
  const exitCode = await process.exited;
  if (exitCode !== 0) throw new Error(`${command.join(" ")} exited with code ${exitCode}`);
  return output;
}

async function captureResult(
  command: string[],
  cwd: string,
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const process = Bun.spawn(command, {
    cwd,
    env: { ...Bun.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return { stdout, stderr, exitCode };
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
    JSON.stringify(["src", "vendor", "dist", "README.md", "LICENSE"])
  ) {
    throw new Error("Packed package has an unexpected files contract");
  }
  if (JSON.stringify(manifest.bin) !== JSON.stringify({ "opencode-beads": "src/init-cli.ts" })) {
    throw new Error("Packed package has an unexpected companion CLI bin contract");
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
  for (const directory of ["dist", "src", "vendor"]) {
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

  const artifactManifest = JSON.parse(
    await fs.readFile(path.join(packageDir, "dist", "init", "manifest.json"), "utf8")
  ) as {
    upstream: { repository: string; tag: string; commit: string };
    files: Array<{ path: string; bytes: number; sha256: string }>;
    sources: Array<{ source: string; sourceSha256: string; target: string }>;
  };
  const expectedArtifactPaths = [
    "SKILL.md",
    "references/DEPENDENCIES.md",
    "references/ISSUE_CREATION.md",
    "references/RESUMABILITY.md",
  ];
  const expectedDistInventory = [
    ...expectedArtifactPaths.map((file) => `init/artifacts/beads/${file}`),
    "init/manifest.json",
  ].sort();
  if (
    (await filesBelow(path.join(packageDir, "dist"))).join("\0") !==
    expectedDistInventory.join("\0")
  ) {
    throw new Error("Packed package has an unexpected complete dist inventory");
  }
  if (
    artifactManifest.files?.map(({ path: file }) => file).join("\0") !==
    expectedArtifactPaths.join("\0")
  ) {
    throw new Error("Packed package has an unexpected init artifact inventory");
  }
  const expectedSources = [
    [
      "plugins/beads/skills/beads/SKILL.md",
      "01555fe65d19be401d820d9dec029cd048fb0791d433b4b575374477d6f1d827",
      "SKILL.md",
    ],
    [
      "plugins/beads/skills/beads/resources/DEPENDENCIES.md",
      "9c3327611bfbdc47124736dd0cc928bfeff1c135d4ae79d4ea46cba1900df335",
      "references/DEPENDENCIES.md",
    ],
    [
      "plugins/beads/skills/beads/resources/ISSUE_CREATION.md",
      "ff465ed1fb13fbb6c42b42ec15c1bd8fd677c4661237e4fc1675c179f7fca460",
      "references/ISSUE_CREATION.md",
    ],
    [
      "plugins/beads/skills/beads/resources/RESUMABILITY.md",
      "8a7db4e967ace1b4f60dc85e3fb2d02f70749a18056fe90c61b2685bb172d7df",
      "references/RESUMABILITY.md",
    ],
  ];
  const actualSources = artifactManifest.sources.map(({ source, sourceSha256, target }) => [
    source,
    sourceSha256,
    target,
  ]);
  if (JSON.stringify(actualSources) !== JSON.stringify(expectedSources)) {
    throw new Error("Packed package has unexpected reviewed source mappings");
  }
  for (const file of artifactManifest.files) {
    const content = await fs.readFile(
      path.join(packageDir, "dist", "init", "artifacts", "beads", file.path)
    );
    const checksum = createHash("sha256").update(content).digest("hex");
    if (content.byteLength !== file.bytes || checksum !== file.sha256) {
      throw new Error(`Packed init artifact failed validation: ${file.path}`);
    }
  }
  const vendorManifest = JSON.parse(
    await fs.readFile(path.join(packageDir, "vendor", "manifest.json"), "utf8")
  ) as { repository: string; tag: string; commit: string };
  if (
    JSON.stringify(artifactManifest.upstream) !==
    JSON.stringify({
      repository: vendorManifest.repository,
      tag: vendorManifest.tag,
      commit: vendorManifest.commit,
    })
  ) {
    throw new Error("Packed runtime and skill provenance disagree");
  }

  const projectSkill = path.join(consumerDir, ".opencode", "skills", "beads");
  const hooks = await loaded.BeadsPlugin({
    client: {},
    directory: consumerDir,
    worktree: consumerDir,
  });
  if (typeof hooks.config !== "function") throw new Error("Packed plugin has no config hook");
  if (await fs.exists(projectSkill)) throw new Error("Packed plugin wrote skill files during startup");
  const config: Record<string, unknown> = {};
  await hooks.config(config);
  const commands = config.command as Record<string, { template?: string }> | undefined;
  const agents = config.agent as Record<string, { prompt?: string }> | undefined;
  if (Object.keys(commands ?? {}).length !== 28 || !commands?.["beads:ready"]?.template) {
    throw new Error("Packed plugin did not load the complete command inventory");
  }
  const setup = commands?.["beads:setup"]?.template;
  const versionedCli = `bunx ${manifest.name}@${manifest.version}`;
  if (
    !["init", "init --global", "check", "update", "remove"].every((command) =>
      setup?.includes(`${versionedCli} ${command}`)
    ) ||
    !setup?.includes("package CLI is canonical") ||
    !setup.includes("/beads:init")
  ) {
    throw new Error("Packed plugin did not load versioned setup guidance");
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
  if (await fs.exists(projectSkill)) throw new Error("Packed config hook wrote skill files");

  await run(["git", "init", "--quiet"], consumerDir);
  const cli = path.join(consumerDir, "node_modules", ".bin", "opencode-beads");
  if (((await fs.stat(cli)).mode & 0o111) === 0) {
    throw new Error("Packed companion CLI is not executable");
  }
  const cliHome = path.join(tempDir, "home");
  await fs.mkdir(cliHome);
  const cliEnvironment: Record<string, string> = { HOME: cliHome };
  const cliJson = async (args: string[], expectedExitCode = 0) => {
    const result = await captureResult([cli, ...args, "--json"], consumerDir, cliEnvironment);
    if (result.exitCode !== expectedExitCode || result.stderr !== "") {
      throw new Error(
        `${args.join(" ")} returned ${result.exitCode}: ${result.stderr || result.stdout}`
      );
    }
    return JSON.parse(result.stdout) as Record<string, unknown>;
  };
  const firstDryRun = await capture([cli, "init", "--dry-run", "--json"], consumerDir, {
    HOME: cliHome,
  });
  const secondDryRun = await capture([cli, "init", "--dry-run", "--json"], consumerDir, {
    HOME: cliHome,
  });
  if (firstDryRun !== secondDryRun || JSON.parse(firstDryRun).state !== "missing") {
    throw new Error("Packed CLI dry-run JSON is not deterministic");
  }
  const installed = JSON.parse(
    await capture([cli, "init", "--json"], consumerDir, { HOME: cliHome })
  );
  const checked = JSON.parse(await capture([cli, "check", "--json"], consumerDir, { HOME: cliHome }));
  if (!installed.changed || checked.state !== "current") {
    throw new Error("Packed CLI failed project installation");
  }

  const ownershipPath = path.join(projectSkill, ".opencode-beads-manifest.json");
  const ownership = JSON.parse(await fs.readFile(ownershipPath, "utf8")) as {
    packageVersion: string;
    upstream: { tag: string; commit: string };
    files: Array<{ path: string; sha256: string }>;
  };
  if (
    ownership.packageVersion !== manifest.version ||
    ownership.upstream.tag !== artifactManifest.upstream.tag ||
    ownership.upstream.commit !== artifactManifest.upstream.commit ||
    JSON.stringify(ownership.files) !==
      JSON.stringify(artifactManifest.files.map(({ path: file, sha256 }) => ({ path: file, sha256 })))
  ) {
    throw new Error("Installed ownership manifest disagrees with package provenance");
  }

  ownership.packageVersion = "999.0.0";
  await fs.writeFile(ownershipPath, `${JSON.stringify(ownership, null, 2)}\n`);
  if ((await cliJson(["check"], 1)).state !== "stale") {
    throw new Error("Packed CLI did not detect differing managed metadata as stale");
  }
  const updated = await cliJson(["update"]);
  if (!updated.changed || (await cliJson(["check"])).state !== "current") {
    throw new Error("Packed CLI failed safe managed update");
  }

  const skillPath = path.join(projectSkill, "SKILL.md");
  const originalSkill = await fs.readFile(skillPath);
  await fs.appendFile(skillPath, "\nmodified\n");
  if ((await cliJson(["check"], 1)).state !== "modified") {
    throw new Error("Packed CLI did not detect a modified payload");
  }
  const refusedModified = await cliJson(["update"], 2);
  if (refusedModified.code !== "LIFECYCLE_REFUSED") {
    throw new Error("Packed CLI did not refuse modified managed content");
  }
  await fs.writeFile(skillPath, originalSkill);

  const unmanaged = path.join(consumerDir, ".agents", "skills", "beads");
  await fs.mkdir(unmanaged, { recursive: true });
  await fs.writeFile(path.join(unmanaged, "SKILL.md"), "unmanaged\n");
  if ((await cliJson(["init"], 2)).state !== "conflicting") {
    throw new Error("Packed CLI did not refuse unmanaged collision content");
  }
  await fs.rm(unmanaged, { recursive: true });

  const differentlyManaged = path.join(cliHome, ".claude", "skills", "beads");
  await fs.mkdir(differentlyManaged, { recursive: true });
  await fs.writeFile(path.join(differentlyManaged, ".opencode-beads-manifest.json"), "{}\n");
  if ((await cliJson(["update"], 2)).state !== "conflicting") {
    throw new Error("Packed CLI did not refuse differently managed collision content");
  }
  await fs.rm(differentlyManaged, { recursive: true });

  const removed = await cliJson(["remove"]);
  if (!removed.changed || (await fs.exists(projectSkill))) {
    throw new Error("Packed CLI failed safe project removal");
  }

  const xdgConfigHome = path.join(tempDir, "xdg");
  await fs.mkdir(xdgConfigHome);
  cliEnvironment.XDG_CONFIG_HOME = xdgConfigHome;
  const firstGlobalDryRun = await cliJson(["init", "--global", "--dry-run"]);
  const secondGlobalDryRun = await cliJson(["init", "--global", "--dry-run"]);
  if (JSON.stringify(firstGlobalDryRun) !== JSON.stringify(secondGlobalDryRun)) {
    throw new Error("Packed global dry-run JSON is not deterministic");
  }
  const globalInstalled = await cliJson(["init", "--global"]);
  const globalTarget = path.join(xdgConfigHome, "opencode", "skills", "beads");
  if (!globalInstalled.changed || !(await fs.exists(globalTarget))) {
    throw new Error("Packed CLI failed global installation");
  }
  const globalOwnershipPath = path.join(globalTarget, ".opencode-beads-manifest.json");
  const globalOwnership = JSON.parse(await fs.readFile(globalOwnershipPath, "utf8"));
  globalOwnership.packageVersion = "999.0.0";
  await fs.writeFile(globalOwnershipPath, `${JSON.stringify(globalOwnership, null, 2)}\n`);
  if ((await cliJson(["check", "--global"], 1)).state !== "stale") {
    throw new Error("Packed CLI did not detect stale global installation");
  }
  if (!(await cliJson(["update", "--global"])).changed) {
    throw new Error("Packed CLI failed global update");
  }
  if (!(await cliJson(["remove", "--global"])).changed || (await fs.exists(globalTarget))) {
    throw new Error("Packed CLI failed safe global removal");
  }

  const finalArchiveChecksum = createHash("sha256")
    .update(await fs.readFile(archive))
    .digest("hex");
  if (finalArchiveChecksum !== archiveChecksum) {
    throw new Error("Package archive changed during consumer and lifecycle validation");
  }

  console.log(
    `Validated ${archiveName} (${archiveChecksum}); loaded packed plugin with ${vendorCommands.length} vendor command files`
  );
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
