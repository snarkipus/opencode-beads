# Workflows and checkpoints

> Adapted from [Beads marketplace-main `WORKFLOWS.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/WORKFLOWS.md). The append policy below resolves conflicting upstream examples: checkpoints append; replacing notes is deliberate.

## Begin with the current context

Use current Beads context if it was supplied. Read the target issue, dependencies,
existing notes, and relevant memory before choosing an action. Confirm the exact
assignment and authority. Do not treat `ready` output as an assignment or
permission to work every listed item.

For an authorized task, claim it atomically with the actual executor actor. Keep
that actor on all subsequent writes and heartbeats. Direct execution is fine for
small tasks; use delegation where it improves the work, carrying a bounded scope
and the real delegate actor. Do not impose a one-item-per-invocation loop or
delegate by command count.

## Checkpoint at useful transitions

Append when a failed approach changes the next step, a finding is validated, a
decision changes, work becomes blocked, a child returns, or a session may stop.
Include the attempt, result, why it matters, evidence, blocker, and next action.
Use `--append-notes`, for example:

```sh
bd update '<id>' --append-notes="Validated …; evidence …; next …" --actor='<executor-actor>' --sandbox --json
```

This is an append. Do not use the replacing `--notes` field as the default
checkpoint. If nothing material changed, do not write a redundant note just to
meet a quota. Avoid credentials, raw logs, and claims unsupported by evidence.

## Capture reusable knowledge selectively

Task details and short-lived failures belong with the issue. Search existing
memory before recording a validated lesson that will likely help elsewhere.
Include its scope and evidence, use the actual executor actor for memory writes,
and amend stale knowledge intentionally. Do not save every task outcome as
global memory.

## Validate and hand off

Check the issue's acceptance conditions, run authorized relevant validation,
and record exact results. If a parent or human owns acceptance, return the
evidence without closing for them. A delegate returns attempts, results,
rationale, validation, blockers, next action, and useful record references; the
parent reconciles before continuing. If the task was an exact assignment, stop
there. Explicitly authorized batches may continue within their stated scope;
new discoveries never expand it.

When context is held or a required guarantee is missing, stop the affected path
and state the limitation. Do not switch to a manual prime, unregistered tool,
automatic setup, sync, or permission change to complete it.

## Planning and independently owned review

Follow project-owned planning and review policy. Track substantive multi-session
or delegated planning in one bounded planning item, separate from implementation;
a quick draft need not get its own ticket. Give substantive independently owned
review one bounded review item linked to planning and the exact candidate. Reuse
the same review item through corrections and rechecks. Record actual reviewer
actor/session, verdict, findings and evidence without retroactive claims.
Planning/review closure needs its own evidence and owner acceptance; readiness
alone never authorizes dispatch, implementation, release or deployment.
