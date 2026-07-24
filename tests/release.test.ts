import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectReleaseArchive,
  prepareReleaseArchive,
  releaseOutputPath,
  validateReleaseMetadata,
  verifyReleaseArchive,
} from "../scripts/release";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectories: string[] = [];
const packageManifest = JSON.parse(
  await fs.readFile(join(projectDirectory, "package.json"), "utf8")
) as { name: string; version: string };

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true })
    )
  );
});

async function metadataFixture(): Promise<string> {
  const directory = await fs.mkdtemp(join(tmpdir(), "opencode-beads-release-metadata-"));
  temporaryDirectories.push(directory);
  await fs.writeFile(
    join(directory, "package.json"),
    JSON.stringify({ name: "@scope/package", version: "1.2.3" })
  );
  await fs.writeFile(join(directory, "CHANGELOG.md"), "## [1.2.3]\n");
  await fs.writeFile(
    join(directory, "README.md"),
    "bunx @scope/package@1.2.3 init\n"
  );
  return directory;
}

describe("release artifact identity", () => {
  test("emits an explicit local archive path for npm", () => {
    expect(releaseOutputPath("/checkout", "/checkout/release-artifacts/package.tgz")).toBe(
      "./release-artifacts/package.tgz"
    );
  });

  test("rejects tag, changelog, and README version mismatches", async () => {
    const tag = await metadataFixture();
    await expect(validateReleaseMetadata(tag, "v1.2.4")).rejects.toThrow(
      "does not match package version"
    );

    const changelog = await metadataFixture();
    await fs.writeFile(join(changelog, "CHANGELOG.md"), "## [1.2.2]\n");
    await expect(validateReleaseMetadata(changelog, "v1.2.3")).rejects.toThrow(
      "has no release heading"
    );

    const readme = await metadataFixture();
    await fs.writeFile(join(readme, "README.md"), "bunx @scope/package@1.2.2 init\n");
    await expect(validateReleaseMetadata(readme, "v1.2.3")).rejects.toThrow(
      "expected 1.2.3"
    );
  });

  test("allows only the pinned 0.8.0 removal command as a legacy README reference", async () => {
    const directory = await metadataFixture();
    await fs.writeFile(
      join(directory, "README.md"),
      "install @scope/package@1.2.3\nbunx @scope/package@0.8.0 remove\n"
    );
    await expect(validateReleaseMetadata(directory, "v1.2.3")).resolves.toEqual({
      name: "@scope/package",
      version: "1.2.3",
    });

    await fs.appendFile(join(directory, "README.md"), "bunx @scope/package@0.8.0 update\n");
    await expect(validateReleaseMetadata(directory, "v1.2.3")).rejects.toThrow(
      "references @scope/package@0.8.0"
    );

    const modifiedRemoval = await metadataFixture();
    await fs.appendFile(
      join(modifiedRemoval, "README.md"),
      "bunx @scope/package@0.8.0 remove --global\n"
    );
    await expect(validateReleaseMetadata(modifiedRemoval, "v1.2.3")).rejects.toThrow(
      "references @scope/package@0.8.0"
    );
  });

  test("builds, inspects, and verifies one immutable publication archive", async () => {
    const root = await fs.mkdtemp(join(tmpdir(), "opencode-beads-release-"));
    temporaryDirectories.push(root);
    const capstoneArchive = process.env.CAPSTONE_ARCHIVE;
    const capstoneSha256 = process.env.CAPSTONE_SHA256;
    if ((capstoneArchive === undefined) !== (capstoneSha256 === undefined)) {
      throw new Error("CAPSTONE_ARCHIVE and CAPSTONE_SHA256 must be provided together");
    }
    const prepared =
      capstoneArchive && capstoneSha256
        ? await verifyReleaseArchive(projectDirectory, capstoneArchive, capstoneSha256)
        : await prepareReleaseArchive(
            projectDirectory,
            `v${packageManifest.version}`,
            join(root, "out")
          );
    const archiveName = `${packageManifest.name.slice(1).replace("/", "-")}-${packageManifest.version}.tgz`;
    expect(prepared.path.endsWith(archiveName)).toBeTrue();
    expect(prepared.sha256).toMatch(/^[a-f0-9]{64}$/);

    await expect(
      verifyReleaseArchive(projectDirectory, prepared.path, prepared.sha256)
    ).resolves.toEqual(prepared);

    const changed = join(root, "changed.tgz");
    await fs.copyFile(prepared.path, changed);
    await fs.appendFile(changed, "changed");
    await expect(
      verifyReleaseArchive(projectDirectory, changed, prepared.sha256)
    ).rejects.toThrow("Release archive digest changed");

    const npmRehearsalDirectory = join(root, "npm-pack-rehearsal");
    await fs.mkdir(npmRehearsalDirectory);
    const npmPack = Bun.spawn(
      ["npm", "pack", prepared.path, "--dry-run", "--json", "--ignore-scripts"],
      { cwd: npmRehearsalDirectory, stdout: "pipe", stderr: "pipe" }
    );
    const [npmPackOutput, npmPackError, npmPackExit] = await Promise.all([
      new Response(npmPack.stdout).text(),
      new Response(npmPack.stderr).text(),
      npmPack.exited,
    ]);
    expect(npmPackExit, npmPackError).toBe(0);
    const npmReports = JSON.parse(npmPackOutput) as Array<{
      id: string;
      name: string;
      version: string;
      filename: string;
      entryCount: number;
      files: Array<{ path: string }>;
    }>;
    expect(npmReports).toHaveLength(1);
    const npmReport = npmReports[0];
    expect(npmReport?.id).toBe(`${packageManifest.name}@${packageManifest.version}`);
    expect(npmReport?.name).toBe(packageManifest.name);
    expect(npmReport?.version).toBe(packageManifest.version);
    expect(npmReport?.filename).toBe(basename(prepared.path));

    const tar = Bun.spawn(["tar", "-tzf", prepared.path], {
      cwd: projectDirectory,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [tarOutput, tarError, tarExit] = await Promise.all([
      new Response(tar.stdout).text(),
      new Response(tar.stderr).text(),
      tar.exited,
    ]);
    expect(tarExit, tarError).toBe(0);
    const archiveEntryCount = tarOutput
      .split("\n")
      .filter((entry) => entry.startsWith("package/") && !entry.endsWith("/")).length;
    expect(npmReport?.entryCount).toBe(archiveEntryCount);
    expect(npmReport?.files).toHaveLength(archiveEntryCount);
  });

  test("rejects malformed archive inventory", async () => {
    const root = await fs.mkdtemp(join(tmpdir(), "opencode-beads-release-malformed-"));
    temporaryDirectories.push(root);
    const packageDirectory = join(root, "package");
    await fs.mkdir(packageDirectory);
    await fs.writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify({ name: "@snarkipus/opencode-beads", version: "0.7.0" })
    );
    const archive = join(root, "malformed.tgz");
    const tar = Bun.spawn(["tar", "-czf", archive, "package"], { cwd: root });
    expect(await tar.exited).toBe(0);

    await expect(inspectReleaseArchive(projectDirectory, archive)).rejects.toThrow(
      "Release archive inventory differs"
    );
  });

  test("routes every release consumer through the prepared archive output", async () => {
    const workflow = await fs.readFile(
      join(projectDirectory, ".github/workflows/release.yml"),
      "utf8"
    );
    expect(workflow.match(/steps\.package\.outputs\.archive/g)).toHaveLength(3);
    expect(workflow).toContain("ARCHIVE: ${{ steps.package.outputs.archive }}");
    expect(workflow).toContain('node-version: "24"');
    expect(workflow).toContain('registry-url: "https://registry.npmjs.org"');
    expect(workflow).toContain("package-manager-cache: false");
    expect(workflow).toContain("npm install --global npm@11.10.1");
    expect(workflow).toContain("NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}");
    expect(workflow).toContain('npm publish "$ARCHIVE" --access public');
    expect(workflow).not.toMatch(/npm publish\s*(?:\n|$)/);
  });
});
