import { createHash } from "node:crypto";
import type { CommandDefinition, CommandInvocation } from "@opencode/plugin/promise/command";
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
        "./server": { types: "./src/plugin.ts", import: "./src/plugin.ts" },
      })
  ) {
    throw new Error("Packed package has an unexpected root export contract");
  }
  if (
    JSON.stringify(manifest.files) !==
    JSON.stringify(["src", "assets/oc-beads", "README.md", "LICENSE"])
  ) {
    throw new Error("Packed package has an unexpected files contract");
  }
  if (manifest.bin !== undefined) {
    throw new Error("Packed package unexpectedly registers a companion CLI");
  }
  const opencodeRange = ">=2.1.1 <2.2";
  if (
    manifest.dependencies !== undefined ||
    JSON.stringify(manifest.peerDependencies) !==
      JSON.stringify({ "@opencode/plugin": opencodeRange }) ||
    !manifest.peerDependenciesMeta["@opencode/plugin"]?.optional
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
  for (const directory of ["src", "assets/oc-beads"]) {
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
  // OpenCode V2 resolves `<name>/server` before `<name>` for package plugins.
  if (Bun.resolveSync(`${sourceManifest.name}/server`, consumerDir) !== entry) {
    throw new Error("Packed package ./server export did not resolve to the plugin entry point");
  }
  const loaded = await import(pathToFileURL(entry).href);
  const plugin = loaded.default as { id?: unknown; setup?: unknown } | undefined;
  if (plugin?.id !== "opencode-beads" || typeof plugin.setup !== "function") {
    throw new Error("Packed package does not default-export the OpenCode V2 plugin definition");
  }

  // Inspect the unpacked installed base, not the repository's assets. node_modules is
  // ignored by host discovery, so this also exercises explicit package registration.
  const workflows = await import(pathToFileURL(path.join(packageDir, "src/workflows.ts")).href);
  const installedSkill = await workflows.loadBeadsSkill();
  const installedSkillPath = path.join(packageDir, "assets/oc-beads/SKILL.md");
  if (installedSkill.path !== installedSkillPath) throw new Error("Skill path escaped the installed package base");
  const links = [...installedSkill.content.matchAll(/\]\(((?:resources|adr)\/[^)]+)\)/g)]
    .map((match) => (match as RegExpMatchArray)[1]!);
  if (new Set(links).size !== 17) throw new Error("Packed skill must explicitly link all 17 supporting resources");
  for (const link of links) {
    const resource = path.resolve(path.dirname(installedSkillPath), link);
    const relative = path.relative(packageDir, resource);
    const installed = await fs.readFile(resource);
    const source = await fs.readFile(path.join(projectDir, relative));
    if (!installed.equals(source)) throw new Error(`Packed resource differs: ${relative}`);
  }
  // Missing/unreachable guidance is a diagnostic, not silently advertised capability.
  const missingResource = path.join(path.dirname(installedSkillPath), links[15]!);
  const savedResource = await fs.readFile(missingResource);
  try {
    await fs.unlink(missingResource);
    let failure = "";
    try { await workflows.loadBeadsSkill(); } catch (error) { failure = String(error); }
    if (!failure.includes(`resource-unreachable ${links[15]}`)) throw new Error("Missing packed guidance was not diagnosed");
  } finally {
    await fs.writeFile(missingResource, savedResource);
  }

  if (await fs.exists(path.join(packageDir, "vendor"))) {
    throw new Error("Packed package unexpectedly contains the retired vendor directory");
  }

  if (await fs.exists(path.join(packageDir, "dist"))) {
    throw new Error("Packed package unexpectedly contains a dist payload");
  }
  if (await fs.exists(path.join(packageDir, "src", "init-cli.ts"))) {
    throw new Error("Packed package unexpectedly contains the companion CLI source");
  }

  // Exercise setup against a minimal V2 context; the context hook is registered but not invoked.
  type PackedAgent = {
    name?: string;
    mode?: string;
    system?: string;
    model?: unknown;
    steps?: number;
    permissions?: Array<{ action: string; resource: string; effect: string }>;
  };
  async function setupPacked(options: Record<string, unknown>) {
    const registeredHooks: string[] = [];
    const agents = new Map<string, PackedAgent>();
    const skills = new Map<string, { id: string; name: string; content: string; path: string }>();
    const userSkill = { id: "beads", name: "beads", content: "USER SHARED SKILL", path: "/user/SKILL.md" };
    skills.set("beads", userSkill);
    const commands = new Map<string, CommandDefinition>([["oc-beads:ready", {
      name: "oc-beads:ready", description: "EARLIER PLUGIN", execute: async () => {},
    }]]);
    const owned = new Set<string>();
    const disposed = new Set<string>();
    const own = (name: string) => {
      if (owned.has(name)) throw new Error(`Duplicate owned registration: ${name}`);
      owned.add(name);
      return { dispose: async () => { disposed.add(name); } };
    };
    const prompts: Array<Record<string, unknown>> = [];
    let invoking = false;
    const cleanup = await (plugin!.setup as (ctx: unknown) => Promise<unknown>)({
      app: { name: "OpenCode", version: "2.1.1", channel: "stable" },
      location: { directory: consumerDir },
      options,
      agent: {
        get: async () => ({ data: { mode: "primary" } }),
        transform: async (callback: (editor: unknown) => void) => {
          callback({
            update(id: string, update: (agent: PackedAgent) => void) {
              const agent = agents.get(id) ?? { name: id, mode: "primary" };
              update(agent);
              agents.set(id, agent);
            },
          });
          return own("agent");
        },
      },
      command: {
        list: async () => ({ data: [...commands.values()].map(({ name, description }) => ({ name, description })) }),
        transform: async (callback: (editor: { add(definition: CommandDefinition): void }) => void) => {
          callback({ add: (definition) => commands.set(definition.name, definition) });
          return own("command");
        },
      },
      skill: {
        list: async () => ({ data: [...skills.values()] }),
        transform: async (callback: (editor: unknown) => void) => {
          callback({ list: () => [...skills.values()], add: (skill: { id: string; name: string; content: string; path: string }) => skills.set(skill.id, skill) });
          return own("skill");
        },
      },
      session: {
        prompt: async (input: Record<string, unknown>) => {
          if (!invoking) throw new Error("Setup must not submit a prompt");
          prompts.push(input);
          return {};
        },
        hook: async (name: string) => {
          registeredHooks.push(name);
          return own(`hook:${name}`);
        },
      },
      event: {
        subscribe: async function* () {},
      },
    });
    if (typeof cleanup !== "function") throw new Error("Packed plugin setup returned no cleanup");
    const richSkill = skills.get("oc-beads");
    if (richSkill?.path !== installedSkillPath || richSkill.content !== installedSkill.content) throw new Error("Installed skill registration differs from packed asset");
    if (skills.get("beads") !== userSkill) throw new Error("Shared user skill was changed");
    const expectedCommands = [...Object.keys(workflows.WORKFLOWS).map((stem) => `oc-beads:${stem}`), "oc-beads:status"].sort();
    if (commands.size !== 30 || [...commands.keys()].sort().join("\0") !== expectedCommands.join("\0")) {
      throw new Error("Packed callback did not register all 30 native command definitions");
    }
    invoking = true;
    const invocation = {
      sessionID: "packed-session", delivery: "steer",
      prompt: { text: "literal '$ARGUMENTS' $(no-shell) `text`", files: [{ uri: "file:///tmp/a%20b" }], agents: [{ name: "build" }], skills: [{ id: "oc-beads" }] },
    } as unknown as CommandInvocation;
    for (const definition of commands.values()) {
      if (typeof definition.execute !== "function" || !definition.description) throw new Error(`Missing native body: ${definition.name}`);
      await definition.execute(invocation);
      const submitted = prompts.at(-1);
      if (!submitted || typeof submitted.text !== "string" || !submitted.text.includes(invocation.prompt.text)
        || submitted.sessionID !== invocation.sessionID || submitted.delivery !== invocation.delivery
        || submitted.files !== invocation.prompt.files || submitted.agents !== invocation.prompt.agents || submitted.skills !== invocation.prompt.skills) {
        throw new Error(`Packed command did not preserve native invocation: ${definition.name}`);
      }
      if (definition.name === "oc-beads:status") {
        const status = JSON.parse(submitted.text.split("\n")[1]!);
        if (status.commands.registration !== "registered" || status.commands.lookup !== "available"
          || !status.commands.ownership.includes("identical-description") || status.liveQualification !== "not executed") {
          throw new Error("Packed status did not report observed registration and qualification limits");
        }
      } else if (!submitted.text.includes(installedSkillPath)) throw new Error("Packed command uses the wrong installed guidance base");
    }
    if (prompts.length !== commands.size) throw new Error("Packed native commands did not each submit one prompt");
    await cleanup();
    const expectedOwned = ["agent", "skill", "command", ...registeredHooks.map((name) => `hook:${name}`)].sort();
    if ([...owned].sort().join("\0") !== expectedOwned.join("\0")
      || [...disposed].sort().join("\0") !== expectedOwned.join("\0")) {
      throw new Error("Owned native registrations were not all disposed");
    }
    return { registeredHooks, agents };
  }

  const vanilla = await setupPacked({});
  if (vanilla.registeredHooks.join(",") !== "context,compaction") {
    throw new Error(`Packed plugin registered unexpected session hooks: ${vanilla.registeredHooks.join(",")}`);
  }
  const taskAgent = vanilla.agents.get("beads-task-agent");
  const taskAgentPrompt = taskAgent?.system;
  if (taskAgent?.mode !== "subagent" || !taskAgentPrompt) {
    throw new Error("Packed plugin did not register the task agent as a subagent");
  }
  if (
    taskAgentPrompt.includes("Agent Delegation") ||
    !taskAgentPrompt.includes("Full `bd prime` workflow context is injected") ||
    !taskAgentPrompt.includes("bd update <id> --claim --json --actor='<executor-actor>' --sandbox") ||
    !taskAgentPrompt.includes("An exact assignment or explicit one-bead mode ends with that bead") ||
    !taskAgentPrompt.includes("already-authorized batch or goal") ||
    !taskAgentPrompt.includes("Discovery does not add execution authority") ||
    !taskAgentPrompt.includes("If the parent owns acceptance or closure, return evidence and leave the bead open") ||
    taskAgentPrompt.includes("otherwise choose one highest-priority ready bead")
  ) {
    throw new Error("Packed task-agent prompt lacks the bounded workflow fallback");
  }
  const rules = (taskAgent.permissions ?? []).map((rule) => `${rule.action}:${rule.resource}:${rule.effect}`);
  if (!rules.includes("shell:git push *:ask") || taskAgent.steps !== 100) {
    throw new Error("Packed task agent lacks the no-push permission rules or the default steps cap");
  }
  if (vanilla.agents.has("beads-task-agent-luna")) {
    throw new Error("Packed plugin enabled Luna without an opt-in");
  }
  const luna = (await setupPacked({ luna: true })).agents.get("beads-task-agent-luna");
  const lunaModel = luna?.model as { providerID?: string; id?: string; variant?: string } | undefined;
  if (
    lunaModel?.providerID !== "openai" || lunaModel.id !== "gpt-6-luna" ||
    lunaModel.variant !== "max" || luna?.system !== taskAgentPrompt || luna?.mode !== "subagent"
  ) {
    throw new Error("Packed plugin did not register the shared Luna Max profile");
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
    `Validated ${archiveName} (${archiveChecksum}); loaded packed V2 plugin`
  );
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
