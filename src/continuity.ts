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
  operation?: Operation;
  status: "acknowledged" | "landed-uncommitted" | "uncertain" | "failed" | "found" | "missing";
  reference?: string;
  value?: string;
  data?: unknown;
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
export function executorActor(context: Pick<ToolContext, "sessionID" | "agent">): string {
  if ([context.sessionID, context.agent].some((value) => typeof value !== "string" || !value.trim() || value.includes("\0"))) {
    throw new Error("Invocation executor identity unavailable; write withheld");
  }
  const label = context.agent.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 24) || "agent";
  const suffix = createHash("sha256").update(context.sessionID).update("\0").update(context.agent).digest("hex").slice(0, 12);
  return `opencode:${label}:${suffix}`;
}

type Operation = "checkpoint" | "show" | "memories" | "recall" | "remember";
const OPERATIONS: readonly Operation[] = ["checkpoint", "show", "memories", "recall", "remember"];

function stringField(data: Record<string, unknown>, key: string, token = false): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || value.length > 64_000 ||
      (token && !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value))) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function inputFor(operation: Operation, input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new Error("Expected operation input");
  const data = input as Record<string, unknown>;
  const fields = operation === "checkpoint" ? ["id", "text"] : operation === "remember" ? ["key", "text"] :
    operation === "show" ? ["id"] : operation === "recall" ? ["key"] : ["search"];
  for (const key of Object.keys(data)) if (!fields.includes(key)) throw new Error(`Unsupported input: ${key}`);
  for (const key of fields) {
    if (operation === "memories" && data.search === undefined) continue;
    stringField(data, key, key === "id" || key === "key");
  }
  return data;
}

function operationArgs(operation: Operation, data: Record<string, unknown>): string[] {
  switch (operation) {
    case "checkpoint": return ["update", String(data.id), "--append-notes", String(data.text), "--json"];
    case "show": return ["show", String(data.id), "--json"];
    case "memories": return ["memories", "--json", "--", ...(data.search === undefined ? [] : [String(data.search)])];
    case "recall": return ["recall", String(data.key), "--json"];
    case "remember": return ["remember", "--key", String(data.key), "--json", "--", String(data.text)];
  }
}

/** Canonical shell resource only; execution always uses the separate argv array. */
function shellResource(args: readonly string[]): string {
  return ["bd", ...args].map((arg) => /^[a-zA-Z0-9_./:=-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", "'\\''")}'`).join(" ");
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failureDetail(error: unknown): string {
  if (error instanceof PrimeProcessError) return [error.message, error.stderr.trim()].filter(Boolean).join(": ");
  return error instanceof Error ? error.message : "bd failed";
}

function acknowledge(operation: Operation, data: Record<string, unknown>, output: string): ContinuityResult {
  const result: unknown = JSON.parse(output);
  if (operation === "show" || operation === "checkpoint") {
    const issue: unknown = Array.isArray(result) && result.length === 1 ? result[0] : undefined;
    if (record(issue) && issue.id === data.id && (operation === "show" ||
        (typeof issue.notes === "string" && issue.notes.endsWith(String(data.text))))) {
      return { status: "acknowledged", reference: String(data.id), data: issue };
    }
  } else if (operation === "memories") {
    if (record(result) && Object.values(result).every((value) => typeof value === "string")) {
      return { status: "acknowledged", data: result };
    }
  } else if (record(result) && result.key === data.key) {
    if (operation === "recall" && typeof result.found === "boolean" && typeof result.value === "string") {
      return { status: result.found ? "found" : "missing", reference: String(data.key), value: result.value };
    }
    if (operation === "remember" && ["remembered", "updated"].includes(String(result.action)) && result.value === data.text) {
      return {
        status: result.committed === false || result.commit_error !== undefined || result.commit_indeterminate === true
          ? "landed-uncommitted" : "acknowledged",
        reference: String(data.key), data: result,
        commitIndeterminate: result.commit_indeterminate === true,
      };
    }
  }
  throw new Error("Unsupported CLI acknowledgement; inspect current durable state before another write");
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

  return OPERATIONS.map((operation): Info => {
    const properties = operation === "checkpoint" ? { id: { type: "string" }, text: { type: "string" } } :
      operation === "remember" ? { key: { type: "string" }, text: { type: "string" } } :
      operation === "show" ? { id: { type: "string" } } : operation === "recall" ? { key: { type: "string" } } : { search: { type: "string" } };
    return {
      name: `beads_${operation}`,
      options: { permission: "shell" },
      description: `Beads ${operation}: fixed permissioned operation. No new saved grant; ask may prompt again.`,
      input: { type: "object", properties, additionalProperties: false, required: operation === "memories" ? [] : Object.keys(properties) },
      async execute(input, context) {
        const data = inputFor(operation, input);
        const write = operation === "checkpoint" || operation === "remember";
        const actor = executorActor(context);
        const args = operationArgs(operation, data);
        // Put global flags before `--`, which terminates flag parsing for arbitrary content.
        const terminator = args.indexOf("--");
        args.splice(terminator < 0 ? args.length : terminator, 0, ...(write ? ["--actor", actor] : []), "--sandbox");
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
        await assertPermission("shell", [shellResource(args)]);
        signal.throwIfAborted();
        await assertGuard();
        if (await invocationDirectory() !== resolvedDirectory) throw new Error("Invocation directory changed during approval");
        if (executorActor(context) !== actor) throw new Error("Executor changed before spawn");
        signal.throwIfAborted();
        let result: ContinuityResult;
        try {
          result = acknowledge(operation, data, await bd(directory, args, options));
        } catch (error) {
          if (!write && operation === "recall" && error instanceof PrimeProcessError && error.exitCode === 1) {
            try {
              result = acknowledge(operation, data, error.stdout);
              if (result.status !== "missing") throw error;
            } catch { result = { status: "failed", detail: `${failureDetail(error)}; missing memory not established` }; }
          } else {
            result = { status: write ? "uncertain" : "failed", detail: failureDetail(error) };
          }
        }
        // Sole acknowledgement site for direct and inner code-mode calls. Never observe the outer
        // `execute` result as another write; code-mode children can share message/call IDs.
        result.operation = operation;
        if (write) {
          try { deps.acknowledged?.(context.sessionID, result); }
          catch { result.detail = "Context refresh notification failed; the reported persistence outcome still applies."; }
        }
        return { output: result, content: JSON.stringify(result) };
      },
    };
  });
}
