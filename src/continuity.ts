import type { Plugin } from "@opencode/plugin";
import type { Info, ToolContext } from "@opencode/plugin/promise/tool";
import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import { isAbsolute, parse, relative, sep } from "node:path";
import { checkBeadsStore, createGuardRuntime, type GuardRuntime } from "./guard";
import { PrimeProcessError, runBd } from "./prime";

export type ContinuityHost = Pick<Plugin.Context, "location"> & {
  permission: Pick<Plugin.Context["permission"], "assert">;
  session: Pick<Plugin.Context["session"], "get">;
};

export interface ContinuityResult {
  operation: Operation;
  target: string | string[] | Record<string, unknown>;
  actor?: string;
  status: "acknowledged" | "not-claimed" | "landed-uncommitted" | "uncertain" | "failed" | "found" | "missing";
  reference?: string;
  value?: string;
  data?: Record<string, unknown>;
  issue?: Record<string, unknown>;
  issues?: Record<string, Record<string, unknown>>;
  failed?: Array<{ id: string; detail: string }>;
  records?: Array<Record<string, unknown>>;
  memories?: Record<string, string>;
  view?: string;
  direction?: "down" | "up";
  scope?: Record<string, unknown>;
  limit?: number;
  complete?: boolean | null;
  detail?: string;
  commitIndeterminate?: boolean;
}

export interface ContinuityDependencies {
  /** Override the normal bounded runner in tests. */
  bd?: typeof runBd;
  readText?: GuardRuntime["readText"];
  realpath?: (path: string) => Promise<string>;
  acknowledged?: (sessionID: string, result: ContinuityResult) => void;
  signal?: AbortSignal;
}

/** Audit attribution from host invocation identity; not authentication or an assignment handoff. */
export function executorActor(context: { sessionID: string; agent: string }): string {
  if ([context.sessionID, context.agent].some((value) => typeof value !== "string" || !value.trim() || value.includes("\0"))) {
    throw new Error("Invocation executor identity unavailable; write withheld");
  }
  const label = context.agent.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 24) || "agent";
  const suffix = createHash("sha256").update(context.sessionID).update("\0").update(context.agent).digest("hex").slice(0, 12);
  return `opencode:${label}:${suffix}`;
}

export type Operation = "find" | "get" | "edges" | "memories" | "recall" | "claim" | "note" | "update" | "close" | "create" | "remember";
type Data = Record<string, unknown>;
type JS = import("effect").JsonSchema.JsonSchema;
const text: JS = { type: "string", minLength: 1, maxLength: 64_000 };
const token: JS = { ...text, pattern: "^[a-zA-Z0-9][a-zA-Z0-9._:-]*$" };
const strings: JS = { type: "array", items: token, minItems: 1, maxItems: 25, uniqueItems: true };
const status: JS = { enum: ["open", "in_progress", "blocked", "deferred"] };
const priority: JS = { type: "integer", minimum: 0, maximum: 4 };
const obj = (properties: Record<string, JS>, required = Object.keys(properties)): JS => ({ type: "object", properties, required, additionalProperties: false });
const issue: JS = { type: "object", properties: { id: token, title: text, status: { type: "string" }, priority, issue_type: text, assignee: { type: "string" }, created_by: { type: "string" }, owner: { type: "string" }, notes: { type: "string" }, acceptance_criteria: { type: "string" }, design: { type: "string" }, labels: { type: "array", items: { type: "string" } } }, required: ["id"], additionalProperties: true };
const summary: JS = obj({ id: token, title: text, status: text, priority, type: text, assignee: { type: ["string", "null"] } }, ["id", "title", "status", "priority", "type"]);
const complete: JS = { type: ["boolean", "null"] };
const limit: JS = { type: "integer", minimum: 1, maximum: 50, default: 20 };
const query = { parent: token, assignee: text, labels: strings, limit };
const setSchema = obj({ status, priority, addLabels: strings, removeLabels: strings }, []);
const createSchema = obj({ title: text, type: { enum: ["bug", "feature", "task", "epic", "chore"] }, priority, description: text, acceptance: text, design: text, parent: token, discoveredFrom: token, labels: strings }, ["title", "type", "priority"]);

function record(value: unknown): value is Data {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Validate the declared issue fields; preserve other CLI fields without inventing values. */
function isIssue(value: unknown): value is Data & { id: string } {
  if (!record(value) || typeof value.id !== "string" || value.id.length > 64_000 || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value.id)) return false;
  for (const key of ["title", "status", "issue_type", "assignee", "created_by", "owner", "notes", "acceptance_criteria", "design"]) {
    if (value[key] !== undefined && typeof value[key] !== "string") return false;
  }
  for (const key of ["title", "issue_type"]) {
    if (typeof value[key] === "string" && (value[key].length === 0 || value[key].length > 64_000)) return false;
  }
  if (value.priority !== undefined && (!Number.isInteger(value.priority) || Number(value.priority) < 0 || Number(value.priority) > 4)) return false;
  if (value.labels !== undefined && (!Array.isArray(value.labels) || !value.labels.every(label => typeof label === "string"))) return false;
  return true;
}
function stringField(data: Data, key: string, isToken = false): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.length > 64_000 ||
      (isToken && !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value))) throw new Error(`Invalid ${key}`);
  return value;
}
function fields(data: unknown, allowed: readonly string[]): Data {
  if (!record(data)) throw new Error("Expected operation input");
  for (const key of Object.keys(data)) if (!allowed.includes(key)) throw new Error(`Unsupported input: ${key}`);
  // Optional undefined values are omitted in JSON; keep target/content JSON-consistent too.
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}
function list(data: Data, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value) || !value.length || value.length > 25 || new Set(value).size !== value.length) throw new Error(`Invalid ${key}`);
  return value.map(v => stringField({ [key]: v }, key, true));
}
function validate(operation: Operation, input: unknown): Data {
  const allowed: Record<Operation, string[]> = {
    find: ["view", "parent", "assignee", "status", "labels", "text", "limit"], get: ["ids"], edges: ["id", "direction", "types"], memories: ["search"], recall: ["key"], claim: ["id"], note: ["id", "text"], update: ["id", "set"], close: ["id", "reason"], create: ["title", "type", "priority", "description", "acceptance", "design", "parent", "discoveredFrom", "labels"], remember: ["key", "text"],
  };
  const d = fields(input, allowed[operation]);
  if (["edges", "claim", "note", "update", "close"].includes(operation)) stringField(d, "id", true);
  if (["recall", "remember"].includes(operation)) stringField(d, "key", true);
  if (["remember", "note"].includes(operation)) stringField(d, "text");
  if (operation === "close") stringField(d, "reason");
  if (operation === "get") list(d, "ids");
  if (operation === "memories" && d.search !== undefined) stringField(d, "search");
  if (operation === "edges") {
    if (!["down", "up"].includes(String(d.direction))) throw new Error("Invalid direction");
    // One qualified CLI --type per operation; arbitrary dependency types remain CLI-owned.
    if (d.types !== undefined && (list(d, "types").length !== 1)) throw new Error("Expected one dependency type");
  }
  if (operation === "find") {
    if (!["ready", "list", "search", "blocked"].includes(String(d.view))) throw new Error("Invalid view");
    if (d.limit !== undefined && (!Number.isInteger(d.limit) || Number(d.limit) < 1 || Number(d.limit) > 50)) throw new Error("Invalid limit");
    if (d.view === "search") stringField(d, "text");
    else if (d.text !== undefined) throw new Error("text requires search");
    if (d.parent !== undefined) { stringField(d, "parent", true); if (d.view === "search") throw new Error("parent unsupported for search"); }
    if (d.assignee !== undefined) { stringField(d, "assignee"); if (d.view === "blocked") throw new Error("assignee unsupported for blocked"); }
    if (d.status !== undefined && (!["list", "search"].includes(String(d.view)) || !["open", "in_progress", "blocked", "deferred", "closed"].includes(String(d.status)))) throw new Error("Invalid status filter");
    if (d.labels !== undefined) list(d, "labels");
  }
  if (operation === "update") {
    const set = fields(d.set, ["status", "priority", "addLabels", "removeLabels"]);
    if (!Object.values(set).some(v => v !== undefined)) throw new Error("Empty update");
    if (set.status !== undefined && !["open", "in_progress", "blocked", "deferred"].includes(String(set.status))) throw new Error("Invalid update status; use close separately");
    if (set.priority !== undefined && (!Number.isInteger(set.priority) || Number(set.priority) < 0 || Number(set.priority) > 4)) throw new Error("Invalid priority");
    for (const k of ["addLabels", "removeLabels"]) if (set[k] !== undefined) list(set, k);
    if ((set.addLabels as string[] | undefined)?.some(v => (set.removeLabels as string[] | undefined)?.includes(v))) throw new Error("Conflicting label update");
  }
  if (operation === "create") {
    stringField(d, "title");
    if (!["bug", "feature", "task", "epic", "chore"].includes(String(d.type))) throw new Error("Invalid issue type");
    if (!Number.isInteger(d.priority) || Number(d.priority) < 0 || Number(d.priority) > 4) throw new Error("Invalid priority");
    for (const k of ["description", "acceptance", "design", "parent", "discoveredFrom"]) if (d[k] !== undefined) stringField(d, k, ["parent", "discoveredFrom"].includes(k));
    if (d.labels !== undefined) list(d, "labels");
  }
  return d;
}

function argv(operation: Operation, d: Data): string[][] {
  const flags = (value: Data, mapping: Record<string, string>): string[] => Object.entries(mapping).flatMap(([key, flag]) => value[key] === undefined ? [] : [flag, String(value[key])]);
  switch (operation) {
    case "get": return (d.ids as string[]).map(id => ["show", id, "--json"]);
    case "find": return [[String(d.view), ...flags(d, { parent: "--parent", assignee: "--assignee", status: "--status" }), ...(d.labels ? ["--label", (d.labels as string[]).join(",")] : []), ...(d.view === "blocked" ? [] : ["--limit", String(Number(d.limit ?? 20) + 1)]), "--json", ...(d.view === "search" ? ["--", String(d.text)] : [])]];
    case "edges": return [["dep", "list", String(d.id), "--direction", String(d.direction), ...(d.types ? ["--type", String((d.types as string[])[0])] : []), "--json"]];
    case "claim": return [["update", String(d.id), "--claim", "--json"]];
    case "note": return [["update", String(d.id), "--append-notes", String(d.text), "--json"]];
    case "update": { const set = d.set as Data; return [["update", String(d.id), ...flags(set, { status: "--status", priority: "--priority" }), ...["addLabels", "removeLabels"].flatMap(k => (set[k] as string[] | undefined)?.flatMap(v => [k === "addLabels" ? "--add-label" : "--remove-label", v]) ?? []), "--json"]]; }
    case "close": return [["close", String(d.id), "--reason", String(d.reason), "--json"]];
    case "create": return [["create", "--title", String(d.title), "--type", String(d.type), "--priority", String(d.priority), ...flags(d, { description: "--description", acceptance: "--acceptance", design: "--design", parent: "--parent" }), ...(d.discoveredFrom ? ["--deps", `discovered-from:${d.discoveredFrom}`] : []), ...(d.labels ? ["--labels", (d.labels as string[]).join(",")] : []), "--json"]];
    case "memories": return [["memories", "--json", "--", ...(d.search === undefined ? [] : [String(d.search)])]];
    case "recall": return [["recall", String(d.key), "--json"]];
    case "remember": return [["remember", "--key", String(d.key), "--json", "--", String(d.text)]];
  }
}

function outputFor(operation: Operation, write: boolean): JS {
  const base: Record<string, JS> = { operation: { const: operation }, target: operation === "get" ? strings : operation === "find" || operation === "create" || operation === "memories" ? { type: "object", additionalProperties: true } : token, ...(write ? { actor: text } : {}), detail: { type: "string" }, reference: token };
  const requiredBase = ["operation", "target", ...(write ? ["actor"] : [])];
  const branch = (value: string, extra: Record<string, JS> = {}, required: string[] = []): JS => obj({ ...base, status: { const: value }, ...extra }, [...requiredBase, "status", ...required]);
  const readFailure = branch("failed", {}, ["detail"]);
  const uncertainty = branch("uncertain", {}, ["detail"]);
  switch (operation) {
    case "find": return { anyOf: [branch("acknowledged", { view: { enum: ["ready", "list", "search", "blocked"] }, records: { type: "array", items: summary }, scope: { type: "object", additionalProperties: true }, limit, complete }, ["view", "records", "scope", "limit", "complete"]), readFailure] };
    case "get": return { anyOf: [branch("acknowledged", { issues: { type: "object", additionalProperties: issue }, failed: { type: "array", items: obj({ id: token, detail: text }) }, complete: { type: "boolean" } }, ["issues", "failed", "complete"]), readFailure] };
    case "edges": return { anyOf: [branch("acknowledged", { records: { type: "array", items: { ...issue, required: ["id", "dependency_type"], properties: { dependency_type: text }, additionalProperties: true } }, direction: { enum: ["down", "up"] }, scope: { type: "object", additionalProperties: true }, complete }, ["records", "direction", "scope", "complete"]), readFailure] };
    case "memories": return { anyOf: [branch("found", { memories: { type: "object", additionalProperties: { type: "string" } } }, ["memories"]), readFailure] };
    case "recall": return { anyOf: [branch("found", { value: { type: "string" } }, ["reference", "value"]), branch("missing", {}, ["reference"]), readFailure] };
    case "remember": { const data = { data: { type: "object", additionalProperties: true } as JS, commitIndeterminate: { type: "boolean" } as JS }; return { anyOf: [branch("acknowledged", data, ["reference", "data", "commitIndeterminate"]), branch("landed-uncommitted", data, ["reference", "data", "commitIndeterminate"]), uncertainty] }; }
    case "claim": return { anyOf: [branch("acknowledged", { issue }, ["reference", "issue"]), branch("not-claimed", {}, ["detail"]), uncertainty] };
    default: return { anyOf: [branch("acknowledged", { issue }, ["reference", "issue"]), uncertainty] };
  }
}

interface OperationDefinition {
  name: Operation;
  write: boolean;
  input: JS;
  output: JS;
  argv(data: Data): string[][];
  normalize(data: Data, stdout: string, actor: string): Partial<ContinuityResult>;
}
function normalize(operation: Operation, d: Data, stdout: string, actor: string): Partial<ContinuityResult> {
  const value: unknown = JSON.parse(stdout);
  const fail = () => { throw new Error("Unsupported CLI acknowledgement; inspect current durable state before another write"); };
  if (operation === "memories" && record(value)) {
    const memories = { ...value };
    if (Object.hasOwn(memories, "schema_version") && memories.schema_version !== 1) return fail();
    if (memories.schema_version === 1) delete memories.schema_version;
    if (Object.values(memories).every(v => typeof v === "string")) return { status: "found", memories: memories as Record<string, string> };
  }
  if (operation === "recall" && record(value) && value.key === d.key && typeof value.value === "string" && typeof value.found === "boolean" && (value.found || value.value === "")) return value.found ? { status: "found", reference: String(d.key), value: value.value } : { status: "missing", reference: String(d.key) };
  if (operation === "remember" && record(value) && value.key === d.key && value.value === d.text && ["remembered", "updated"].includes(String(value.action))) return { status: value.committed === false || value.commit_error !== undefined || value.commit_indeterminate === true ? "landed-uncommitted" : "acknowledged", reference: String(d.key), data: value, commitIndeterminate: value.commit_indeterminate === true };
  if (operation === "find" || operation === "edges") {
    if (!Array.isArray(value)) return fail();
    for (const row of value) {
      if (!isIssue(row) || (operation === "edges" ? typeof row.dependency_type !== "string" : typeof row.title !== "string" || typeof row.status !== "string" || !Number.isInteger(row.priority) || typeof row.issue_type !== "string" || (row.assignee !== undefined && row.assignee !== null && typeof row.assignee !== "string"))) return fail();
    }
    const cap = operation === "edges" ? 50 : Number(d.limit ?? 20);
    return operation === "edges" ? { status: "acknowledged", records: value.slice(0, cap), direction: d.direction as "down" | "up", scope: { id: d.id, direction: d.direction, ...(d.types ? { types: d.types } : {}) }, complete: value.length > cap ? false : null } : { status: "acknowledged", view: String(d.view), records: value.slice(0, cap).map(row => ({ id: row.id, title: row.title, status: row.status, priority: row.priority, type: row.issue_type, ...(Object.hasOwn(row, "assignee") ? { assignee: row.assignee } : {}) })), scope: { ...d, limit: cap }, limit: cap, complete: ["blocked", "search"].includes(String(d.view)) ? (value.length > cap ? false : null) : value.length <= cap };
  }
  const row = operation === "create" && record(value) ? value : Array.isArray(value) && value.length === 1 && record(value[0]) ? value[0] : undefined;
  if (!isIssue(row)) return fail();
  if (operation === "get") return row.id === d.id ? { issue: row } : fail();
  if (operation !== "create" && row.id !== d.id) return fail();
  let accepted = false;
  switch (operation) {
    case "claim": accepted = row.assignee === actor && row.status === "in_progress"; break;
    case "note": accepted = typeof row.notes === "string" && row.notes.endsWith(String(d.text)); break;
    case "close": accepted = row.status === "closed"; break;
    case "create": accepted = row.title === d.title && row.issue_type === d.type && row.priority === d.priority && !row.assignee; break;
    case "update":
      accepted = Object.entries(d.set as Data).every(([key, value]) => {
        if (key === "addLabels" || key === "removeLabels") {
          if (!Array.isArray(row.labels)) return false;
          const labels = row.labels;
          return (value as string[]).every(label => key === "addLabels" ? labels.includes(label) : !labels.includes(label));
        }
        return row[key] === value;
      });
      break;
  }
  if (!accepted) return fail();
  return { status: "acknowledged", reference: row.id, issue: row };
}
const inputs: Record<Operation, JS> = {
  find: { anyOf: [obj({ view: { const: "ready" }, ...query }, ["view"]), obj({ view: { const: "list" }, ...query, status: { enum: ["open", "in_progress", "blocked", "deferred", "closed"] } }, ["view"]), obj({ view: { const: "search" }, assignee: text, labels: strings, status: { enum: ["open", "in_progress", "blocked", "deferred", "closed"] }, text, limit }, ["view", "text"]), obj({ view: { const: "blocked" }, parent: token, labels: strings, limit }, ["view"])] },
  get: obj({ ids: strings }), edges: obj({ id: token, direction: { enum: ["down", "up"] }, types: { type: "array", items: token, minItems: 1, maxItems: 1 } }, ["id", "direction"]), memories: obj({ search: text }, []), recall: obj({ key: token }), claim: obj({ id: token }), note: obj({ id: token, text }), update: obj({ id: token, set: { ...setSchema, minProperties: 1 } }), close: obj({ id: token, reason: text }), create: createSchema, remember: obj({ key: token, text }),
};
const OPERATIONS: OperationDefinition[] = (Object.keys(inputs) as Operation[]).map(name => {
  const write = ["claim", "note", "update", "close", "create", "remember"].includes(name);
  return { name, write, input: inputs[name], output: outputFor(name, write), argv: d => argv(name, d), normalize: (d, stdout, actor) => normalize(name, d, stdout, actor) };
});

/** Canonical shell resource only; execution always uses the separate argv array. */
function shellResource(args: readonly string[]): string {
  return ["bd", ...args].map(arg => /^[a-zA-Z0-9_./:=-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", "'\\''")}'`).join(" ");
}
function failureDetail(error: unknown): string {
  if (error instanceof PrimeProcessError) return [error.message, error.stderr.trim(), error.stdout.trim()].filter(Boolean).join(": ");
  return error instanceof Error ? error.message : String(error);
}
/** Only the observed single-target JSON diagnostic establishes a non-claim. */
function claimConflict(error: unknown, id: unknown): boolean {
  if (!(error instanceof PrimeProcessError) || error.exitCode !== 1 || error.stdout.trim()) return false;
  try {
    const line = error.stderr.trim().split("\n").at(-1)!;
    const data: unknown = JSON.parse(line);
    return record(data) && data.schema_version === 1 && data.error === "1 of 1 issues failed to update" && Array.isArray(data.failed) && data.failed.length === 1 && record(data.failed[0]) && data.failed[0].id === id && typeof data.failed[0].error === "string" && data.failed[0].error.startsWith("updating issue: issue already claimed: already assigned to ");
  } catch { return false; }
}

function contains(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

/**
 * Fixed N1 definitions using the same runner in production and tests. Ordinary setup must not
 * register these before 1.1 qualification. Beads owns its normal routing and storage semantics.
 */
export function createContinuityTools(host: ContinuityHost, deps: ContinuityDependencies = {}): Info[] {
  const bd = deps.bd ?? runBd;
  const canonical = deps.realpath ?? realpath;

  return OPERATIONS.map((definition): Info => {
    const operation = definition.name;
    return {
      name: operation,
      options: { namespace: "beads", permission: "shell", codemode: true },
      description: `Beads ${operation}: fixed permissioned operation. No new saved grant; ask may prompt again.`,
      input: definition.input,
      output: definition.output,
      async execute(input, context) {
        const data = validate(operation, input);
        const write = definition.write;
        const actor = executorActor(context);
        const commands = definition.argv(data).map(args => {
          const terminator = args.indexOf("--");
          args.splice(terminator < 0 ? args.length : terminator, 0, ...(write ? ["--actor", actor] : []), "--sandbox");
          return args;
        });
        const target = operation === "get" ? data.ids as string[] : operation === "find" || operation === "create" || operation === "memories" ? { ...data } : String(data.id ?? data.key);
        const base = { operation, target, ...(write ? { actor } : {}) };
        const signal = deps.signal ? AbortSignal.any([context.signal, deps.signal]) : context.signal;
        signal.throwIfAborted();
        const options = { signal };
        const runtime = createGuardRuntime((cwd, argv) => bd(cwd, argv, options));
        if (deps.readText) runtime.readText = deps.readText;
        const invocation = { sessionID: context.sessionID, agent: context.agent,
          source: { type: "tool" as const, messageID: context.messageID, id: context.id }, save: [] };

        async function assertPermission(action: string, resources: string[]): Promise<void> {
          signal.throwIfAborted();
          // The public API owns its prompt and exposes no cancellation endpoint. Stop this
          // invocation on unload/abort; a late approval must never reach process execution.
          await new Promise<void>((resolve, reject) => {
            const onAbort = () => reject(signal.reason);
            signal.addEventListener("abort", onAbort, { once: true });
            void host.permission.assert({ ...invocation, action, resources }).then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
            if (signal.aborted) onAbort();
          });
        }

        const directory = host.location.directory;
        async function invocationDirectory(): Promise<string> {
          signal.throwIfAborted();
          const response = await host.session.get({ sessionID: context.sessionID });
          if (response.location.directory !== directory) throw new Error("Session location changed; operation withheld");
          return canonical(directory);
        }

        async function assertGuard(): Promise<void> {
          const guard = await checkBeadsStore(directory, runtime);
          if (guard.kind !== "ready") throw new Error(`Beads store held: ${guard.kind}`);
        }

        const resolvedDirectory = await invocationDirectory();
        const project = host.location.project.directory;
        // Match shell access for the explicit cwd. Internal Beads redirects, backend selection
        // and issue routing remain CLI-owned; they are not extra plugin permission targets.
        const external = [...new Set([directory, resolvedDirectory].filter((path) =>
          !contains(directory, path) && !(project !== parse(project).root && contains(project, path)))
          .map((path) => `${path.replaceAll("\\", "/").replace(/\/$/, "")}/*`))];
        if (external.length) await assertPermission("external_directory", external);
        await assertGuard();
        await assertPermission("shell", commands.map(shellResource));
        const issues: Record<string, Record<string, unknown>> = {};
        const failed: Array<{ id: string; detail: string }> = [];
        let result: ContinuityResult = { ...base, status: "failed", detail: "No CLI result" };
        for (const args of commands) {
          // Approval never freezes authority. Recheck before EVERY child process, including get.
          signal.throwIfAborted();
          await assertGuard();
          if (await invocationDirectory() !== resolvedDirectory) throw new Error("Invocation directory changed during approval");
          if (executorActor(context) !== actor) throw new Error("Executor changed before spawn");
          signal.throwIfAborted();
          const item = operation === "get" ? { id: args[1] } : data;
          try {
            const normalized = definition.normalize(item, await bd(directory, args, options), actor);
            if (operation === "get") issues[String(item.id)] = normalized.issue!;
            else result = { ...base, ...normalized } as ContinuityResult;
          } catch (error) {
            result = { ...base, status: write ? claimConflict(error, data.id) && operation === "claim" ? "not-claimed" : "uncertain" : "failed", detail: failureDetail(error) };
            if (operation === "get") failed.push({ id: String(item.id), detail: result.detail! });
            if (operation === "recall" && error instanceof PrimeProcessError && error.exitCode === 1) {
              try {
                const missing = definition.normalize(data, error.stdout, actor);
                if (missing.status === "missing") result = { ...base, ...missing } as ContinuityResult;
              } catch { /* Keep original diagnostic; absence is not established. */ }
            }
            if (signal.aborted) {
              // A started write may have landed even when cancellation prevents a normal return.
              if (write) notify(result);
              signal.throwIfAborted();
            }
          }
        }
        if (operation === "get") result = Object.keys(issues).length ? { ...base, status: "acknowledged", issues, failed, complete: failed.length === 0 } : { ...base, status: "failed", detail: failed.map(f => `${f.id}: ${f.detail}`).join("; ") };
        function notify(value: ContinuityResult): void {
          try { deps.acknowledged?.(context.sessionID, value); }
          catch { value.detail = [value.detail, "Context refresh notification failed; the reported persistence outcome still applies."].filter(Boolean).join("; "); }
        }
        // Sole write acknowledgement; outer execute must not duplicate it.
        notify(result);
        signal.throwIfAborted();
        return { output: result, content: JSON.stringify(result) };
      },
    };
  });
}
