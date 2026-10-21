import { describe, expect, mock, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { relative, resolve, sep } from "node:path"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  createBeadsCommands,
  loadBeadsSkill,
  WORKFLOWS,
} from "../src/workflows";
import type { Plugin } from "@opencode/plugin";
import type { CommandInvocation } from "@opencode/plugin/promise/command";

type InventoryEntry = {
	category: string
	path: string
	selected_mapping: {
		disposition: string
		target: string
		task_ids: string[]
	}
}

type Inventory = {
	marketplace_main: {
		files: InventoryEntry[]
	}
}

const repositoryRoot = process.cwd()
const assetRoot = resolve(repositoryRoot, "assets/oc-beads")
const skillPath = resolve(assetRoot, "SKILL.md")

function readInventory(): Inventory {
	return JSON.parse(
		readFileSync(resolve(repositoryRoot, "docs/claude-code-integration-inventory.json"), "utf8"),
	) as Inventory
}

function selectedSupportingFiles(): InventoryEntry[] {
	return readInventory().marketplace_main.files.filter(
		(entry) =>
			(entry.category === "resource" || entry.category === "adr") &&
			entry.selected_mapping.task_ids.includes("2.1"),
	)
}

function readResource(name: string): string {
	return readFileSync(resolve(assetRoot, `resources/${name}.md`), "utf8")
}

describe("oc-beads guidance assets", () => {
	test("covers and explicitly links every selected marketplace resource and ADR", () => {
		const supportingFiles = selectedSupportingFiles()
		const resources = supportingFiles.filter((entry) => entry.category === "resource")
		const adrs = supportingFiles.filter((entry) => entry.category === "adr")
		const skill = readFileSync(skillPath, "utf8")

		expect(resources).toHaveLength(15)
		expect(adrs).toHaveLength(1)

		const missing = supportingFiles.filter((entry) => !existsSync(resolve(repositoryRoot, entry.selected_mapping.target)))
		expect(missing.map((entry) => entry.selected_mapping.target)).toEqual([])

		const unlinked = supportingFiles.filter((entry) => {
			const relativePath = relative(assetRoot, resolve(repositoryRoot, entry.selected_mapping.target)).split(sep).join("/")
			return !skill.includes(`](${relativePath})`)
		})
		expect(unlinked.map((entry) => entry.selected_mapping.target)).toEqual([])
	})

	test("teaches append checkpoints, selective memory, and bounded actor-owned work", () => {
		const skill = readFileSync(skillPath, "utf8")
		const workflows = readFileSync(resolve(assetRoot, "resources/WORKFLOWS.md"), "utf8")
		const guidance = `${skill}\n${workflows}`

		expect(guidance).toContain("--append-notes")
		expect(guidance).toContain("--actor")
		expect(guidance).toContain("--sandbox")
		expect(guidance).toContain("created_by")
		expect(guidance).toContain("assignee")
		expect(guidance).toContain("reusable knowledge")
		expect(guidance).toContain("authorized batch")
		expect(guidance).not.toMatch(/bd update[^\n]*\s--notes\s/)
	})

	test("keeps current CLI access honest without claiming host prerequisites or automatic setup", () => {
		const skill = readFileSync(skillPath, "utf8")

		expect(skill).toContain("permissioned CLI")
		expect(skill).toContain("Do not initialize or reroute a store, synchronize it, change permissions, or enable automation as a side effect.")
		expect(skill).not.toMatch(/requires? OpenCode\s+v?\d/i)
		expect(skill).not.toMatch(/OpenCode\s*>=\s*2\./i)
		expect(skill).not.toMatch(/\bmcp__\w+/i)
		expect(skill).not.toMatch(/automatically run `bd init`/i)
	})

	test("states the unsupported agent and slot CLI limitation with a supported boundary", () => {
		const agents = readFileSync(resolve(assetRoot, "resources/AGENTS.md"), "utf8")
		const troubleshooting = readFileSync(resolve(assetRoot, "resources/TROUBLESHOOTING.md"), "utf8")

		expect(agents).toMatch(/`bd agent --help` and `bd slot --help` both\s+return unknown-command errors\./)
		expect(agents).toContain("not a one-to-one implementation")
		expect(troubleshooting).toMatch(/do not initialize, migrate, reroute, repair, or synchronize it\s+automatically/)
	})

	test("gives dependency choices, direction, and a parallel merge example", () => {
		const dependencies = readResource("DEPENDENCIES")

		expect(dependencies).toMatch(/\|\s*Question\s*\|\s*Relationship\s*\|/)
		expect(dependencies).toMatch(/--deps=.*depends-on:/)
		expect(dependencies).toContain("--parent='<epic-id>'")
		expect(dependencies).toContain("not an ordering edge")
		expect(dependencies).toMatch(/hard\s+block only when a real prerequisite exists/i)
		expect(dependencies).toMatch(/diamond/i)
		expect(dependencies).toMatch(/`discovered-from` does not make that\s+cascade required work/i)
	})

	test("shows a useful before-and-after checkpoint and a compact handoff shape", () => {
		const resumability = readResource("RESUMABILITY")

		expect(resumability).toContain("### Before checkpoint")
		expect(resumability).toContain("### After checkpoint")
		expect(resumability).toMatch(/attempted[\s\S]*evidence[\s\S]*rationale[\s\S]*blocker[\s\S]*next/i)
		expect(resumability).toContain("Minimal handoff template")
		expect(resumability).toMatch(/tested.{0,50}(snippet|example)|(?:snippet|example).{0,50}tested/i)
		expect(resumability).toMatch(/raw (?:log|JSON|dump)/i)
	})

	test("helps choose transient versus durable work and preserves planning authority", () => {
		const boundaries = readResource("BOUNDARIES")
		const integration = readResource("INTEGRATION_PATTERNS")

		expect(boundaries).toContain("| Situation | Record | Why |")
		expect(boundaries).toMatch(/experimental[\s\S]{0,100}opt-in[\s\S]{0,100}host-owned/i)
		expect(boundaries).toMatch(/transition/i)
		expect(integration).toContain("OpenSpec")
		expect(integration).toContain("one bounded planning Bead")
		expect(integration).toMatch(/review is independently owned/i)
		expect(integration).toMatch(/same review Bead[\s\S]*retry|same review Bead[\s\S]*recheck/i)
		expect(integration).toMatch(/do not create a ticket per\s+document, retry/i)
		expect(integration).toContain("--append-notes")
		expect(integration).toContain("--sandbox")
	})

	test("distinguishes human and timer gates and documents deliberate inspection and resolution", () => {
		const gates = readResource("ASYNC_GATES")

		expect(gates).toMatch(/human.{0,100}timeout.{0,100}(?:stored|metadata).{0,100}(?:not enforced|does not enforce)/is)
		expect(gates).toMatch(/timeout has elapsed when an authorized executor runs/i)
		expect(gates).toContain("bd gate check --type=timer")
		expect(gates).toMatch(/success[\s\S]*failure[\s\S]*escalat/i)
		expect(gates).toContain("bd gate create")
		expect(gates).toContain("bd gate show")
		expect(gates).toContain("bd gate resolve")
		expect(gates).toMatch(/do not (?:add|run|schedule).{0,40}(?:poll|watch|approval)/i)
	})

	test("explains molecule lifetime and a bounded research or review wisp lifecycle", () => {
		const chemistry = readResource("CHEMISTRY_PATTERNS")
		const molecules = readResource("MOLECULES")
		const guidance = `${chemistry}\n${molecules}`

		expect(guidance).toMatch(/persistent molecule.{0,80}audit history/i)
		expect(guidance).toMatch(/wisp.{0,100}ephemeral/i)
		expect(guidance).toMatch(/research|review/i)
		expect(guidance).toContain("bd mol wisp create")
		expect(guidance).toContain("bd mol squash")
		expect(guidance).toContain("bd mol burn")
		expect(guidance).toMatch(/promot[\s\S]{0,100}findings[\s\S]{0,100}(?:noise|no future value)/i)
	})

	test("keeps copyable placeholders quoted and executor actors neutral", () => {
		const files = [skillPath, ...selectedSupportingFiles().map((entry) => resolve(repositoryRoot, entry.selected_mapping.target))]
		const guidance = files.map((file) => readFileSync(file, "utf8")).join("\n")
		const actors = [...guidance.matchAll(/--actor=([^\s`]+)/g)].map((match) => match[1])

		expect(actors.length).toBeGreaterThan(0)
		expect(actors.filter((actor) => actor !== "'<executor-actor>'" && actor !== "'<actual-human-actor>'")).toEqual([])
		expect(guidance).not.toMatch(/codex:/)
		// Strip quoted arguments: remaining angle brackets in shell blocks would be redirects.
		const shellBlocks = [...guidance.matchAll(/```(?:sh|bash)\n([\s\S]*?)```/g)].map((match) => match[1] ?? "")
		const unquotedShell = shellBlocks.join("\n").replace(/'[^']*'|"[^"]*"/g, "")
		expect(unquotedShell).not.toMatch(/<[^>\n]+>/)
		expect(readFileSync(skillPath, "utf8")).toMatch(/host-rendered actor[\s\S]{0,100}request session and agent/i)
		expect(readResource("ASYNC_GATES")).toMatch(/(?:human[^.]*runs|run by[^.]*human)/i)
	})

	test("shows existing-issue dependency direction and graph readback", () => {
		const dependencies = readResource("DEPENDENCIES")

		expect(dependencies).toMatch(/bd dep add '<dependent-id>' '<prerequisite-id>'[^\n]*--actor='<executor-actor>'[^\n]*--sandbox/)
		expect(dependencies).toMatch(/wrong[\s\S]*right/i)
		expect(dependencies).toMatch(/phase 1[\s\S]*phase 2/i)
		expect(dependencies).toContain("bd blocked --json")
		expect(dependencies).toContain("bd dep list '<dependent-id>'")
	})

	test("recovers assigned active work before acting and protects existing memory keys", () => {
		const recovery = readResource("RESUMABILITY")
		const skill = readFileSync(skillPath, "utf8")

		expect(recovery).toMatch(/bd list --status=in_progress --assignee='<executor-actor>'[^\n]*--json/)
		expect(recovery).toContain("bd show '<issue-id>'")
		expect(recovery).toMatch(/checkpoint[\s\S]*verify[\s\S]*before acting/i)
		expect(recovery).toMatch(/(?:not|never|rather than)[^.]*`bd ready`/i)
		expect(skill).toMatch(/recall[^.]*before[^.]*key/i)
		expect(skill).toMatch(/same key[^.]*replace[^.]*in place/i)
	})

	test("makes the project specification system and planning pattern conditional", () => {
		for (const guidance of [readFileSync(skillPath, "utf8"), readResource("BOUNDARIES"), readResource("INTEGRATION_PATTERNS")]) {
			expect(guidance).toMatch(/project.{0,20}specification system/i)
			expect(guidance).toMatch(/OpenSpec, when used/)
		}
		expect(readResource("INTEGRATION_PATTERNS")).toMatch(/project.policy example[^.]*not[^.]*Beads requirement/is)
	})
})

describe("packaged native workflows", () => {
  test("forwards exact scope and partial-handoff authority cues without selecting or claiming work", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const commands = createBeadsCommands({ prompt }, async () => "STATUS");
    // These are literal caller instructions, not a mock model or a scope interpreter.
    const scenarios = [
      ["ready", "Execute exact fixture-1 only; stop without substitution; closure belongs to parent."],
      ["ready", "Authorized batch fixture-1 and fixture-2 only; claim each atomically; validate and append evidence before continuing."],
      ["create", "Record discovered-from:fixture-1 follow-up when authorized; this does not authorize its execution or assignment."],
      ["list", "Read-only graph overview; do not claim or write."],
      ["close", "Permission denied and acceptance incomplete; preserve partial status, do not close. Actor worker:fixture; full session fixture-session; tried A; result failed; because B; validation pending; reference task:fixture-1; next parent review."],
    ] as const;
    for (const [stem, text] of scenarios) {
      const input = { sessionID: "parent", delivery: "queue", prompt: { text } } as unknown as CommandInvocation;
      await commands.find((command) => command.name === `oc-beads:${stem}`)!.execute(input);
      const sent = prompt.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(sent.sessionID).toBe("parent");
      expect(sent.delivery).toBe("queue");
      expect(sent.text).toContain(text);
      expect(sent.text).toContain(WORKFLOWS[stem][0]);
    }
    expect(prompt).toHaveBeenCalledTimes(scenarios.length);
    // The established rich assets agree with the new canonical scope guidance.
    const skill = readFileSync(skillPath, "utf8");
    const workflows = readResource("WORKFLOWS");
    expect(skill).toContain("An assignment to one specific item is an exact assignment");
    expect(workflows).toContain("Explicitly authorized batches may continue within their stated scope");
    expect(workflows).toContain("If a parent or human owns acceptance");
    expect(workflows).toContain("new discoveries never expand it");
  });

  test("defines exactly the selected inventory's 29 command stems plus status", async () => {
    const inventory = await Bun.file("docs/claude-code-integration-inventory.json").json();
    const selected = inventory.marketplace_main.files
      .filter((file: { path: string }) => file.path.startsWith("plugins/beads/skills/beads/commands/"))
      .map((file: { selected_mapping: { target: string } }) => file.selected_mapping.target).sort();
    expect(Object.keys(WORKFLOWS).map((stem) => `oc-beads:${stem}`).sort()).toEqual(selected);
    const commands = createBeadsCommands({ prompt: mock(async () => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>)) }, async () => "STATUS");
    expect(commands.map((command) => command.name).sort()).toEqual([...selected, "oc-beads:status"].sort());
  });

  test("forwards literal arguments, attachments, prompt fields and native delivery without template execution", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const input = {
      sessionID: "s1", delivery: "queue",
      prompt: { text: "a 'quoted' $ARGUMENTS $(touch nope) `literal`", files: [{ uri: "file:///tmp/a%20b", name: "a b" }], agents: [{ name: "build" }], skills: [{ id: "oc-beads" }] },
    } as unknown as CommandInvocation;
    for (const command of createBeadsCommands({ prompt }, async () => "STATUS: withheld")) {
      await command.execute(input);
      const sent = prompt.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(sent.sessionID).toBe(input.sessionID);
      expect(sent.delivery).toBe(input.delivery);
      expect(sent.files).toBe(input.prompt.files);
      expect(sent.agents).toBe(input.prompt.agents);
      expect(sent.skills).toBe(input.prompt.skills);
      expect(sent.text).toContain(input.prompt.text);
      if (command.name !== "oc-beads:status") {
        expect(sent.text).toContain("Do not bypass a hold");
        expect(sent.text).toContain("oc-beads");
        expect(sent.text).not.toContain("mcp__");
      } else expect(sent.text).toContain("STATUS: withheld");
    }
  });

  test("loads the rich skill at its installed path with all 17 explicit links, beyond a sampled ten", async () => {
    const skill = await loadBeadsSkill();
    expect(String(skill.id)).toBe("oc-beads");
    expect(String(skill.name)).toBe("oc-beads");
    expect(String(skill.path)).toBe(fileURLToPath(new URL("../assets/oc-beads/SKILL.md", import.meta.url)));
    expect(skill.content).toContain("### Advanced");
    const links = [...skill.content.matchAll(/\]\(((?:resources|adr)\/[^)]+)\)/g)].map((match) => match[1]!);
    expect(new Set(links).size).toBe(17);
    for (const link of links) expect(await readFile(new URL(link, `file://${skill.path}`), "utf8")).not.toBeEmpty();
  });

  test("reports missing or unreachable packaged guidance rather than silently advertising it", async () => {
    const realRead = (file: string) => readFile(file, "utf8");
    for (const code of ["ENOENT", "EACCES"]) {
      await expect(loadBeadsSkill({ readText: async (file) => {
        if (file.endsWith("WORKTREES.md")) throw Object.assign(new Error("sensitive detail"), { code });
        return realRead(file);
      } })).rejects.toThrow("resource-unreachable resources/WORKTREES.md");
    }
  });

  test("beta package manifest includes owned assets at the selected prerelease version", async () => {
    const manifest = await Bun.file("package.json").json();
    expect(manifest.files).toContain("assets/oc-beads");
    expect(manifest.version).toBe("1.1.0-beta.1");
  });
});


test("explicit installed skill base survives ignored/hidden roots beyond the host scan depth and reload", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "oc-beads-path-"));
  const installed = resolve(root, ".hidden/node_modules/a/b/c/d/e/f/g/oc-beads");
  try {
    await mkdir(installed, { recursive: true });
    await cp(assetRoot, installed, { recursive: true });
    const path = resolve(installed, "SKILL.md");
    const first = await loadBeadsSkill({ skillPath: path });
    expect(String(first.path)).toBe(path);
    expect(first.content).toContain("resources/WORKTREES.md");
    await writeFile(path, `${await readFile(path, "utf8")}\nReloaded package fixture.\n`);
    const reloaded = await loadBeadsSkill({ skillPath: path });
    expect(reloaded.content).toContain("Reloaded package fixture.");
    // Explicit registration supplies SKILL.md; it never asks a recursive scanner or
    // resource watcher to discover the other 17 files. Reads still use host permissions.
    expect(reloaded.content.match(/\]\((?:resources|adr)\//g)).toHaveLength(17);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
