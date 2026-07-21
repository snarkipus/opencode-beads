import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { dirname, resolve } from "node:path";

const readme = await fs.readFile("README.md", "utf8");
const changelog = await fs.readFile("CHANGELOG.md", "utf8");
const sdkContract = await fs.readFile("docs/opencode-sdk-contract.md", "utf8");
const packageManifest = JSON.parse(await fs.readFile("package.json", "utf8")) as {
  name: string;
  version: string;
};
const packageIdentity = `${packageManifest.name}@${packageManifest.version}`;

describe("documentation contracts", () => {
  test("uses current package, command, and upstream identities", () => {
    expect(readme).not.toMatch(/\/bd-[a-z]/);
    expect(readme).not.toContain("github.com/joshuadavidthomas");
    expect(readme).not.toContain("github.com/steveyegge");
    expect(readme).toContain("https://github.com/gastownhall/beads");
    expect(readme).toContain(`"plugin": ["${packageIdentity}"]`);

    const documentedVersions = [
      ...readme.matchAll(
        new RegExp(`${packageManifest.name.replace("/", "\\/")}@(\\d+\\.\\d+\\.\\d+)`, "g")
      ),
    ].map((match) => match[1]);
    expect(documentedVersions.length).toBeGreaterThan(0);
    expect(new Set(documentedVersions)).toEqual(new Set([packageManifest.version]));
  });

  test("documents the complete managed lifecycle contract", () => {
    for (const command of ["init", "check", "update", "remove"]) {
      expect(readme).toContain(`bunx ${packageIdentity} ${command} [--global]`);
    }
    for (const state of ["missing", "current", "stale", "modified", "conflicting"]) {
      expect(readme).toContain(`| \`${state}\` |`);
    }
    for (const required of [
      "--dry-run",
      "--json",
      "<worktree>/.opencode/skills/beads",
      "$XDG_CONFIG_HOME/opencode/skills/beads",
      "passive npm discovery is unsupported",
      "Plugin startup is read-only",
      "there is no force option",
      "`/beads:init` remains DB-only",
      "package CLI is the canonical lifecycle",
    ]) {
      expect(readme).toContain(required);
    }
  });

  test("documents stale and current lifecycle semantics exactly", () => {
    expect(readme).toContain(
      "The target is recognized and unmodified, but its managed package or provenance metadata differs from the running package."
    );
    expect(readme).not.toContain("managed package or provenance metadata is older");
    expect(readme).toContain("`init` and `update` are no-ops for current targets.");
    expect(readme).toContain(
      "`remove` deletes only a recognized, unmodified current or stale target."
    );
    expect(readme).not.toContain("Current targets are no-ops.");
  });

  test("keeps changelog headings unique and current links fork-owned", () => {
    const headings = changelog
      .split("\n")
      .filter((line) => /^## \[[^\]]+\]$/.test(line) && line !== "## [${version}]");
    expect(new Set(headings).size).toBe(headings.length);
    expect(changelog).toContain(
      `[unreleased]: https://github.com/snarkipus/opencode-beads/compare/v${packageManifest.version}...HEAD`
    );
    expect(changelog).toContain(
      "[${version}]: https://github.com/snarkipus/opencode-beads/releases/tag/v${version}"
    );
  });

  test("resolves checked-in Markdown links", async () => {
    for (const file of [
      "README.md",
      "CHANGELOG.md",
      "docs/beads-artifact-policy.md",
      "docs/opencode-sdk-contract.md",
    ]) {
      const content = await fs.readFile(file, "utf8");
      const links = [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
        .map((match) => match[1])
        .filter(
          (target): target is string =>
            target !== undefined &&
            !target.startsWith("#") &&
            !target.includes("://") &&
            !target.startsWith("mailto:")
        );
      for (const target of links) {
        const path = resolve(dirname(file), target.split("#", 1)[0] ?? "");
        expect(await fs.exists(path), `${file}: ${target}`).toBeTrue();
      }
    }
  });

  test("keeps the compatibility record on the supported OpenCode baseline", () => {
    expect(sdkContract).not.toContain("1.0.148");
    expect(sdkContract).toContain("Minimum `1.18.3` and current stable `1.18.4`");
  });
});
