# Boundaries: durable tracking and short-lived work

> Adapted from [Beads marketplace-main `BOUNDARIES.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/BOUNDARIES.md).

Use Beads for work whose ownership, dependencies, blocker, history, or next
session matters to the project. Keep a short linear breakdown in the current
conversation when it is only an execution aid and no repository rule requires a
durable issue. Do not make a second Markdown task list the durable project record.

## Choose the right record

| Situation | Record | Why |
| --- | --- | --- |
| Short, linear steps that will finish in this session | Conversation checklist, if useful | Keeps execution visible without creating durable issue noise. |
| Work needs an owner, blocker, dependency, acceptance, or later resume | Existing or authorized Bead | Preserves execution history and handoff context. |
| Validated learning is likely to help on future issues | Relevant Beads memory | Reusable knowledge is separate from a task's attempts. |
| Intended behavior and acceptance contract | Project's specification system (for example OpenSpec, when used) | Keeps the project specification authoritative. |
| Detailed rationale, source evidence, or qualification result | Project documentation | Gives durable evidence a stable home. |
| Temporary command output | Current session; summarize only if it changes a decision | Avoids storing noise. |
| Host explicitly exposes experimental todo support and the user/project opts in | Host-owned transient checklist | Optional convenience only; it is not installed or enabled here. |

OpenCode 2.1 experimental todo support is opt-in and host-owned. Do not require
it, turn it on, or assume Claude's `TodoWrite` exists in every host. If no
session checklist is available, keep a brief checklist in the conversation or
use an authorized Bead when the work is durable.

Do not create a new Bead for every command, transient retry, small nit, or
document. Create or update a record when the work is genuinely durable and you
have authority to do so. Existing assignment and project policy take priority
over any general heuristic here.

Ask: “Could I resume this after two weeks away?” If the answer needs context
that would otherwise be lost, preserve it in the appropriate authorized record.

## Transition when the work grows

It is reasonable to begin with a transient checklist for “update the retry
message and run its focused test.” If the test uncovers an independent data-loss
case, a prerequisite, or work that must continue next session, stop treating the
checklist as the durable record. If authorized, create or update the appropriate
Bead with the attempted fix, test evidence, discovered blocker, acceptance, and
next step; link new work to its source where useful. Keep the checklist only for
the remaining steps in this session. Without authority to create or change a
Bead, preserve the discovery in the assigned record if permitted, then report
and stop at the scope boundary.

## Preserve the authority boundary

A ready issue is available work, not permission. A single-item assignment ends
after that item; continue only inside an explicitly authorized batch or goal.
Finding related work does not authorize acting on it. Link or report discoveries
only within the authority already granted.

For a tracked item, preserve its execution identity and history. Claim
atomically when authorized, use an explicit actor on writes, and append material
progress rather than replacing previous notes. A task record does not own the
Beads database or authorize sync, setup, permission changes, or Git operations.
