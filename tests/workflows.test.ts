import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { relative, resolve, sep } from "node:path"

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
		expect(gates).toContain("bd gate check --type=timer --actor='codex:<short-session>' --sandbox --json")
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
})
