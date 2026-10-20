# Integrating Beads with project workflow

> Adapted from [Beads marketplace-main `INTEGRATION_PATTERNS.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/INTEGRATION_PATTERNS.md).

Use Beads to preserve execution state, not to replace every other source of
intent or evidence. A useful division is:

| Need | Source of truth |
| --- | --- |
| Intended behavior, requirements, and acceptance contract | OpenSpec |
| Detailed rationale, measurements, source references, and qualification evidence | Project documentation |
| Execution ownership, dependencies, blockers, progress notes, and status | Beads |
| Short checklist for today's already-authorized steps | Current session or optional host-owned todo, if available |

Link those records when the relationship helps a future reader. Do not duplicate
an entire design or test log in Beads; append a concise checkpoint with the
result, why it matters, and where the detailed evidence lives.

## Worked linkage: plan, review, then execute

For example, an OpenSpec change can own the behavior and acceptance criteria
for a new export option. Put detailed trade-offs and test evidence in a linked
project document. A quick planning draft needs no separate Bead. For substantial
multi-session or delegated planning, create one bounded planning Bead, distinct
from the implementation epic, and reference the OpenSpec change and evidence
document there.

When review is independently owned and substantive, use one bounded review
Bead linked to the planning work and the exact candidate revision. Record the
reviewer's actual actor/session, verdict, findings, and evidence. Reuse that
same review Bead for correction and recheck cycles; do not create a ticket per
document, retry, or transient nit. Implementation issues track the authorized
execution work. OpenSpec and docs remain the spec/evidence sources, not duplicate
task trackers; planning or review completion does not authorize implementation
or prove parent acceptance. A ready Bead is not dispatch authority.

## Milestones and recovery

Read existing issue notes and relevant project memory before choosing a next
step. At a material milestone, append attempted work, result, rationale, changed
decision, blocker, and next action. Use the explicit executor actor. If the
operation does not materially change the work context, no redundant write is
needed.

```sh
bd update '<execution-id>' \
  --append-notes="Tried X; observed Y in tests/export.test.ts; chose Z because …; blocker …; next …" \
  --actor='codex:<short-session>' --sandbox --json
```

For delegation, send the worker the exact authorized scope and its actual actor.
Ask for the attempt, outcome, evidence, rationale, blocker, next step, and any
durable record references. The parent reconciles the return against the original
intent and acceptance before continuing or closing. Delegation is discretionary;
do not route work based on a command count.

OpenCode 2.1 experimental todo support remains opt-in and host-owned. Use it only
when that host feature is actually available and the user/project chooses it;
do not enable it or present it as a universal `TodoWrite` tool. It can hold a
temporary execution checklist, not replace OpenSpec, project evidence, or Beads.

## Keep durable and transient information distinct

Task-specific findings stay with the task. Reusable memory is reserved for
validated knowledge likely to apply elsewhere. Transient shell output and
temporary execution checklists stay local unless they change a decision or must
survive resumption. Existing user and repository instructions remain in force;
an integration does not grant new authority to create issues, mutate other
records, or broaden a task.
