import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectReleaseArchive,
  prepareReleaseArchive,
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

    const dryPublish = Bun.spawn(
      ["npm", "publish", prepared.path, "--dry-run", "--ignore-scripts"],
      { cwd: projectDirectory, stdout: "ignore", stderr: "pipe" }
    );
    const dryPublishError = await new Response(dryPublish.stderr).text();
    expect(await dryPublish.exited, dryPublishError).toBe(0);
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
    expect(workflow).toContain('npm publish "$ARCHIVE" --access public');
    expect(workflow).not.toMatch(/npm publish\s*(?:\n|$)/);
  });
});
