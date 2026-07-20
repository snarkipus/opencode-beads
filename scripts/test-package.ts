import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-beads-package-"));

async function run(command: string[], cwd = projectDir): Promise<void> {
  const process = Bun.spawn(command, { cwd, stdout: "ignore", stderr: "inherit" });
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} exited with code ${exitCode}`);
  }
}

try {
  await run(["bun", "pm", "pack", "--destination", tempDir, "--quiet"]);
  const archives = (await fs.readdir(tempDir)).filter((file) => file.endsWith(".tgz"));
  if (archives.length !== 1) throw new Error("Expected exactly one package archive");
  const archiveName = archives[0];
  if (!archiveName) throw new Error("Package archive is missing");
  const archive = path.join(tempDir, archiveName);

  const consumerDir = path.join(tempDir, "consumer");
  await fs.mkdir(consumerDir);
  await fs.writeFile(
    path.join(consumerDir, "package.json"),
    JSON.stringify({ private: true, dependencies: { "opencode-beads": archive } })
  );
  await run(["bun", "install", "--ignore-scripts"], consumerDir);

  const packageDir = path.join(consumerDir, "node_modules", "opencode-beads");
  const manifest = JSON.parse(
    await fs.readFile(path.join(packageDir, "package.json"), "utf-8")
  ) as { main?: string };
  if (!manifest.main) throw new Error("Packed package has no main entry");

  const entry = path.join(packageDir, manifest.main);
  const loaded = await import(pathToFileURL(entry).href);
  if (typeof loaded.BeadsPlugin !== "function") {
    throw new Error("Packed package does not export BeadsPlugin");
  }

  const vendorCommands = await fs.readdir(path.join(packageDir, "vendor", "commands"));
  if (vendorCommands.length === 0) throw new Error("Packed package has no vendor commands");

  console.log(`Loaded packed plugin with ${vendorCommands.length} vendor command files`);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
