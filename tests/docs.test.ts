import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { dirname, resolve } from "node:path";

const readme = await fs.readFile("README.md", "utf8");
const changelog = await fs.readFile("CHANGELOG.md", "utf8");
const sdkContract = await fs.readFile("docs/opencode-sdk-contract.md", "utf8");
const artifactPolicy = await fs.readFile("docs/beads-artifact-policy.md", "utf8");
const packageManifest = JSON.parse(await fs.readFile("package.json", "utf8")) as {
  name: string;
  version: string;
  contributors?: Array<{ name?: string; url?: string }>;
};
const packageIdentity = `${packageManifest.name}@${packageManifest.version}`;

describe("documentation contracts", () => {
  test("uses current package, command, and upstream identities", () => {
    expect(readme).not.toMatch(/\/bd-[a-z]/);
    expect(readme).not.toContain("github.com/steveyegge");
    expect(readme).toContain("https://github.com/gastownhall/beads");
    expect(readme).toContain(`"plugin": ["${packageIdentity}"]`);

    const documentedVersions = [
      ...readme.matchAll(
        new RegExp(`${packageManifest.name.replace("/", "\\/")}@(\\d+\\.\\d+\\.\\d+)`, "g")
      ),
    ].map((match) => match[1]);
    expect(documentedVersions.length).toBeGreaterThan(0);
    expect(new Set(documentedVersions)).toEqual(new Set([packageManifest.version, "0.8.0"]));
    expect(readme.match(/bunx @snarkipus\/opencode-beads@0\.8\.0 remove/g)).toHaveLength(1);
  });

  test("presents the 0.9.0 contract and credits the original project", () => {
    expect(packageManifest.version).toBe("0.9.0");
    expect(readme).not.toContain("This plugin is intentionally small in scope");
    expect(readme).not.toContain("limits its scope to bug fixes");
    expect(readme).toContain("maintained fork");
    expect(readme).not.toContain("managed companion skill lifecycle");
    expect(readme).toContain("https://github.com/joshuadavidthomas/opencode-beads");
    expect(readme).toContain("Josh Thomas");
    expect(packageManifest.contributors).toContainEqual({
      name: "Josh Thomas",
      url: "https://github.com/joshuadavidthomas",
    });
    expect(changelog).toContain("## [0.8.0]");
    expect(changelog).toContain("## [0.9.0]");
    expect(changelog).toContain(
      "[0.8.0]: https://github.com/snarkipus/opencode-beads/releases/tag/v0.8.0"
    );
  });

  test("documents canonical per-project initialization and the pinned upgrade path", () => {
    for (const required of [
      "Install the `bd` CLI once on the host",
      "git init",
      "bd init",
      "automatic Codex project integration creates the canonical shared skill",
      "`.agents/skills/beads`",
      "bunx @snarkipus/opencode-beads@0.8.0 remove",
      "Do not substitute 0.9.0 in the removal command",
      "upstream currently has no skill-only setup command",
      "copy only its canonical skill directory",
      "This bounded migration copies only `.agents/skills/beads`",
    ]) {
      expect(readme).toContain(required);
    }
    expect(readme).toContain("Do not run `bd setup codex` as a substitute");
    expect(readme).toContain("it does not copy `.codex` artifacts or generated instruction files");
    expect(artifactPolicy).toContain("not by `bd setup opencode`");
    expect(readme).not.toContain("/beads:setup");
    expect(artifactPolicy).toContain(
      "The canonical `.agents/skills/beads` is created by `bd init`'s automatic Codex project integration"
    );
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

  test("documents upstream-aligned full-prime context boundaries", () => {
    expect(readme).toContain("runs full `bd prime`");
    expect(readme).not.toContain("runs `bd prime --memories-only`");
    expect(readme).toContain("bounded standalone quick reference");
    expect(sdkContract).toContain('Bun.spawn(["bd", "prime"]');
    expect(artifactPolicy).toContain("Claude Code plugin manifests both run full `bd prime`");
    expect(artifactPolicy).toContain(
      "`PreCompact` uses `--memories-only` only to check context availability"
    );
    expect(artifactPolicy).toContain("eligible primary agents and `beads-task-agent`");
  });

  test("records the reviewed Beads v1.1.0 runtime provenance", () => {
    expect(readme).toContain("Command and agent provenance is currently synced from Beads v1.1.0");
    expect(artifactPolicy).toContain("`v1.0.5` plugin manifest incorrectly referenced `./hooks/hooks.json`");
    expect(artifactPolicy).toContain(
      "`v1.1.0` corrected the operational path to `./.codex-plugin/hooks/hooks.json`"
    );
    expect(artifactPolicy).not.toContain("Currently packaged artifact baseline: Beads `v1.0.5`");
  });

  test("retains compact OpenCode-specific runtime policy", () => {
    expect(readme).toContain("validate before closure");
    expect(artifactPolicy).toContain("prohibits automatic commit, push, or Dolt synchronization");
    expect(artifactPolicy).not.toContain("companion lifecycle CLI");
    expect(artifactPolicy).not.toContain("fork-owned CLI");
  });
});
