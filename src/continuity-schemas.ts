import type { Operation } from "./continuity";

export type JS = import("effect").JsonSchema.JsonSchema;
const text: JS = { type: "string", minLength: 1, maxLength: 64_000 };
const token: JS = { ...text, pattern: "^[a-zA-Z0-9][a-zA-Z0-9._:-]*$" };
const strings: JS = { type: "array", items: token, minItems: 1, maxItems: 25, uniqueItems: true };
const status: JS = { enum: ["open", "in_progress", "blocked", "deferred"] };
const priority: JS = { type: "integer", minimum: 0, maximum: 4 };
const obj = (properties: Record<string, JS>, required = Object.keys(properties)): JS => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const issue: JS = {
  type: "object",
  properties: {
    id: token,
    title: text,
    status: { type: "string" },
    priority,
    issue_type: text,
    assignee: { type: "string" },
    created_by: { type: "string" },
    owner: { type: "string" },
    notes: { type: "string" },
    acceptance_criteria: { type: "string" },
    design: { type: "string" },
    labels: { type: "array", items: { type: "string" } },
  },
  required: ["id"],
  additionalProperties: true,
};
const summary: JS = obj(
  { id: token, title: text, status: text, priority, type: text, assignee: { type: ["string", "null"] } },
  ["id", "title", "status", "priority", "type"],
);
const complete: JS = { type: ["boolean", "null"] };
const limit: JS = { type: "integer", minimum: 1, maximum: 50, default: 20 };
const query = { parent: token, assignee: text, labels: strings, limit };
const setSchema = obj({ status, priority, addLabels: strings, removeLabels: strings }, []);
const createSchema = obj(
  {
    title: text,
    type: { enum: ["bug", "feature", "task", "epic", "chore"] },
    priority,
    description: text,
    acceptance: text,
    design: text,
    parent: token,
    discoveredFrom: token,
    labels: strings,
  },
  ["title", "type", "priority"],
);

/** Catalog input schemas in registration order; the executor still validates raw invocations. */
export const inputs: Record<Operation, JS> = {
  find: {
    anyOf: [
      obj({ view: { const: "ready" }, ...query }, ["view"]),
      obj(
        {
          view: { const: "list" },
          ...query,
          status: { enum: ["open", "in_progress", "blocked", "deferred", "closed"] },
        },
        ["view"],
      ),
      obj(
        {
          view: { const: "search" },
          assignee: text,
          labels: strings,
          status: { enum: ["open", "in_progress", "blocked", "deferred", "closed"] },
          text,
          limit,
        },
        ["view", "text"],
      ),
      obj({ view: { const: "blocked" }, parent: token, labels: strings, limit }, ["view"]),
    ],
  },
  get: obj({ ids: strings }),
  edges: obj(
    {
      id: token,
      direction: { enum: ["down", "up"] },
      types: { type: "array", items: token, minItems: 1, maxItems: 1 },
    },
    ["id", "direction"],
  ),
  memories: obj({ search: text }, []),
  recall: obj({ key: token }),
  claim: obj({ id: token }),
  note: obj({ id: token, text }),
  update: obj({ id: token, set: { ...setSchema, minProperties: 1 } }),
  close: obj({ id: token, reason: text }),
  create: createSchema,
  remember: obj({ key: token, text }),
};

/**
 * Describe operation-specific results, including partial reads and uncertainty after a write.
 * The schema describes the output; the decoder establishes whether a CLI reply supports that outcome.
 *
 * @param operation - Operation whose result branches are declared.
 * @param write - Whether an invocation actor is required in every result branch.
 */
export function outputFor(operation: Operation, write: boolean): JS {
  let target = token;
  switch (operation) {
    case "get":
      target = strings;
      break;
    case "find":
    case "create":
    case "memories":
      target = { type: "object", additionalProperties: true };
      break;
  }

  const base: Record<string, JS> = {
    operation: { const: operation },
    target,
    ...(write ? { actor: text } : {}),
    detail: { type: "string" },
    reference: token,
  };
  const requiredBase = ["operation", "target", ...(write ? ["actor"] : [])];
  const branch = (value: string, extra: Record<string, JS> = {}, required: string[] = []): JS =>
    obj({ ...base, status: { const: value }, ...extra }, [...requiredBase, "status", ...required]);
  const readFailure = branch("failed", {}, ["detail"]);
  const uncertainty = branch("uncertain", {}, ["detail"]);
  switch (operation) {
    case "find":
      return {
        anyOf: [
          branch(
            "acknowledged",
            {
              view: { enum: ["ready", "list", "search", "blocked"] },
              records: { type: "array", items: summary },
              scope: { type: "object", additionalProperties: true },
              limit,
              complete,
            },
            ["view", "records", "scope", "limit", "complete"],
          ),
          readFailure,
        ],
      };
    case "get":
      return {
        anyOf: [
          branch(
            "acknowledged",
            {
              issues: { type: "object", additionalProperties: issue },
              failed: { type: "array", items: obj({ id: token, detail: text }) },
              complete: { type: "boolean" },
            },
            ["issues", "failed", "complete"],
          ),
          readFailure,
        ],
      };
    case "edges":
      return {
        anyOf: [
          branch(
            "acknowledged",
            {
              records: {
                type: "array",
                items: {
                  ...issue,
                  required: ["id", "dependency_type"],
                  properties: { dependency_type: text },
                  additionalProperties: true,
                },
              },
              direction: { enum: ["down", "up"] },
              scope: { type: "object", additionalProperties: true },
              complete,
            },
            ["records", "direction", "scope", "complete"],
          ),
          readFailure,
        ],
      };
    case "memories":
      return {
        anyOf: [
          branch("found", { memories: { type: "object", additionalProperties: { type: "string" } } }, ["memories"]),
          readFailure,
        ],
      };
    case "recall":
      return {
        anyOf: [
          branch("found", { value: { type: "string" } }, ["reference", "value"]),
          branch("missing", {}, ["reference"]),
          readFailure,
        ],
      };
    case "remember": {
      const data: Record<string, JS> = {
        data: { type: "object", additionalProperties: true },
        commitIndeterminate: { type: "boolean" },
      };
      const required = ["reference", "data", "commitIndeterminate"];
      return {
        anyOf: [branch("acknowledged", data, required), branch("landed-uncommitted", data, required), uncertainty],
      };
    }
    case "claim":
      return {
        anyOf: [
          branch("acknowledged", { issue }, ["reference", "issue"]),
          branch("not-claimed", {}, ["detail"]),
          uncertainty,
        ],
      };
    default:
      return { anyOf: [branch("acknowledged", { issue }, ["reference", "issue"]), uncertainty] };
  }
}
