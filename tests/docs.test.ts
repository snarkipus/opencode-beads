import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { MINIMUM_BD_VERSION } from "../src/guard";

const readme = await fs.readFile("README.md", "utf8");
const changelog = await fs.readFile("CHANGELOG.md", "utf8");
const sdkContract = await fs.readFile("docs/opencode-sdk-contract.md", "utf8");
const artifactPolicy = await fs.readFile("docs/beads-artifact-policy.md", "utf8");
const parity = await fs.readFile("docs/claude-code-parity.md", "utf8");
const packageManifest = JSON.parse(await fs.readFile("package.json", "utf8")) as {
  name: string;
  version: string;
  contributors?: Array<{ name?: string; url?: string }>;
  beads: { minimum: string; validated: string };
  peerDependencies: Record<string, string>;
  peerDependenciesMeta: Record<string, { optional?: boolean }>;
  devDependencies: Record<string, string>;
};
const packageIdentity = `${packageManifest.name}@${packageManifest.version}`;

describe("documentation contracts", () => {
  test("uses current package, command, and upstream identities", () => {
    // Old `/bd-*` slash commands; a path segment such as `scripts/bd-contract.ts` is fine.
    expect(readme).not.toMatch(/(?<![\w.])\/bd-[a-z]/);
    expect(readme).not.toContain("github.com/steveyegge");
    expect(readme).toContain("https://github.com/gastownhall/beads");
    expect(readme).toContain(`"plugins": ["${packageIdentity}"]`);
    expect(readme).not.toContain(`"plugin": [`);

    const documentedVersions = [
      ...readme.matchAll(
        new RegExp(`${packageManifest.name.replace("/", "\\/")}@(\\d+\\.\\d+\\.\\d+)`, "g")
      ),
    ].map((match) => match[1]);
    expect(documentedVersions.length).toBeGreaterThan(0);
    expect(new Set(documentedVersions)).toEqual(new Set([packageManifest.version]));
  });

  test("presents the 1.x contract and credits the original project", () => {
    expect(packageManifest.version).toMatch(/^1\.\d+\.\d+$/);
    expect(readme).not.toContain("This plugin is intentionally small in scope");
    expect(readme).not.toContain("limits its scope to bug fixes");
    expect(readme).toContain("maintained OpenCode adapter");
    expect(readme).not.toContain("managed companion skill lifecycle");
    expect(readme).toContain("https://github.com/joshuadavidthomas/opencode-beads");
    expect(readme).toContain("Josh Thomas");
    expect(packageManifest.contributors).toContainEqual({
      name: "Josh Thomas",
      url: "https://github.com/joshuadavidthomas",
    });
    expect(changelog).toContain("## [0.8.0]");
    expect(changelog).toContain("## [0.9.0]");
    expect(changelog).toContain("## [0.9.1]");
    expect(changelog).toContain("## [0.9.2]");
    expect(changelog).toContain("## [0.9.3]");
    expect(changelog).toContain("## [0.9.4]");
    expect(changelog).toContain("## [0.10.0]");
    expect(changelog).toContain("## [1.0.0]");
    expect(changelog).toContain("## [1.0.1]");
    expect(changelog).toContain(
      "[0.8.0]: https://github.com/snarkipus/opencode-beads/releases/tag/v0.8.0"
    );
  });

  test("documents canonical per-project initialization and current ownership boundaries", () => {
    for (const required of [
      "Install the [`bd` CLI]",
      "git init",
      "bd init",
      "creates the canonical shared Beads skill",
      "`.agents/skills/beads`",
      "The beta/next source candidate additionally owns its packaged `oc-beads` skill",
      "does not write startup files",
      "Update the pin explicitly when upgrading",
      "**Do not run `bd setup opencode`.**",
      "| `bd setup claude` (Claude Code) | This plugin (OpenCode 2) |",
      "`bd setup opencode --remove`",
    ]) {
      expect(readme).toContain(required);
    }
    expect(readme).not.toContain("Upgrading from 0.8.0");
    expect(readme).not.toContain("bunx @snarkipus/opencode-beads@0.8.0 remove");
    expect(artifactPolicy).toContain("not by `bd setup opencode`");
    expect(readme).not.toContain("/beads:setup");
    expect(artifactPolicy).toContain(
      "The canonical `.agents/skills/beads` is created by `bd init`'s automatic Codex project integration"
    );
  });

  test("keeps changelog headings unique and current links pointing at this repository", () => {
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
      "docs/claude-code-parity.md",
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

  test("keeps the compatibility record on the selected beta/next OpenCode baseline", () => {
    expect(sdkContract).toContain("# OpenCode V2 Plugin Contract");
    expect(packageManifest.peerDependencies["@opencode/plugin"]).toBe(">=2.1.1 <2.2");
    expect(packageManifest.peerDependenciesMeta["@opencode/plugin"]?.optional).toBeTrue();
    expect(packageManifest.devDependencies["@opencode/plugin"]).toBe("2.1.1");
    expect(sdkContract).toContain("`@opencode/plugin` `>=2.1.1 <2.2`");
    expect(sdkContract).toContain("`@opencode/plugin` `2.1.1` for development typing only");
    expect(sdkContract).toContain("`<name>/server`, then `<name>`");
    expect(sdkContract).toContain("`session.compaction.ended`");
    expect(sdkContract).toContain("The exact 2.1.1 runtime target has not been qualified");
    expect(sdkContract).not.toContain("1.18.");
    expect(readme).toContain(
      "| OpenCode (beta/next candidate) | `>=2.1.1 <2.2` | None (exact 2.1.1 target not qualified) |"
    );
    expect(readme).toContain("| OpenCode (stable 1.0.2 historical) | 2.0.26 | 2.0.26 |");
    expect(readme).toContain("| `bd` CLI | 1.3.0 through 1.x | 1.3.1 |");
    expect(readme).not.toContain("@opencode-ai/");
  });

  test("keeps the Beads compatibility range in one place", () => {
    const { minimum, validated } = packageManifest.beads;
    expect(minimum).toBe(MINIMUM_BD_VERSION);
    expect(readme).toContain(`| \`bd\` CLI | ${minimum} through 1.x | ${validated} |`);
    expect(readme).toContain(`reviewed against Beads v${validated}`);
    expect(readme).toContain("`bd` 1.3.0 or later");
    expect(readme).toContain("beads-contract");
    expect(artifactPolicy).toContain("scripts/bd-contract.ts");
    expect(artifactPolicy).toContain("REASSESS:");
  });

  test("records Claude Code parity with live evidence and explicit divergences", () => {
    expect(readme).toContain("[Claude Code parity matrix](docs/claude-code-parity.md)");
    expect(parity).toContain("validated on **OpenCode 2.0.26** with **bd 1.3.1**");
    for (const source of ["`startup`", "`resume`", "`clear`", "`compact`"]) {
      expect(parity).toContain(`\`SessionStart\` (${source})`);
    }
    for (const row of ["Minimal `CLAUDE.md` pointer", "`--stealth`", "`--remove`", "`--check`", "Hook errors are visible"]) {
      expect(parity).toContain(row);
    }
    for (const heading of ["## Beyond Claude Code", "## Deliberate divergences", "## Not exercised"]) {
      expect(parity).toContain(heading);
    }
    for (const option of ["refreshAfterIdleMinutes", "stealth", "taskAgentSteps", "autoMigrate", "luna"]) {
      expect(readme).toContain(`| \`${option}\` |`);
    }
  });

  test("documents the schema migration guard and plugin options", () => {
    expect(readme).toContain("## Schema migration guard");
    expect(readme).toContain("`bd --readonly` does not prevent that");
    expect(readme).toContain("`bd migrate schema`");
    expect(readme).toContain("| `autoMigrate` | `false` |");
    expect(readme).toContain("| `luna` | `false` |");
    expect(readme).not.toContain('"beads-task-agent-luna": {}');
    expect(artifactPolicy).toContain("schema migration guard");
  });

  test("documents upstream-aligned full-prime context boundaries", () => {
    expect(readme).toContain("runs `bd prime --full`");
    expect(readme).not.toContain("runs `bd prime --memories-only`");
    expect(readme).toContain("bounded standalone quick reference");
    expect(sdkContract).toContain('Bun.spawn(["bd", "prime"]');
    expect(artifactPolicy).toContain("Claude Code plugin manifests both run full `bd prime`");
    expect(artifactPolicy).toContain(
      "`PreCompact` uses `--memories-only` only to check context availability"
    );
    expect(artifactPolicy).toContain("eligible primary agents and `beads-task-agent`");
  });

  test("records the retired vendoring decision and the historical baselines", () => {
    expect(readme).toContain("The package vendors nothing from upstream.");
    expect(readme).toContain("The `bd` baseline was reviewed against Beads v1.3.1");
    expect(readme).toContain("c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c");
    expect(artifactPolicy).toContain("The package vendors no upstream Beads artifacts.");
    expect(artifactPolicy).toContain("| `agents/task-agent.md` | Retired in 1.0.0 (`opencode-beads-w5y`) |");
    expect(artifactPolicy).toContain("### Rationale for retiring vendoring");
    expect(artifactPolicy).toContain("Codex ships skills and hooks but no agent.");
    expect(artifactPolicy).toContain("`v1.0.5` plugin manifest incorrectly referenced `./hooks/hooks.json`");
    expect(artifactPolicy).toContain(
      "`v1.1.0` corrected the operational path to `./.codex-plugin/hooks/hooks.json`"
    );
    expect(artifactPolicy).toContain(
      "Earlier baselines were Beads `v1.2.2`, commit `6c124203e771433a3550c348771a5b5e27fd3c21`"
    );
  });

  test("documents the withdrawn-guidance recovery boundary", () => {
    const recoveryGuide =
      "https://github.com/gastownhall/beads/blob/v1.2.2/docs/RECOVERY-1.2.1.md";
    for (const document of [readme, changelog, artifactPolicy]) {
      expect(document).toContain("did not bundle");
      expect(document).toContain("implement database migrations");
      expect(document).toContain("consumer-installed");
      expect(document).toContain("`bd prime`");
      expect(document).toMatch(/even one v1\.2\.1 execution could migrate the database/i);
      expect(document).toContain("v1.2.1");
      expect(document).toContain(recoveryGuide);
    }
    expect(readme).toContain("if v1.2.1 was installed and may have run");
    expect(artifactPolicy).toContain("upstream v1.2.2 database recovery guidance");
    expect(artifactPolicy).toContain("local repository commit `e51b8fe`");
  });

  test("documents context-preserving atomic delegation and runtime provenance", () => {
    expect(readme).toContain("context-preserving atomic delegation");
    expect(readme).not.toContain("Autonomous issue completion");
    expect(readme).toContain("exactly one Bead per invocation");
    expect(readme).toContain("primary OpenCode thread retains planning context, decisions, and control");
    expect(readme).toContain("unknown custom primary agents");
    expect(readme).toContain("Known regular subagents remain excluded");
    expect(artifactPolicy).toContain("metadata, provenance, and compatibility validation");
    expect(artifactPolicy).toContain("project-owned bounded OpenCode adaptation");
    expect(artifactPolicy).toContain("does not execute upstream's autonomous multi-task loop");
    expect(artifactPolicy).toContain("fail open for context injection");
  });

  test("retains compact OpenCode-specific runtime policy", () => {
    expect(readme).toContain("validate before closure");
    expect(artifactPolicy).toContain("prohibits automatic commit, push, or Dolt synchronization");
    expect(artifactPolicy).not.toContain("companion lifecycle CLI");
    expect(artifactPolicy).not.toContain("project-owned CLI");
  });
});
