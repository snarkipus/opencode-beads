import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  createVendorManifest,
  selectStableRelease,
  selectStableTag,
  serializeVendorManifest,
  validateVendorManifest,
  VENDOR_MANIFEST,
} from "../src/vendor-provenance";

const temporaryDirectories: string[] = [];
const repository = "https://github.com/gastownhall/beads.git";
const commit = "0123456789abcdef0123456789abcdef01234567";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true })
    )
  );
});

async function createVendorFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "vendor-provenance-"));
  temporaryDirectories.push(directory);
  await fs.mkdir(path.join(directory, "agents"));
  await fs.mkdir(path.join(directory, "commands"));
  await fs.writeFile(path.join(directory, "agents", "task-agent.md"), "agent\n");
  await fs.writeFile(path.join(directory, "commands", "ready.md"), "ready\n");
  return directory;
}

function tagLine(tag: string, sha = commit): string {
  return `${sha}\trefs/tags/${tag}`;
}

describe("vendor provenance", () => {
  test("selects the newest stable semver tag regardless of input ordering", () => {
    const output = [
      tagLine("v1.9.9"),
      tagLine("v2.0.0-rc.1"),
      tagLine("release-latest"),
      tagLine("v1.10.0"),
      tagLine("v1.10.0+build"),
      "malformed line",
    ].join("\n");

    expect(selectStableTag(output)).toBe("v1.10.0");
    expect(selectStableTag(`${tagLine("v2.0.0")}\n${tagLine("v1.99.0")}`)).toBe(
      "v2.0.0"
    );
  });

  test("resolves lightweight and annotated tags to exact commits", () => {
    const tagObject = "1234567890abcdef1234567890abcdef12345678";
    const peeledCommit = "abcdef0123456789abcdef0123456789abcdef01";
    expect(selectStableRelease(tagLine("v1.2.3"))).toEqual({
      tag: "v1.2.3",
      commit,
    });
    expect(
      selectStableRelease(
        `${tagLine("v2.0.0", tagObject)}\n${tagLine("v2.0.0^{}", peeledCommit)}`
      )
    ).toEqual({ tag: "v2.0.0", commit: peeledCommit });
    expect(
      selectStableRelease(
        `${tagLine("v2.0.0^{}", peeledCommit)}\n${tagLine("v2.0.0", tagObject)}`
      )
    ).toEqual({ tag: "v2.0.0", commit: peeledCommit });
  });

  test("rejects empty, prerelease-only, and malformed tag results", () => {
    expect(() => selectStableTag("")).toThrow("No stable semver Beads tags found");
    expect(() => selectStableTag(tagLine("v2.0.0-beta.1"))).toThrow(
      "No stable semver Beads tags found"
    );
    expect(() => selectStableTag("not-a-git-reference")).toThrow(
      "No stable semver Beads tags found"
    );
    expect(() =>
      selectStableTag(`${tagLine("v1.2.3")}\n${tagLine("v1.2.3", "a".repeat(40))}`)
    ).toThrow("Conflicting commits for vendor tag");
  });

  test("creates deterministic sorted checksums and validates them", async () => {
    const directory = await createVendorFixture();
    const first = await createVendorManifest(directory, repository, "v1.2.3", commit);
    const second = await createVendorManifest(directory, repository, "v1.2.3", commit);
    expect(serializeVendorManifest(first)).toBe(serializeVendorManifest(second));
    expect(first.files.map((file) => file.path)).toEqual([
      "agents/task-agent.md",
      "commands/ready.md",
    ]);

    await fs.writeFile(
      path.join(directory, VENDOR_MANIFEST),
      serializeVendorManifest(first)
    );
    await expect(validateVendorManifest(directory)).resolves.toEqual(first);
  });

  test("rejects missing paths, checksum changes, and inventory differences", async () => {
    const emptyDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "vendor-empty-"));
    temporaryDirectories.push(emptyDirectory);
    await expect(
      createVendorManifest(emptyDirectory, repository, "v1.2.3", commit)
    ).rejects.toThrow();

    const checksumDirectory = await createVendorFixture();
    const checksumManifest = await createVendorManifest(
      checksumDirectory,
      repository,
      "v1.2.3",
      commit
    );
    await fs.writeFile(
      path.join(checksumDirectory, VENDOR_MANIFEST),
      serializeVendorManifest(checksumManifest)
    );
    await fs.writeFile(path.join(checksumDirectory, "commands", "ready.md"), "changed\n");
    await expect(validateVendorManifest(checksumDirectory)).rejects.toThrow(
      "Vendor checksum mismatch"
    );

    const inventoryDirectory = await createVendorFixture();
    const inventoryManifest = await createVendorManifest(
      inventoryDirectory,
      repository,
      "v1.2.3",
      commit
    );
    await fs.writeFile(
      path.join(inventoryDirectory, VENDOR_MANIFEST),
      serializeVendorManifest(inventoryManifest)
    );
    await fs.writeFile(path.join(inventoryDirectory, "commands", "extra.md"), "extra\n");
    await expect(validateVendorManifest(inventoryDirectory)).rejects.toThrow(
      "Vendor file inventory differs"
    );

    await fs.rm(path.join(inventoryDirectory, "commands", "extra.md"));
    await fs.rm(path.join(inventoryDirectory, "commands", "ready.md"));
    await expect(validateVendorManifest(inventoryDirectory)).rejects.toThrow(
      "Vendor file inventory differs"
    );
  });

  test("rejects source path provenance changes", async () => {
    const directory = await createVendorFixture();
    const manifest = await createVendorManifest(directory, repository, "v1.2.3", commit);
    const invalidManifest = {
      ...manifest,
      sources: [{ source: "unexpected", target: "commands" }],
    };
    await fs.writeFile(
      path.join(directory, VENDOR_MANIFEST),
      `${JSON.stringify(invalidManifest)}\n`
    );

    await expect(validateVendorManifest(directory)).rejects.toThrow(
      "Vendor source paths differ"
    );
  });

  test("strictly rejects malformed manifest records", async () => {
    const directory = await createVendorFixture();
    const manifest = await createVendorManifest(directory, repository, "v1.2.3", commit);
    const invalidManifest = {
      ...manifest,
      files: [{ ...manifest.files[0], unexpected: true }, ...manifest.files.slice(1)],
    };
    await fs.writeFile(
      path.join(directory, VENDOR_MANIFEST),
      `${JSON.stringify(invalidManifest)}\n`
    );

    await expect(validateVendorManifest(directory)).rejects.toThrow(
      "Vendor file record has unexpected or missing fields"
    );
  });

  test("rejects provenance that differs from the resolved release", async () => {
    const directory = await createVendorFixture();
    const manifest = await createVendorManifest(directory, repository, "v1.2.3", commit);
    await fs.writeFile(
      path.join(directory, VENDOR_MANIFEST),
      serializeVendorManifest(manifest)
    );

    await expect(
      validateVendorManifest(directory, {
        repository,
        tag: "v1.2.4",
        commit,
      })
    ).rejects.toThrow("Vendor release provenance differs");
  });
});
