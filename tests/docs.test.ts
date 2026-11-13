import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { MINIMUM_BD_VERSION } from "../src/guard";

const readme = await fs.readFile("README.md", "utf8");
const userGuide = await fs.readFile("docs/user-guide.md", "utf8");
const docsIndex = await fs.readFile("docs/README.md", "utf8");
const agentGuide = await fs.readFile("AGENTS.md", "utf8");
const changelog = await fs.readFile("CHANGELOG.md", "utf8");
const sdkContract = await fs.readFile("docs/opencode-sdk-contract.md", "utf8");
const sdkHistory = await fs.readFile("docs/history/opencode-sdk-contract-ledger.md", "utf8");
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

/** GitHub-style heading anchors plus explicit `id` attributes in a Markdown document. */
function anchorsOf(markdown: string): Set<string> {
  const anchors = new Set<string>();
  for (const [, heading] of markdown.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    anchors.add(
      (heading ?? "").trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-")
    );
  }
  for (const [, id] of markdown.matchAll(/\bid="([^"]+)"/g)) anchors.add(id ?? "");
  return anchors;
}

describe("documentation contracts", () => {
  test("uses current package, command, and upstream identities", () => {
    // Old `/bd-*` slash commands; a path segment such as `scripts/bd-contract.ts` is fine.
    expect(readme).not.toMatch(/(?<![\w.])\/bd-[a-z]/);
    expect(readme).not.toContain("github.com/steveyegge");
    expect(readme).toContain("https://github.com/gastownhall/beads");
    expect(readme).toContain(`"plugins": ["${packageIdentity}"]`);
    expect(readme).not.toContain(`"plugin": [`);

    for (const document of [readme, userGuide]) {
      const documentedVersions = [
        ...document.matchAll(
          new RegExp(`${packageManifest.name.replace("/", "\\/")}@(\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)`, "g")
        ),
      ].map((match) => match[1]);
      expect(documentedVersions.length).toBeGreaterThan(0);
      expect(new Set(documentedVersions)).toEqual(new Set([packageManifest.version]));
    }
    expect(userGuide).toContain(`"package": "${packageIdentity}"`);
  });

  test("pairs the current release pin with diagnostics and preserves beta.1 migration history", () => {
    expect(readme).toContain(`**${packageManifest.version}**`);
    expect(readme).not.toContain("publication remains pending owner approval");
    const install = readme.split("## Installation")[1]?.split("### Upgrading to")[0] ?? "";
    expect(install).toContain(`"plugins": ["${packageIdentity}"]`);
    expect(install).toContain("`/oc-beads:diagnostics` reports native registration and observed capabilities");
    expect(install).not.toContain("`/oc-beads:status` reports");
    expect(readme).toContain("29 `oc-beads:<stem>` workflows plus `oc-beads:diagnostics`");
    expect(userGuide).toContain("Beta.1 used `oc-beads:status`");
    expect(userGuide).toContain("Starting with beta.2, the package-owned `oc-beads:status` is removed without an alias");
    for (const document of [readme, userGuide]) {
      expect(document).not.toContain("The diagnostics rename is not included in published beta.1 or the current npm `next` artifact");
    }
  });

  test("documents diagnostics replacement, workflow mappings and compact/restore boundaries", async () => {
    expect(userGuide).toContain("29 `oc-beads:<stem>` workflows plus `oc-beads:diagnostics`");
    expect(userGuide).toContain("package-owned `oc-beads:status` is removed without an alias");
    expect(userGuide).toContain("User-defined old status overrides are untouched and are not migrated");
    expect(userGuide).toContain("`bd status` (alias `bd stats`)");
    expect(userGuide).toContain("workflow prompts, not exact CLI aliases");
    expect(userGuide).toContain("`bd admin compact`");
    expect(userGuide).toContain("`bd compact` squashes Dolt history");
    expect(changelog.split("## [1.1.0-beta.1]")[0]).toContain("oc-beads:diagnostics");
    for (const file of ["assets/oc-beads/SKILL.md", "assets/oc-beads/resources/CLI_REFERENCE.md"]) {
      const guidance = await fs.readFile(file, "utf8");
      expect(guidance).toContain("workflow prompts, not exact CLI aliases");
      expect(guidance).toContain("oc-beads:diagnostics");
      expect(guidance).toContain("oc-beads:stats");
    }
    const troubleshooting = await fs.readFile("assets/oc-beads/resources/TROUBLESHOOTING.md", "utf8");
    expect(troubleshooting).toContain("bare invocation");
    expect(troubleshooting).toContain("examples still say `bd compact`");
    expect(troubleshooting).toContain("conflicts with restore's snapshot description");
    const restore = await fs.readFile("assets/oc-beads/resources/RESUMABILITY.md", "utf8");
    expect(restore).toContain("pre-compaction issue content");
    expect(restore).toContain("display-only by default");
    expect(restore).toMatch(/--apply[\s\S]*explicit authority[\s\S]*write/);
    expect(restore).toContain("not database backup recovery");
    const worktrees = await fs.readFile("assets/oc-beads/resources/WORKTREES.md", "utf8");
    expect(worktrees).toContain("Dolt-remote synchronization");
    expect(worktrees).toContain("bd federation sync");
  });

  test("documents bounded invocation authority, operational sync and release scope", async () => {
    expect(userGuide).toContain("**Command invocation:**");
    expect(userGuide).toContain("This action-contract correction starts with beta.3");
    expect(userGuide).toContain("/oc-beads:sync explain");
    for (const file of ["assets/oc-beads/SKILL.md", "assets/oc-beads/resources/CLI_REFERENCE.md"]) {
      const text = await fs.readFile(file, "utf8");
      expect(text).toContain("invocation itself");
      expect(text).toContain("--no-adopt");
      expect(text).toContain("missing configured remote");
    }
    const cli = await fs.readFile("assets/oc-beads/resources/CLI_REFERENCE.md", "utf8");
    expect(cli).toContain("bd sync --no-adopt");
    expect(cli).toContain("--actor='<executor-actor>'");
    expect(cli).toContain("not completion");
    expect(cli).toContain("## Audit and interchange");
    expect(cli).toContain("## Onboarding and discovery");
    const worktrees = await fs.readFile("assets/oc-beads/resources/WORKTREES.md", "utf8");
    expect(worktrees).toContain("CLI_REFERENCE.md#synchronization");
    const troubleshooting = await fs.readFile("assets/oc-beads/resources/TROUBLESHOOTING.md", "utf8");
    expect(troubleshooting).toContain("does not need another generic approval");
    expect(troubleshooting).toContain("## Deletion and identifier migration");
  });

  test("documents stable 2.0 installation, historical pins and known Stop limits", () => {
    expect(userGuide).toContain(`${packageManifest.name}@next`);
    expect(userGuide).toContain(`${packageManifest.name}@latest`);
    expect(userGuide).toContain("normal public entrypoint enables the eleven qualified operations");
    expect(readme).toContain("eleven permissioned operations in the native `beads` code-mode namespace");
    expect(readme).toContain("**Rejecting a permission is not Stop.**");
    for (const document of [readme, userGuide]) {
      expect(document).toContain("Use explicit Stop/Cancel");
    }
    for (const document of [readme, userGuide, sdkContract]) {
      expect(document).not.toContain("typed activation remains withheld");
      expect(document).not.toContain("Ordinary typed continuity execution remains withheld");
    }
  });

  test("presents the stable 2.x contract and credits the original project", () => {
    expect(packageManifest.version).toMatch(/^2\.\d+\.\d+$/);
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
      "The plugin additionally owns its packaged `oc-beads` skill",
      "does not write startup files",
      "Update the pin explicitly when upgrading",
      "**Do not run `bd setup opencode`.**",
    ]) {
      expect(readme).toContain(required);
      expect(userGuide).toContain(required);
    }
    for (const required of [
      "| `bd setup claude` (Claude Code) | This plugin (OpenCode 2) |",
      "`bd setup opencode --remove`",
    ]) {
      expect(userGuide).toContain(required);
    }
    for (const document of [readme, userGuide]) {
      expect(document).not.toContain("Upgrading from 0.8.0");
      expect(document).not.toContain("bunx @snarkipus/opencode-beads@0.8.0 remove");
      expect(document).not.toContain("/beads:setup");
    }
    expect(artifactPolicy).toContain("not by `bd setup opencode`");
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

  test("resolves checked-in Markdown links and anchors", async () => {
    for (const file of [
      "README.md",
      "AGENTS.md",
      "CHANGELOG.md",
      "docs/README.md",
      "docs/user-guide.md",
      "docs/beads-artifact-policy.md",
      "docs/opencode-sdk-contract.md",
      "docs/history/opencode-sdk-contract-ledger.md",
      "docs/claude-code-parity.md",
    ]) {
      const content = await fs.readFile(file, "utf8");
      const links = [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
        .map((match) => match[1])
        .filter(
          (target): target is string =>
            target !== undefined && !target.includes("://") && !target.startsWith("mailto:")
        );
      for (const target of links) {
        const [pathPart = "", fragment] = target.split("#", 2);
        const path = pathPart ? resolve(dirname(file), pathPart) : resolve(file);
        expect(await fs.exists(path), `${file}: ${target}`).toBeTrue();
        if (fragment && path.endsWith(".md")) {
          expect(anchorsOf(await fs.readFile(path, "utf8")).has(fragment), `${file}: ${target}`).toBeTrue();
        }
      }
    }
  });

  test("keeps the OpenCode reference current and the former ledger historical", () => {
    expect(sdkContract).toContain("# OpenCode integration reference");
    expect(sdkContract).toMatch(/\*\*not a\s+behavioral contract\*\*/);
    expect(packageManifest.peerDependencies["@opencode/plugin"]).toBe(">=2.3.0 <2.4");
    expect(packageManifest.peerDependenciesMeta["@opencode/plugin"]?.optional).toBeTrue();
    expect(packageManifest.devDependencies["@opencode/plugin"]).toBe("2.3.0");
    expect(sdkContract).toContain("`@opencode/plugin` `>=2.3.0 <2.4`");
    expect(sdkContract).toContain("`2.3.0` for development typing only");
    expect(sdkContract).toContain("`<name>/server`, then `<name>`");
    expect(sdkContract).toContain("`session.compaction.ended`");
    expect(sdkContract).toContain("`ctx.session.context({ sessionID })`");
    expect(sdkContract).toContain("[2.2.6 qualification](opencode-22-qualification-5rj2.md)");
    expect(sdkContract).toContain("(history/opencode-sdk-contract-ledger.md)");
    expect(sdkContract).toContain(
      "(../openspec/specs/workflow-access/spec.md#requirement-explicit-native-availability-and-fallback)"
    );
    for (const stale of ["release candidate", "unpublished", "not yet qualified", "remains withheld", "1.18."]) {
      expect(sdkContract).not.toContain(stale);
    }
    expect(sdkContract).not.toContain("The 2.2.6 runtime candidate has not been qualified");

    expect(sdkHistory).toContain("**Historical record — not current guidance.**");
    expect(sdkHistory).toContain(
      "https://github.com/snarkipus/opencode-beads/blob/a4936526103cfc9a0112110a70a518f01d16f2f4/docs/opencode-sdk-contract.md"
    );
    expect(sdkHistory).toContain("# OpenCode V2 Plugin Contract");
    expect(sdkHistory).toContain("Exact OpenCode 2.2.6 qualification is parent-accepted");
    expect(sdkHistory).toContain("072d9c29ef89fa2697109be072798e79cf4af622111266de40ef65e7950ac836");
    expect(sdkHistory).toContain("[current qualification](../opencode-22-qualification-5rj2.md)");
    expect(sdkHistory).toContain("**Historical 1.3.0 exited1 (59 checks passed, five fixture assertions failed)");
    expect(sdkHistory).toContain("**Task 1.1 is not qualified:**");
    expect(sdkHistory).toContain('Bun.spawn(["bd", "prime"]');
  });

  test("separates accepted base compatibility from the representative Terra qualification", () => {
    expect(userGuide).toContain("| OpenCode (historical beta.5) | `>=2.1.1 <2.2` | 2.1.1 (bounded accepted evidence) |");
    expect(userGuide).toContain("| OpenCode (2.0.0) | `>=2.2.6 <2.3` | 2.2.6 (accepted native and genuine-model qualification) |");
    expect(packageManifest.version).toBe("2.2.0");
    expect(userGuide).toContain("| OpenCode (2.1.0 released) | `>=2.2.6 <2.3` |");
    expect(userGuide).toContain("| OpenCode (2.2.0) | `>=2.3.0 <2.4` | Exact 2.3.0 bounded native qualification |");
    expect(userGuide).toContain("| OpenCode (stable 1.0.2 historical) | 2.0.26 | 2.0.26 |");
    expect(userGuide).toContain("| `bd` CLI | 1.3.1 through 1.x | 1.3.4 |");
    expect(readme).toContain("| OpenCode | `>=2.3.0 <2.4` |");
    expect(readme).toContain("bounded native qualification");
    for (const document of [readme, userGuide, sdkContract]) {
      expect(document).toContain("opencode-23-qualification-xwq.md");
      expect(document).not.toContain("native qualification is pending");
    }
    expect(userGuide).toContain("repeated idle reports with outstanding work");
    expect(userGuide).toContain("cancellation during real bd execution");
    expect(readme).toContain("### Upgrading to 2.2.0");
    expect(userGuide).toContain("**Staying on OpenCode 2.2:** keep the released exact `2.1.0` pin");
    expect(readme).toContain("Upgrade OpenCode before changing the plugin pin");
    expect(readme).toContain("Existing exact 1.x and beta pins remain available");
    expect(readme).toContain("native conversation compaction on model A, switching to model B");
    expect(readme).toContain("upstream issue #57424");
    expect(readme).toContain("opencode-beads-o66");
    expect(readme).toContain("does not change or repair the Beads issue database or its stored data");
    for (const document of [readme, userGuide]) {
      expect(document).not.toContain("@opencode-ai/");
    }
  });

  test("keeps the Beads compatibility range in one place", () => {
    const { minimum, validated } = packageManifest.beads;
    expect(minimum).toBe("1.3.1");
    expect(minimum).toBe(MINIMUM_BD_VERSION);
    expect(userGuide).toContain(`| \`bd\` CLI | ${minimum} through 1.x | ${validated} |`);
    expect(userGuide).toContain(`reviewed against Beads v${validated}`);
    expect(readme).toContain(`| \`bd\` CLI | ${minimum} through 1.x |`);
    expect(userGuide).toContain("beads-contract");
    expect(artifactPolicy).toContain("scripts/bd-contract.ts");
    expect(artifactPolicy).toContain("REASSESS:");
  });

  test("records Claude Code parity with live evidence and explicit divergences", () => {
    expect(userGuide).toContain("[Claude Code parity matrix](claude-code-parity.md)");
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
    for (const option of ["refreshAfterIdleMinutes", "stealth", "taskAgentSteps", "autoMigrate", "luna", "terra"]) {
      expect(userGuide).toContain(`| \`${option}\` |`);
    }
  });

  test("documents the schema migration guard and plugin options", () => {
    expect(userGuide).toContain("## Schema migration guard");
    expect(userGuide).toContain("`bd --readonly` does not prevent that");
    expect(userGuide).toContain("`bd migrate schema`");
    expect(userGuide).toContain("| `autoMigrate` | `false` |");
    expect(userGuide).toContain("| `luna` | `false` |");
    expect(userGuide).toContain("| `terra` | `false` |");
    expect(userGuide).toContain("`openai/gpt-6.1-terra#medium`");
    expect(userGuide).toContain('"options": { "luna": true, "autoMigrate": false }');
    expect(userGuide).toContain("Terra is introduced in `2.1.0`; published `2.0.0` does not include it.");
    expect(userGuide).not.toContain('"beads-task-agent-luna": {}');
    expect(artifactPolicy).toContain("schema migration guard");
  });

  test("documents upstream-aligned full-prime context boundaries", () => {
    expect(userGuide).toContain("runs `bd prime --full`");
    expect(userGuide).not.toContain("runs `bd prime --memories-only`");
    expect(userGuide).toContain("standalone guidance for authorized scope");
    expect(sdkContract).toContain('Bun.spawn(["bd", ...args]');
    expect(artifactPolicy).toContain("Claude Code plugin manifests both run full `bd prime`");
    expect(artifactPolicy).toContain(
      "`PreCompact` uses `--memories-only` only to check context availability"
    );
    expect(artifactPolicy).toContain("eligible primary agents and `beads-task-agent`");
  });

  test("records the retired vendoring decision and the historical baselines", async () => {
    expect(userGuide).toContain("attributed MIT-licensed excerpts");
    expect(userGuide).toContain("The historical integration comparison remains Beads v1.3.1");
    expect(userGuide).toContain("c1c4b642ac1c08d8c828007a1c2f96e47e43ef7c");
    expect(artifactPolicy).toContain("attributed MIT-licensed excerpts");
    expect(await fs.readFile("assets/oc-beads/THIRD_PARTY_NOTICES.md", "utf8")).toContain("Copyright (c) 2025 Beads Contributors");
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
    for (const document of [userGuide, changelog, artifactPolicy]) {
      expect(document).toContain("did not bundle");
      expect(document).toContain("implement database migrations");
      expect(document).toContain("consumer-installed");
      expect(document).toContain("`bd prime`");
      expect(document).toMatch(/even one v1\.2\.1 execution could migrate the database/i);
      expect(document).toContain("v1.2.1");
      expect(document).toContain(recoveryGuide);
    }
    expect(userGuide).toContain("if v1.2.1 was installed and may have run");
    expect(artifactPolicy).toContain("upstream v1.2.2 database recovery guidance");
    expect(artifactPolicy).toContain("local repository commit `e51b8fe`");
  });

  test("documents scope-bounded task execution and runtime provenance", () => {
    expect(userGuide).toContain("scope-bounded task execution");
    expect(userGuide).not.toContain("Autonomous issue completion");
    expect(userGuide).toContain("An exact assignment or explicit one-bead mode stops with that item");
    expect(userGuide).toContain("already-authorized batch or goal may continue within scope");
    expect(userGuide).toContain("Discovery does not expand that authority");
    expect(userGuide).toContain("primary OpenCode thread retains planning context, decisions, and control");
    expect(userGuide).toContain("unknown custom primary agents");
    expect(userGuide).toContain("Known regular subagents remain excluded");
    expect(readme).toContain("Exact assignments stop with their item");
    expect(artifactPolicy).toContain("metadata, provenance, and compatibility validation");
    expect(artifactPolicy).toContain("project-owned bounded OpenCode adaptation");
    expect(artifactPolicy).toContain("does not execute upstream's autonomous multi-task loop");
    expect(artifactPolicy).toContain("fail open for context injection");
  });

  test("retains compact OpenCode-specific runtime policy", () => {
    expect(userGuide).toContain("validate before closure");
    expect(artifactPolicy).toContain("prohibits automatic commit, push, or Dolt synchronization");
    expect(artifactPolicy).not.toContain("companion lifecycle CLI");
    expect(artifactPolicy).not.toContain("project-owned CLI");
  });

  test("states documentation authority once and points agents to it", () => {
    expect(docsIndex).toContain("For intended product behavior, the canonical specs are authoritative.");
    expect(docsIndex).toContain("never rewrite historical evidence or invent an upstream API");
    for (const spec of ["workflow-access", "work-continuity", "upstream-review"]) {
      expect(docsIndex).toContain(`(../openspec/specs/${spec}/spec.md)`);
    }
    expect(readme).toContain("[Documentation index](docs/README.md)");
    expect(agentGuide).toContain("## Where truth lives");
    expect(agentGuide).toContain("[`docs/README.md`](docs/README.md)");
    expect(agentGuide).toContain("report the precise gap and stop");
  });
});
