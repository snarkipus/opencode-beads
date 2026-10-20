# Common execution patterns

> Adapted from [Beads marketplace-main `PATTERNS.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/PATTERNS.md).

## Start with the actual request

Read the assigned issue, parent decisions, relevant dependencies, and current
notes. Distinguish the requested result from a suggested implementation. A
ready issue or an open side quest does not itself authorize work.

## Record a side discovery without expanding scope

When a new concern appears, preserve enough evidence to explain it. If recording
it is authorized, create a concise issue and link its provenance. Continue only
if the current authorization explicitly includes it. Otherwise finish the
assigned work, report the discovery, and stop.

## Resume a multi-session task

Read the latest appended checkpoint and relevant reusable memory. Reconfirm the
state from the issue or current evidence instead of assuming the prior next step
still applies. Preserve rejected approaches so the next executor does not repeat
them.

For research or debugging, keep the hypothesis, the attempt, and the evidence
that changed the conclusion together. A rejected hypothesis is useful when its
failure is explained; an unexplained “tried X” is not. If the changed conclusion
creates separate durable work, record its source only when authorized. Discovery
does not by itself make that work a blocker or assign it to the current executor.

## Change status and close carefully

Use the installed CLI's valid transitions. Claim only the item you are
authorized to execute; keep the actual executor actor on claim, updates, and
heartbeats. Before closure, compare the deliverable with acceptance criteria and
record validation results. If a blocker or failed check remains, report it and
leave the state accurate. If someone else owns acceptance, return the evidence
instead of closing on their behalf.

There is no mandatory one-issue-per-session cadence. Keep each Bead's evidence
clear, while following an explicitly authorized multi-item batch where one was
granted. Use `bd '<command>' --help` for current syntax; do not use old MCP-only
examples or replace notes during ordinary checkpoints.
