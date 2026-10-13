import { describe, expect, test } from "bun:test";
import { TASK_AGENT_PERMISSIONS } from "../src/agents";

type Rule = { action: string; resource: string; effect: string };

/**
 * OpenCode 2.0.27's wildcard match, transcribed from the shipped bundle: `*` spans anything
 * (spaces included), `?` is one character, and a trailing ` *` also matches nothing.
 */
function wildcardMatch(text: string, pattern: string): boolean {
  let source = pattern
    .replaceAll("\\", "/")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  if (source.endsWith(" .*")) source = `${source.slice(0, -3)}( .*)?`;
  return new RegExp(`^${source}$`, "s").test(text.replaceAll("\\", "/"));
}

/** OpenCode's rule evaluation: the last matching rule wins, and no match means `ask`. */
function evaluate(action: string, resource: string, rules: readonly Rule[]): string {
  return (
    rules.findLast((rule) => wildcardMatch(action, rule.action) && wildcardMatch(resource, rule.resource))
      ?.effect ?? "ask"
  );
}

/** A permissive base ruleset, so only the task-agent rules can produce `ask`. */
const rules: Rule[] = [{ action: "*", resource: "*", effect: "allow" }, ...TASK_AGENT_PERMISSIONS];
const decide = (command: string) => evaluate("shell", command, rules);

describe("task-agent permission decisions", () => {
  test.each([
    "git commit",
    "git commit -m done",
    "git -c user.name=worker commit -m done",
    "git push",
    "git push origin main",
    "git -C . push",
    "git --no-pager -C /repo push --force",
    "bd dolt push",
    "bd --json dolt push",
    "bd dolt pull",
    "bd --db /x/.beads dolt pull",
    "bd sync",
    "bd --json sync --flush-only",
  ])("asks before %s", (command) => {
    expect(decide(command)).toBe("ask");
  });

  test.each([
    "git status",
    "git diff HEAD",
    "git log --oneline -5",
    "git commit-graph verify",
    "bd ready --json",
    "bd update x-1 --claim --json",
    "bd close x-1 --reason done",
    "bd dolt status",
    "bd show sync-x --json",
  ])("allows %s", (command) => {
    expect(decide(command)).toBe("allow");
  });
});
