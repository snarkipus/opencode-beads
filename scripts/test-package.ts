import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-beads-package-"));
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
  await run(["bun", "pm", "pack", "--destination", tempDir, "--quiet"]);
  const archives = (await fs.readdir(tempDir)).filter((file) => file.endsWith(".tgz"));
  if (archives.length !== 1) throw new Error("Expected exactly one package archive");
  const archiveName = archives[0];
  if (!archiveName) throw new Error("Package archive is missing");
  const archive = path.join(tempDir, archiveName);
  const archiveChecksum = createHash("sha256")
    .update(await fs.readFile(archive))
    .digest("hex");

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
    manifest.version !== "0.7.0" ||
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
    taskAgentPrompt.length >= 500 ||
    taskAgentPrompt.includes("Agent Delegation")
  ) {
    throw new Error("Packed task-agent prompt contains duplicated workflow guidance");
  }

  await run(["git", "init", "--quiet"], consumerDir);
  const cli = path.join(consumerDir, "node_modules", ".bin", "opencode-beads");
  if (((await fs.stat(cli)).mode & 0o111) === 0) {
    throw new Error("Packed companion CLI is not executable");
  }
  const cliHome = path.join(tempDir, "home");
  await fs.mkdir(cliHome);
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
  const removed = JSON.parse(
    await capture([cli, "remove", "--json"], consumerDir, { HOME: cliHome })
  );
  if (!installed.changed || checked.state !== "current" || !removed.changed) {
    throw new Error("Packed CLI failed the offline lifecycle smoke test");
  }

  console.log(
    `Validated ${archiveName} (${archiveChecksum}); loaded packed plugin with ${vendorCommands.length} vendor command files`
  );
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
