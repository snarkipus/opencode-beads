/**
 * Smoke-test the tarball a consumer installs, either packed here or supplied with
 * its release digest. Exercise the installed V2 entry point with a local host
 * fixture for registration, command delivery, request replay and disposal.
 */
import type { SessionContext } from "@opencode/plugin/promise/session";
import type { Info } from "@opencode/plugin/promise/tool";
import { Message } from "@opencode/ai/effect";
import type { Plugin } from "@opencode/plugin";
import { SUPPORTED_OPENCODE_RANGE } from "../../src/host-admission";
import { createHash } from "node:crypto";
import type { CommandDefinition, CommandInvocation } from "@opencode/plugin/promise/command";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

type StoredSessionMessage = Awaited<ReturnType<Plugin.Context["session"]["context"]>>[number];
type StoredUserMessage = Extract<StoredSessionMessage, { type: "user" }>;

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Reject malformed CLI input before allocating scratch or reading the manifest.
const { values, tokens } = parseArgs({
  options: { archive: { type: "string" }, sha256: { type: "string" } },
  tokens: true,
});
const { archive: archiveOption, sha256: checksumOption } = values;
if (tokens.length !== Object.keys(values).length) {
  throw new Error("Pass only --archive and --sha256, at most once each");
}
if ((archiveOption === undefined) !== (checksumOption === undefined)) {
  throw new Error("--archive and --sha256 must be provided together");
}
if (
  archiveOption !== undefined &&
  (!archiveOption.trim() || archiveOption.startsWith("-") || archiveOption.includes("\0"))
) {
  throw new Error("--archive must be a file path");
}
if (checksumOption !== undefined && (checksumOption.length !== 64 || !/^[0-9a-f]+$/i.test(checksumOption))) {
  throw new Error("--sha256 must contain 64 hexadecimal digits");
}
const providedArchive = archiveOption === undefined ? undefined : path.resolve(archiveOption);
const expectedArchiveChecksum = checksumOption?.toLowerCase();
const sourceManifest = JSON.parse(await fs.readFile(path.join(projectDir, "package.json"), "utf8")) as {
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

/**
 * Run a package-manager step with errors visible and stop at the first failed command.
 * @param command Executable and arguments, passed without shell interpretation.
 * @param cwd Checkout for packing or disposable consumer for installation.
 */
async function run(command: string[], cwd = projectDir): Promise<void> {
  const process = Bun.spawn(command, { cwd, stdout: "ignore", stderr: "inherit" });
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} exited with code ${exitCode}`);
  }
}

/**
 * List a package tree in sorted, slash-separated archive paths on every platform.
 * @param root Tree being inventoried.
 * @param directory Relative path used during traversal.
 */
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

/**
 * Hash the archive bytes before and after consumer validation.
 * @param archive Local path to the actual tarball used as the install dependency.
 */
async function hashArchive(archive: string): Promise<string> {
  return createHash("sha256")
    .update(await fs.readFile(archive))
    .digest("hex");
}

/**
 * Check the published package metadata against the expected consumer-facing contract.
 * @param manifest Manifest read from the installed tarball.
 */
function checkInstalledManifest(manifest: typeof sourceManifest): void {
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
  if (JSON.stringify(manifest.files) !== JSON.stringify(["src", "assets/oc-beads", "README.md", "LICENSE"])) {
    throw new Error("Packed package has an unexpected files contract");
  }
  if (manifest.bin !== undefined) {
    throw new Error("Packed package unexpectedly registers a companion CLI");
  }
  if (
    manifest.dependencies !== undefined ||
    JSON.stringify(manifest.peerDependencies) !== JSON.stringify({ "@opencode/plugin": SUPPORTED_OPENCODE_RANGE }) ||
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
}

/**
 * Compare the installed payload to the checkout trees named by the package contract.
 * @param packageDir Root of the installed package in the disposable consumer.
 */
async function checkInstalledInventory(packageDir: string): Promise<void> {
  const expectedPackedFiles = ["LICENSE", "README.md", "package.json"];
  for (const directory of ["src", "assets/oc-beads"]) {
    expectedPackedFiles.push(
      ...(await filesBelow(path.join(projectDir, directory))).map((file) => `${directory}/${file}`),
    );
  }
  const packedFiles = await filesBelow(packageDir);
  if (packedFiles.join("\0") !== expectedPackedFiles.sort().join("\0")) {
    throw new Error(
      `Packed package inventory differs:\nexpected ${expectedPackedFiles.sort().join("\n")}\nactual ${packedFiles.join("\n")}`,
    );
  }
  for (const excluded of ["CHANGELOG.md", "bun.lock", "tsconfig.json", "tests", "scripts", ".github"]) {
    if (packedFiles.some((file) => file === excluded || file.startsWith(`${excluded}/`))) {
      throw new Error(`Packed package unexpectedly includes ${excluded}`);
    }
  }
}

// This scope owns the consumer and any archive it packs. A supplied archive stays outside cleanup.
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-beads-package-"));
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
  const archiveChecksum = await hashArchive(archive);
  if (expectedArchiveChecksum && archiveChecksum !== expectedArchiveChecksum) {
    throw new Error(`Provided archive checksum differs: expected ${expectedArchiveChecksum}, got ${archiveChecksum}`);
  }

  // Resolve through the consumer install so checkout resolution cannot satisfy the export checks.
  const consumerDir = path.join(tempDir, "consumer");
  await fs.mkdir(consumerDir);
  await fs.writeFile(
    path.join(consumerDir, "package.json"),
    JSON.stringify({ private: true, dependencies: { [sourceManifest.name]: archive } }),
  );
  await run(["bun", "install", "--ignore-scripts"], consumerDir);

  const packageDir = path.join(consumerDir, "node_modules", ...sourceManifest.name.split("/"));
  const manifest = JSON.parse(
    await fs.readFile(path.join(packageDir, "package.json"), "utf-8"),
  ) as typeof sourceManifest;
  checkInstalledManifest(manifest);
  await checkInstalledInventory(packageDir);

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

  // Host discovery skips node_modules. Resolve guidance from the installed package
  // and use the loaded asset below to verify explicit skill registration.
  const workflows = await import(pathToFileURL(path.join(packageDir, "src/workflows.ts")).href);
  const installedSkill = await workflows.loadBeadsSkill();
  const installedSkillPath = path.join(packageDir, "assets/oc-beads/SKILL.md");
  if (installedSkill.path !== installedSkillPath) throw new Error("Skill path escaped the installed package base");
  const links = [...installedSkill.content.matchAll(/\]\(((?:resources|adr)\/[^)]+)\)/g)].map(
    (match) => (match as RegExpMatchArray)[1]!,
  );
  if (new Set(links).size !== 17) throw new Error("Packed skill must explicitly link all 17 supporting resources");
  for (const link of links) {
    const resource = path.resolve(path.dirname(installedSkillPath), link);
    const relative = path.relative(packageDir, resource);
    const installed = await fs.readFile(resource);
    const source = await fs.readFile(path.join(projectDir, relative));
    if (!installed.equals(source)) throw new Error(`Packed resource differs: ${relative}`);
  }
  // Remove one installed resource to exercise its diagnostic. Restore it before setup
  // so every configuration uses the complete package.
  const fixtureResource = "resources/WORKTREES.md";
  if (!links.includes(fixtureResource)) throw new Error(`Packed skill must link ${fixtureResource}`);
  const missingResource = path.join(path.dirname(installedSkillPath), fixtureResource);
  const savedResource = await fs.readFile(missingResource);
  try {
    await fs.unlink(missingResource);
    let failure = "";
    try {
      await workflows.loadBeadsSkill();
    } catch (error) {
      failure = String(error);
    }
    if (!failure.includes(`resource-unreachable ${fixtureResource}`))
      throw new Error("Missing packed guidance was not diagnosed");
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

  type PackedAgent = {
    name?: string;
    mode?: string;
    system?: string;
    model?: unknown;
    steps?: number;
    permissions?: Array<{ action: string; resource: string; effect: string }>;
  };
  /**
   * Exercise the installed public setup without dependency injection, using fresh local
   * registries. Dispose the captured registrations before returning the observations.
   * @param options Configuration passed through the public setup context.
   */
  async function exercisePackedSetup(options: Record<string, unknown>) {
    const registeredHooks: string[] = [];
    const requestHooks = new Map<string, (event: SessionContext) => Promise<void> | void>();
    const tools: Info[] = [];
    const namespaces: Array<{ name: string }> = [];
    const agents = new Map<string, PackedAgent>();
    const skills = new Map<string, { id: string; name: string; content: string; path: string }>();
    // Seed external entries before transforms to exercise the shared skill and command collision.
    const userSkill = { id: "beads", name: "beads", content: "USER SHARED SKILL", path: "/user/SKILL.md" };
    skills.set("beads", userSkill);
    const commands = new Map<string, CommandDefinition>([
      [
        "oc-beads:ready",
        {
          name: "oc-beads:ready",
          description: "EARLIER PLUGIN",
          execute: async () => {},
        },
      ],
    ]);
    // Track handles returned by fixture transforms and hooks separately from registry contents.
    const owned = new Set<string>();
    const disposed = new Set<string>();
    const own = (name: string) => {
      if (owned.has(name)) throw new Error(`Duplicate owned registration: ${name}`);
      owned.add(name);
      return {
        dispose: async () => {
          disposed.add(name);
        },
      };
    };
    const prompts: Array<Record<string, unknown>> = [];
    const storedMessages: StoredSessionMessage[] = [];
    let invoking = false;
    let diagnosticReads = 0;
    const cleanup = await (plugin!.setup as (ctx: unknown) => Promise<unknown>)({
      app: { name: "OpenCode", version: "2.3.0", channel: "stable" },
      location: { directory: consumerDir, project: { directory: consumerDir } },
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
        list: async () => {
          diagnosticReads++;
          return { data: [...commands.values()].map(({ name, description }) => ({ name, description })) };
        },
        transform: async (callback: (editor: { add(definition: CommandDefinition): void }) => void) => {
          callback({ add: (definition) => commands.set(definition.name, definition) });
          return own("command");
        },
      },
      skill: {
        list: async () => {
          diagnosticReads++;
          return { data: [...skills.values()] };
        },
        transform: async (callback: (editor: unknown) => void) => {
          callback({
            list: () => [...skills.values()],
            add: (skill: { id: string; name: string; content: string; path: string }) => skills.set(skill.id, skill),
          });
          return own("skill");
        },
      },
      permission: { assert: async () => {} },
      tool: {
        hook: async () => own("tool:execute.after"),
        transform: async (
          callback: (editor: { namespace(value: { name: string }): void; add(tool: Info): void }) => void,
        ) => {
          callback({ namespace: (value) => namespaces.push(value), add: (tool) => tools.push(tool) });
          return own("tool:transform");
        },
      },
      session: {
        get: async () => {
          diagnosticReads++;
          return { location: { directory: consumerDir } };
        },
        context: async () => [...storedMessages],
        prompt: async (input: Record<string, unknown>) => {
          if (!invoking) throw new Error("Setup must not submit a prompt");
          prompts.push(input);
          return {};
        },
        hook: async (name: string, callback: (event: SessionContext) => Promise<void> | void) => {
          registeredHooks.push(name);
          requestHooks.set(name, callback);
          return own(`hook:${name}`);
        },
      },
      event: {
        subscribe: async function* () {},
      },
    });
    if (typeof cleanup !== "function") throw new Error("Packed plugin setup returned no cleanup");
    const expectedTools = [
      "find",
      "get",
      "edges",
      "memories",
      "recall",
      "claim",
      "note",
      "update",
      "close",
      "create",
      "remember",
    ].sort();
    if (
      namespaces.length !== 1 ||
      namespaces[0]?.name !== "beads" ||
      tools
        .map((tool) => tool.name)
        .sort()
        .join("\0") !== expectedTools.join("\0") ||
      !tools.every(
        (tool) =>
          tool.options?.codemode === true && tool.options.namespace === "beads" && tool.options.permission === "shell",
      )
    ) {
      throw new Error("Public packed setup did not register the eleven qualified code-mode operations");
    }
    const richSkill = skills.get("oc-beads");
    if (richSkill?.path !== installedSkillPath || richSkill.content !== installedSkill.content)
      throw new Error("Installed skill registration differs from packed asset");
    if (skills.get("beads") !== userSkill) throw new Error("Shared user skill was changed");
    const expectedCommands = [
      ...Object.keys(workflows.WORKFLOWS).map((stem) => `oc-beads:${stem}`),
      "oc-beads:diagnostics",
    ].sort();
    if (
      commands.has("oc-beads:status") ||
      !commands.has("oc-beads:diagnostics") ||
      !commands.has("oc-beads:stats") ||
      commands.size !== 30 ||
      [...commands.keys()].sort().join("\0") !== expectedCommands.join("\0")
    ) {
      throw new Error("Packed callback did not register all 30 native command definitions");
    }
    invoking = true;
    const invocation = {
      sessionID: "packed-session",
      delivery: "steer",
      prompt: {
        text: "literal '$ARGUMENTS' $(no-shell) `text`",
        files: [{ uri: "file:///tmp/a%20b" }],
        agents: [{ name: "build" }],
        skills: [{ id: "oc-beads" }],
      },
    } as unknown as CommandInvocation;
    /**
     * Replace session history with one stored user message and return a fresh request
     * that projects it without metadata.
     * @param id Shared message identity used by the hook to find the stored snapshot.
     * @param text Compact history text retained in both representations.
     * @param metadata Routing data available through session history.
     */
    function stageReplay(id: string, text: string, metadata: StoredUserMessage["metadata"]): SessionContext {
      const stored: StoredUserMessage = {
        id,
        type: "user",
        time: { created: 1 },
        text,
        ...(metadata === undefined ? {} : { metadata }),
      };
      storedMessages.splice(0, storedMessages.length, stored);
      return {
        sessionID: invocation.sessionID,
        agent: "build",
        system: [],
        messages: [Message.make({ id, role: "user", content: text })],
        tools: {},
        options: {},
      } as unknown as SessionContext;
    }

    /**
     * Check all three diagnostics views. Details and help each submit an extra prompt;
     * both are replayed, and help must not collect diagnostics evidence.
     * @param definition Registered diagnostics command invoked for details and help.
     * @param normalSubmission Prompt captured from the standard invocation.
     */
    async function checkDiagnostics(
      definition: CommandDefinition,
      normalSubmission: Record<string, unknown>,
    ): Promise<void> {
      const reportFooter = "\nEND_DIAGNOSTIC_REPORT\n\nOriginal invocation:\n";
      if (normalSubmission.text !== `/${definition.name} ${invocation.prompt.text}`)
        throw new Error("Packed diagnostics history is not compact");
      const normal = (normalSubmission.metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow
        .instructions;
      if (!normal.includes("**Plugin**") || normal.includes("Details: ") || normal.includes("Limits:"))
        throw new Error("Packed diagnostics normal presentation differs");
      const normalReport = normal.split("\nBEGIN_DIAGNOSTIC_REPORT\n")[1]?.split("\nEND_DIAGNOSTIC_REPORT\n")[0];
      if (
        !normalReport?.startsWith("## Beads diagnostics — ") ||
        !normalReport.includes(`\n\nVERSION: ${manifest.name} \`${manifest.version}\``) ||
        !/\n\nDATE: `[^`]+`\n\nVERSION:/.test(normalReport) ||
        !normalReport.includes("\n\nPATH: ") ||
        normalReport.includes(invocation.prompt.text) ||
        !normal.endsWith(reportFooter)
      )
        throw new Error("Packed diagnostic header/framing differs");
      await definition.execute({ ...invocation, prompt: { ...invocation.prompt, text: "details" } });
      const submitted = prompts.at(-1)!;
      if (
        submitted.text !== "/oc-beads:diagnostics details" ||
        submitted.files !== invocation.prompt.files ||
        submitted.delivery !== invocation.delivery
      )
        throw new Error("Packed diagnostics details input differs");
      const metadata = submitted.metadata as { ocBeadsWorkflow: { version: number; instructions: string } };
      const snapshot = metadata?.ocBeadsWorkflow;
      if (!snapshot || snapshot.version !== 1) throw new Error("Packed diagnostics lost its snapshot");
      const status = JSON.parse(snapshot.instructions.split("\nDetails: ")[1]!.split("\n")[0]!);
      if (status.plugin?.name !== manifest.name || status.plugin?.version !== manifest.version)
        throw new Error("Packed diagnostics did not identify the loaded package");
      if (
        !snapshot.instructions.includes(`PATH: \`${status.guard?.workspace?.repoRoot ?? "not observed"}\``) ||
        !snapshot.instructions.endsWith(reportFooter)
      )
        throw new Error("Packed diagnostics did not preserve native root and framing");
      const stored = JSON.stringify(submitted);
      for (const kind of ["context", "compaction"]) {
        const id = `packed-diagnostics-${kind}`;
        const event = stageReplay(id, submitted.text, metadata as StoredUserMessage["metadata"]);
        if (Object.hasOwn(event.messages[0]!, "metadata"))
          throw new Error("SDK projection unexpectedly retained request metadata");
        await requestHooks.get(kind)!(event);
        if (
          event.messages[0]?.content[0]?.type !== "text" ||
          event.messages[0].content[0].text !== snapshot.instructions ||
          /ocBeadsWorkflow/.test(JSON.stringify(event.messages))
        )
          throw new Error(`Packed diagnostics expansion differs: ${kind}`);
        const once = JSON.stringify(event.messages);
        await requestHooks.get(kind)!(event);
        if (JSON.stringify(event.messages) !== once) throw new Error("Packed diagnostics expansion duplicates");
      }
      if (JSON.stringify(submitted) !== stored) throw new Error("Packed diagnostics mutated persisted input");
      if (
        status.commands.registration !== "registered" ||
        status.commands.lookup !== "available" ||
        !status.commands.ownership.includes("identical-description") ||
        status.liveQualification !== "not measured by diagnostics; see release acceptance evidence" ||
        status.typedContinuity !== "enabled: qualified registration" ||
        status.typedRegistration !== "registered: beads namespace, code-mode-only"
      ) {
        throw new Error("Packed diagnostics did not report observed registration and qualification limits");
      }
      const beforeHelp = diagnosticReads;
      await definition.execute({ ...invocation, prompt: { ...invocation.prompt, text: " HeLp " } });
      const helpSubmission = prompts.at(-1)!;
      const helpSnapshot = (helpSubmission.metadata as { ocBeadsWorkflow: { version: number; instructions: string } })
        .ocBeadsWorkflow;
      if (
        diagnosticReads !== beforeHelp ||
        helpSubmission.text !== "/oc-beads:diagnostics  HeLp " ||
        helpSubmission.files !== invocation.prompt.files ||
        helpSubmission.delivery !== invocation.delivery ||
        helpSnapshot.version !== 1 ||
        !helpSnapshot.instructions.includes("Beads diagnostics help") ||
        !helpSnapshot.instructions.includes(
          "https://github.com/snarkipus/opencode-beads/blob/main/docs/diagnostics.md",
        ) ||
        helpSnapshot.instructions.includes("Details: ") ||
        !helpSnapshot.instructions.includes("\nBEGIN_DIAGNOSTIC_REPORT\n## Beads diagnostics help") ||
        !helpSnapshot.instructions.endsWith(reportFooter)
      )
        throw new Error("Packed static help collected or changed input/snapshot");
      const persistedHelp = JSON.stringify(helpSubmission);
      for (const kind of ["context", "compaction"]) {
        const id = `packed-help-${kind}`;
        const event = stageReplay(
          id,
          String(helpSubmission.text),
          helpSubmission.metadata as StoredUserMessage["metadata"],
        );
        await requestHooks.get(kind)!(event);
        if (
          event.messages[0]?.content[0]?.type !== "text" ||
          event.messages[0].content[0].text !== helpSnapshot.instructions
        )
          throw new Error(`Packed help replay changed: ${kind}`);
        const once = JSON.stringify(event.messages);
        await requestHooks.get(kind)!(event);
        if (JSON.stringify(event.messages) !== once) throw new Error("Packed help replay duplicates");
      }
      if (JSON.stringify(helpSubmission) !== persistedHelp) throw new Error("Packed help mutated persisted input");
    }

    /**
     * Verify installed guidance and replay through current and legacy snapshot routing.
     * @param definition Registered command whose description and resource must survive installation.
     * @param submitted Captured prompt supplying compact history text and the replay snapshot, checked for mutation after replay.
     */
    async function checkWorkflow(definition: CommandDefinition, submitted: Record<string, unknown>): Promise<void> {
      const { text } = submitted;
      if (text !== `/${definition.name} ${invocation.prompt.text}`)
        throw new Error(`Packed workflow history is not compact: ${definition.name}`);
      const metadata = submitted.metadata as { ocBeadsWorkflow?: { version: number; instructions: string } };
      const snapshot = metadata?.ocBeadsWorkflow;
      if (
        !snapshot ||
        snapshot.version !== 1 ||
        Object.keys(metadata).join() !== "ocBeadsWorkflow" ||
        !snapshot.instructions.startsWith(
          `Invoked command: /${definition.name}\nRequested outcome: ${definition.description}\n`,
        ) ||
        !snapshot.instructions.includes(JSON.stringify(installedSkillPath))
      )
        throw new Error(`Packed workflow lost static installed instructions: ${definition.name}`);
      const stem = definition.name.slice("oc-beads:".length) as keyof typeof workflows.WORKFLOWS;
      const supporting = path.resolve(
        path.dirname(installedSkillPath),
        "resources",
        `${workflows.WORKFLOWS[stem][1]}.md`,
      );
      if (
        !snapshot.instructions.endsWith(`Supporting guidance: ${JSON.stringify(supporting)}`) ||
        !(await fs.readFile(supporting, "utf8")).trim()
      )
        throw new Error(`Packed workflow resource differs: ${definition.name}`);
      const stored = JSON.stringify(submitted);
      for (const kind of ["context", "compaction"]) {
        for (const [routingIndex, routing] of [metadata, { ocBeadsSync: snapshot }].entries()) {
          const id = `packed-workflow-${kind}-${routingIndex}`;
          const event = stageReplay(id, text, routing as StoredUserMessage["metadata"]);
          if (Object.hasOwn(event.messages[0]!, "metadata"))
            throw new Error("SDK projection unexpectedly retained request metadata");
          await requestHooks.get(kind)!(event);
          const expanded = JSON.stringify(event.messages);
          if (
            /ocBeadsWorkflow|ocBeadsSync/.test(expanded) ||
            expanded.split("Invoked command:").length !== 2 ||
            event.messages[0]?.content[0]?.type !== "text" ||
            event.messages[0].content[0].text !== snapshot.instructions ||
            !expanded.includes("With sufficient inputs, perform the requested operation")
          )
            throw new Error(`Packed workflow effective context lost installed instructions: ${definition.name}`);
          await requestHooks.get(kind)!(event);
          if (JSON.stringify(event.messages) !== expanded || JSON.stringify(submitted) !== stored)
            throw new Error("Packed workflow expansion mutated storage or duplicated instructions");
        }
      }
      if (requestHooks.has("title") || requestHooks.has("generate"))
        throw new Error("Packed workflow expanded auxiliary context");
    }

    // Invoke in registry order and check each captured prompt before the next command runs.
    for (const definition of commands.values()) {
      if (typeof definition.execute !== "function" || !definition.description)
        throw new Error(`Missing native body: ${definition.name}`);
      await definition.execute(invocation);
      const submitted = prompts.at(-1);
      if (
        !submitted ||
        typeof submitted.text !== "string" ||
        !submitted.text.includes(invocation.prompt.text) ||
        submitted.sessionID !== invocation.sessionID ||
        submitted.delivery !== invocation.delivery ||
        submitted.files !== invocation.prompt.files ||
        submitted.agents !== invocation.prompt.agents ||
        submitted.skills !== invocation.prompt.skills
      ) {
        throw new Error(`Packed command did not preserve native invocation: ${definition.name}`);
      }
      if (definition.name === "oc-beads:diagnostics") {
        await checkDiagnostics(definition, submitted);
      } else {
        await checkWorkflow(definition, submitted);
      }
    }
    if (prompts.length !== commands.size + 2)
      throw new Error(
        "Packed native invocations did not each submit one prompt (including explicit diagnostics details and help)",
      );
    for (const stem of Object.keys(workflows.WORKFLOWS)) {
      for (const text of ["", "explain only", "  ", "first line\r\n  second line\r\n"]) {
        await commands.get(`oc-beads:${stem}`)!.execute({ ...invocation, prompt: { ...invocation.prompt, text } });
        const submitted = prompts.at(-1)!;
        const visible = `/oc-beads:${stem}${text ? `${/[\r\n]/.test(text) ? "\n" : " "}${text}` : ""}`;
        if (submitted.text !== visible)
          throw new Error("Installed workflow callback lost bare action or literal details");
      }
    }
    // Dispose this setup before inspecting the handles or starting the next configuration.
    await cleanup();
    const expectedOwned = [
      "agent",
      "skill",
      "command",
      "tool:execute.after",
      "tool:transform",
      ...registeredHooks.map((name) => `hook:${name}`),
    ].sort();
    if (
      [...owned].sort().join("\0") !== expectedOwned.join("\0") ||
      [...disposed].sort().join("\0") !== expectedOwned.join("\0")
    ) {
      throw new Error("Owned native registrations were not all disposed");
    }
    return { registeredHooks, agents };
  }

  // Replay the full setup, invocation and disposal sequence for each option set.
  const vanilla = await exercisePackedSetup({});
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
  if (vanilla.agents.has("beads-task-agent-terra")) {
    throw new Error("Packed plugin enabled Terra without an opt-in");
  }
  if (vanilla.agents.has("beads-task-agent-luna")) {
    throw new Error("Packed plugin enabled Luna without an opt-in");
  }
  const luna = (await exercisePackedSetup({ luna: true })).agents.get("beads-task-agent-luna");
  const lunaModel = luna?.model as { providerID?: string; id?: string; variant?: string } | undefined;
  if (
    lunaModel?.providerID !== "openai" ||
    lunaModel.id !== "gpt-6-luna" ||
    lunaModel.variant !== "max" ||
    luna?.system !== taskAgentPrompt ||
    luna?.mode !== "subagent"
  ) {
    throw new Error("Packed plugin did not register the shared Luna Max profile");
  }
  const both = await exercisePackedSetup({ luna: true, terra: true });
  const terra = both.agents.get("beads-task-agent-terra");
  const terraModel = terra?.model as { providerID?: string; id?: string; variant?: string } | undefined;
  if (
    terraModel?.providerID !== "openai" ||
    terraModel.id !== "gpt-6.1-terra" ||
    terraModel.variant !== "medium" ||
    terra?.system !== taskAgentPrompt ||
    terra?.mode !== "subagent" ||
    terra?.steps !== taskAgent.steps ||
    JSON.stringify(terra?.permissions) !== JSON.stringify(taskAgent.permissions) ||
    !both.agents.has("beads-task-agent-luna")
  ) {
    throw new Error("Packed plugin did not register the shared Terra Medium profile alongside Luna");
  }
  const cli = path.join(consumerDir, "node_modules", ".bin", "opencode-beads");
  if (await fs.exists(cli)) throw new Error("Packed package unexpectedly installed a companion CLI");

  // Recheck the same tarball after the consumer and all setup scenarios have finished.
  const finalArchiveChecksum = await hashArchive(archive);
  if (finalArchiveChecksum !== archiveChecksum) {
    throw new Error("Package archive changed during consumer validation");
  }

  console.log(`Validated ${archiveName} (${archiveChecksum}); loaded packed V2 plugin`);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
