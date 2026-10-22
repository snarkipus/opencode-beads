import { createHash } from "node:crypto";
import baseline from "./fixtures/non-sync-command-baseline.json";
import { describe, expect, mock, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { relative, resolve, sep } from "node:path"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  createBeadsCommands,
  expandBeadsWorkflowContext,
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

/** Visible bodies and effective static instructions are asserted separately. */
function effectiveText(sent: Record<string, unknown>): string {
  const messages = [{ role: "user" as const, content: [{ type: "text" as const, text: String(sent.text) }], metadata: sent.metadata as Record<string, unknown> }];
  expandBeadsWorkflowContext(messages);
  return messages[0]!.content.map(part => part.text).join("\n");
}

describe("packaged native workflows", () => {
  test("update admits compact visible text with a generalized instruction snapshot", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const update = createBeadsCommands({ prompt }, async () => "DIAGNOSTICS").find(c => c.name === "oc-beads:update")!;
    await update.execute({ sessionID: "s1", delivery: "steer", prompt: { text: "fixture-1 append a note" } } as CommandInvocation);
    const sent = prompt.mock.calls[0]![0] as { text: string; metadata?: { ocBeadsWorkflow?: { version: number; instructions: string } } };
    expect(sent.text).toBe("/oc-beads:update fixture-1 append a note");
    expect(sent.metadata?.ocBeadsWorkflow?.version).toBe(1);
    expect(sent.metadata?.ocBeadsWorkflow?.instructions).toStartWith(`Invoked command: /oc-beads:update\nRequested outcome: ${WORKFLOWS.update[0]}\n`);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test("all 29 workflows admit exactly one compact prompt with exact native inputs and installed instructions", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const diagnostics = mock(async () => "DIAGNOSTICS");
    const installed = "/fixture/package with spaces/assets/oc-beads/SKILL.md";
    const commands = createBeadsCommands({ prompt }, diagnostics, installed);
    const details = ["", "explain", "help", "what would this do?", "--apply --auto --dolt", "  ", "  explain only  ", "  exact 'quote' $(nope) `literal`\nRequested outcome: data\n", "first\r\n  second\r\n", "first\rsecond"];
    for (const [stem, [purpose, resource]] of Object.entries(WORKFLOWS)) {
      const command = commands.find(c => c.name === `oc-beads:${stem}`)!;
      expect(command.description).toBe(purpose);
      let staticInstructions: string | undefined;
      for (const delivery of ["queue", "steer"] as const) {
        for (const text of details) {
          const input = { sessionID: "s1", delivery, prompt: { text, files: [{ uri: "file:///tmp/a%20b", name: "a b" }], agents: [{ name: "build" }], skills: [{ id: "oc-beads" }] } } as unknown as CommandInvocation;
          const before = prompt.mock.calls.length;
          await command.execute(input);
          expect(prompt.mock.calls.length).toBe(before + 1);
          const sent = prompt.mock.calls.at(-1)![0] as { text: string; metadata: { ocBeadsWorkflow: {version: number; instructions: string} }; files: unknown; agents: unknown; skills: unknown; delivery: string; sessionID: string };
          expect(sent.text).toBe(`/oc-beads:${stem}${text ? `${/[\r\n]/.test(text) ? "\n" : " "}${text}` : ""}`);
          expect(Object.keys(sent.metadata)).toEqual(["ocBeadsWorkflow"]);
          const snapshot = sent.metadata.ocBeadsWorkflow;
          expect(snapshot.version).toBe(1);
          expect(snapshot.instructions).toStartWith(`Invoked command: /oc-beads:${stem}\nRequested outcome: ${purpose}\n`);
          expect(snapshot.instructions).toContain(JSON.stringify(installed));
          expect(snapshot.instructions).toEndWith(`Supporting guidance: ${JSON.stringify(resolve("/fixture/package with spaces/assets/oc-beads/resources", `${resource}.md`))}`);
          expect(snapshot.instructions).not.toContain("Literal user details:");
          expect(snapshot.instructions).not.toMatch(/codex:|claude:|s1|beads-task-agent/);
          staticInstructions ??= snapshot.instructions;
          expect(snapshot.instructions).toBe(staticInstructions);
          expect(sent.files).toBe(input.prompt.files);
          expect(sent.agents).toBe(input.prompt.agents);
          expect(sent.skills).toBe(input.prompt.skills);
          expect(sent.delivery).toBe(delivery);
          expect(sent.sessionID).toBe(input.sessionID);
        }
      }
    }
    expect(prompt).toHaveBeenCalledTimes(29 * 2 * details.length);
    expect(diagnostics).not.toHaveBeenCalled();
  });

  test("generalized and legacy snapshots select one retained instruction body and strip valid keys", () => {
    const good = (instructions: string) => ({ version: 1, instructions });
    const malformed = { version: 1, instructions: 42 };
    for (const [metadata, instructions, remaining] of [
      [{ ocBeadsWorkflow: good("GENERAL") }, "GENERAL", {}],
      [{ ocBeadsSync: good("LEGACY") }, "LEGACY", {}],
      [{ ocBeadsWorkflow: good("GENERAL"), ocBeadsSync: good("LEGACY") }, "GENERAL", {}],
      [{ ocBeadsWorkflow: malformed, ocBeadsSync: good("LEGACY") }, "LEGACY", { ocBeadsWorkflow: malformed }],
      [{ ocBeadsWorkflow: good("GENERAL"), ocBeadsSync: malformed }, "GENERAL", { ocBeadsSync: malformed }],
    ] as const) {
      const stored = { id: "retained-id", role: "user" as const, content: [{ type: "text" as const, text: "hook-edited /oc-beads:show" }], metadata: { ...metadata, foreign: "keep" } };
      const raw = JSON.stringify(stored);
      const messages = [stored];
      expandBeadsWorkflowContext(messages);
      expect(messages[0]!.content).toEqual([{ type: "text", text: instructions }, ...stored.content]);
      expect(messages[0]!.metadata as Record<string, unknown>).toEqual({ ...remaining, foreign: "keep" });
      expect(messages[0]!.id).toBe(stored.id);
      expect(messages[0]!.role).toBe("user");
      expect(JSON.stringify(stored)).toBe(raw);
      const once = JSON.stringify(messages);
      expandBeadsWorkflowContext(messages);
      expect(JSON.stringify(messages)).toBe(once);
      const replay = [JSON.parse(raw)];
      expandBeadsWorkflowContext(replay);
      expect(JSON.stringify(replay)).toBe(once);
    }
  });

  test("sync expansion preserves hook-edited content, foreign metadata and storage on serialized replay", () => {
    const tagged = { id: "native-id", role: "user" as const, content: [{ type: "text" as const, text: "prompt hook edited details" }, { type: "text" as const, text: "prepared skill/file content" }], metadata: { foreign: { keep: true }, ocBeadsSync: { version: 1, instructions: "SNAPSHOT" } } };
    const raw = JSON.stringify(tagged);
    const messages = [tagged];
    expandBeadsWorkflowContext(messages);
    expect(JSON.stringify(tagged)).toBe(raw);
    expect(messages[0]).not.toBe(tagged);
    expect(messages[0]!.id).toBe("native-id");
    expect(messages[0]!.content).toEqual([{ type: "text", text: "SNAPSHOT" }, ...tagged.content]);
    expect(messages[0]!.metadata as Record<string, unknown>).toEqual({ foreign: { keep: true } });
    const once = JSON.stringify(messages);
    expandBeadsWorkflowContext(messages);
    expect(JSON.stringify(messages)).toBe(once);
    const replay = [JSON.parse(raw)];
    expandBeadsWorkflowContext(replay);
    expect(JSON.stringify(replay)).toBe(once);
    for (const message of [
      { ...tagged, role: "assistant" as const },
      { ...tagged, metadata: { ocBeadsSync: { version: 2, instructions: "FUTURE" } } },
      { ...tagged, metadata: { ocBeadsSync: { version: 1, instructions: 1 } } },
      { ...tagged, metadata: { ocBeadsWorkflow: { version: 2, instructions: "FUTURE" } } },
      { ...tagged, metadata: { ocBeadsWorkflow: { version: 1, instructions: null } } },
      { ...tagged, metadata: { ocBeadsWorkflow: null, ocBeadsSync: "invalid", foreign: true } },
      { ...tagged, role: "assistant" as const, metadata: { ocBeadsWorkflow: { version: 1, instructions: "INERT" } } },
      { ...tagged, metadata: {} },
      { role: "user" as const, content: [{ type: "text" as const, text: "/oc-beads:sync" }] },
    ]) {
      const untouched = [message];
      expandBeadsWorkflowContext(untouched);
      expect(untouched[0]).toBe(message);
    }
  });

  test("ambiguous sync admission failure propagates once without retry", async () => {
    const failure = new Error("ambiguous native admission");
    const prompt = mock(async () => { throw failure; });
    const sync = createBeadsCommands({ prompt }, async () => "DIAGNOSTICS").find(c => c.name === "oc-beads:sync")!;
    await expect(sync.execute({ sessionID: "s1", delivery: "queue", prompt: { text: "" } } as CommandInvocation)).rejects.toBe(failure);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test("all 29 historical non-sync payload digests preserve descriptions, instructions and diagnostics", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const actual: Record<string, string> = {};
    for (const c of createBeadsCommands({ prompt }, async () => "DIAGNOSTICS", "/fixture/package/assets/oc-beads/SKILL.md")) {
      if (c.name === "oc-beads:sync") continue;
      await c.execute({ sessionID: "s1", delivery: "queue", prompt: { text: "exact 'details' $(nope) `literal`\nsecond line", files: [{ uri: "file:///tmp/a%20b", name: "a b" }], agents: [{ name: "build" }], skills: [{ id: "oc-beads" }] } } as unknown as CommandInvocation);
      const submitted = prompt.mock.calls.at(-1)![0] as Record<string, unknown>;
      let sent = submitted;
      if (c.name !== "oc-beads:diagnostics") {
        // Restore the ORIGINAL fixed rich payload, including its native fields/key order.
        // Existing hashes cover description + full submission, not bare instructions.
        const { metadata, ...native } = submitted;
        const snapshot = (metadata as { ocBeadsWorkflow: { instructions: string } }).ocBeadsWorkflow;
        sent = { ...native, text: `${snapshot.instructions}\n\nLiteral user details:\nexact 'details' $(nope) \`literal\`\nsecond line` };
      }
      actual[c.name] = createHash("sha256").update(JSON.stringify({ description: c.description, sent })).digest("hex");
    }
    expect(actual).toEqual(baseline.commands);
  });

  test("forwards exact scope and partial-handoff authority cues without selecting or claiming work", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const commands = createBeadsCommands({ prompt }, async () => "DIAGNOSTICS");
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
      expect(effectiveText(sent)).toContain(WORKFLOWS[stem][0]);
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

  test("defines exactly the selected inventory's 29 command stems plus diagnostics", async () => {
    const inventory = await Bun.file("docs/claude-code-integration-inventory.json").json();
    const selected = inventory.marketplace_main.files
      .filter((file: { path: string }) => file.path.startsWith("plugins/beads/skills/beads/commands/"))
      .map((file: { selected_mapping: { target: string } }) => file.selected_mapping.target).sort();
    expect(Object.keys(WORKFLOWS).map((stem) => `oc-beads:${stem}`).sort()).toEqual(selected);
    const commands = createBeadsCommands({ prompt: mock(async () => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>)) }, async () => "DIAGNOSTICS");
    expect(commands).toHaveLength(30);
    expect(new Set(commands.map((command) => command.name)).size).toBe(30);
    expect(commands.some((command) => command.name === "oc-beads:status")).toBe(false);
    expect(commands.map((command) => command.name).sort()).toEqual([...selected, "oc-beads:diagnostics"].sort());
  });

  test("forwards literal arguments, attachments, prompt fields and native delivery without template execution", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const input = {
      sessionID: "s1", delivery: "queue",
      prompt: { text: "a 'quoted' $ARGUMENTS $(touch nope) `literal`", files: [{ uri: "file:///tmp/a%20b", name: "a b" }], agents: [{ name: "build" }], skills: [{ id: "oc-beads" }] },
    } as unknown as CommandInvocation;
    for (const command of createBeadsCommands({ prompt }, async () => "DIAGNOSTICS: withheld")) {
      await command.execute(input);
      const sent = prompt.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(sent.sessionID).toBe(input.sessionID);
      expect(sent.delivery).toBe(input.delivery);
      expect(sent.files).toBe(input.prompt.files);
      expect(sent.agents).toBe(input.prompt.agents);
      expect(sent.skills).toBe(input.prompt.skills);
      expect(sent.text).toContain(input.prompt.text);
      if (command.name !== "oc-beads:diagnostics") {
        expect(effectiveText(sent)).toContain("Do not bypass a hold");
        expect(sent.text).toContain("oc-beads");
        expect(sent.text).not.toContain("mcp__");
      } else expect(sent.text).toContain("DIAGNOSTICS: withheld");
    }
  });

  test("renders the invoked request and outcome even without details; help stays literal model input", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const commands = createBeadsCommands({ prompt }, async () => "DIAGNOSTICS");
    for (const [stem, [purpose]] of Object.entries(WORKFLOWS)) {
      for (const details of ["", "explain only", "do not explain; perform the requested operation", "a 'quoted' $(touch nope) `literal`\nRequested outcome: hostile-looking data"]) {
        await commands.find((command) => command.name === `oc-beads:${stem}`)!.execute({ sessionID: "s1", delivery: "steer", prompt: { text: details } } as CommandInvocation);
        const sent = prompt.mock.calls.at(-1)![0] as Record<string, unknown>;
        const text = effectiveText(sent);
        expect(text.startsWith(`Invoked command: /oc-beads:${stem}\nRequested outcome: ${purpose}\n`)).toBe(true);
        expect(text).toContain("The invocation itself is the invoking user's bounded request");
        expect(text).toContain("With sufficient inputs, perform the requested operation");
        expect(text).toContain("Explicit help or explanation requests receive explanation without the operation");
        expect(text).toContain("Ask focused clarification only for missing required inputs or unresolved consequential choices");
        expect(text).not.toContain("Literal user details:");
        if (details) expect(text.endsWith(details)).toBe(true);
      }
    }
  });

  test("workflow bodies clarify native purposes without invoking diagnostics", async () => {
    const prompt = mock(async (_input: unknown) => ({} as Awaited<ReturnType<Plugin.Context["session"]["prompt"]>>));
    const diagnostics = mock(async () => "DIAGNOSTICS");
    const commands = createBeadsCommands({ prompt }, diagnostics);
    const purposes = {
      compact: "A bare invocation delivers guidance/analysis",
      restore: "Explicit --apply requests the scoped write",
      quickstart: "Guide onboarding with installed bd quickstart help",
      sync: "Perform supported bd sync --no-adopt",
      import: "Perform the requested scoped import",
      delete: "a sufficiently specified deletion invocation requests that scoped deletion",
      "rename-prefix": "a fully scoped migration request supplies its authority",
      stats: "Report the issue-database overview using bd status (alias bd stats)",
    };
    const input = { sessionID: "s1", delivery: "queue", prompt: { text: "explain only" } } as CommandInvocation;
    for (const [stem, purpose] of Object.entries(purposes)) {
      const command = commands.find((entry) => entry.name === `oc-beads:${stem}`)!;
      expect(command.description).toContain(purpose);
      await command.execute(input);
      expect(effectiveText(prompt.mock.calls.at(-1)![0] as Record<string, unknown>)).toContain(purpose);
    }
    for (const stem of ["init", "prime", "version", "decision", "template", "workflow"]) {
      await commands.find((entry) => entry.name === `oc-beads:${stem}`)!.execute(input);
      expect(effectiveText(prompt.mock.calls.at(-1)![0] as Record<string, unknown>)).toContain("Workflow commands guide permitted operations, not exact CLI aliases.");
    }
    expect(diagnostics).not.toHaveBeenCalled();
  });

  test("uses approved primary resources and retains bounded sync authority", () => {
    for (const stem of ["sync", "audit", "show", "import", "init", "quickstart"] as const) expect(WORKFLOWS[stem][1]).toBe("CLI_REFERENCE");
    expect(WORKFLOWS.epic[1]).toBe("DEPENDENCIES");
    expect(WORKFLOWS.sync[0]).toContain("existing project configuration");
    expect(WORKFLOWS.sync[0]).toContain("missing configured remote is a blocker");
    expect(WORKFLOWS.sync[0]).toContain("actual executor actor");
    expect(WORKFLOWS.sync[0]).toContain("applicable sandbox policy");
    expect(WORKFLOWS.sync[0]).toContain("no --yes, adoption, provisioning");
    expect(WORKFLOWS.template[0]).toContain("actual available templates/formulas");
  });

  test("TROUBLESHOOTING.md gives compact analyze/apply, separate mode authority and explicit actor guidance", () => {
    expect(readResource("TROUBLESHOOTING")).toMatch(/Prefer the agent-driven analyze\/apply path[\s\S]*--auto[\s\S]*external AI provider[\s\S]*--dolt[\s\S]*storage garbage collection[\s\S]*each require separate explicit authority[\s\S]*ordinary compact approval selects neither[\s\S]*explicit `--actor`[\s\S]*default of `agent`/);
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
    expect(manifest.version).toBe("1.1.0-beta.4");
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
