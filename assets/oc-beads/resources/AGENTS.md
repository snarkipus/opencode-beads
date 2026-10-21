# Agent beads and executor identity

> Adapted from [Beads marketplace-main `AGENTS.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/AGENTS.md).

## Keep the concepts separate

Beads executor attribution, issue assignment, and specialized agent/role beads
serve different purposes. For ordinary delegated work, use the authorized issue
and assign or claim it for the actual executor. Supply that executor's explicit
actor on each Beads write and heartbeat. Do not substitute the parent, human Git
identity, or model name for the worker identity.

Read `created_by`, `owner`, and `assignee` as separate fields. `created_by` is
audit authorship, `owner` identifies the record/account owner, and `assignee`
identifies the executor. A claim does not rewrite historical authorship. Record
known provenance corrections in append-style notes.

## Specialized agent/role beads are optional

The upstream resource describes a richer agent state machine and named slots.
In the inspected Beads 1.3.1 CLI, `bd agent --help` and `bd slot --help` both
return unknown-command errors. The installed CLI does support ordinary issue
assignment, atomic task claims, and `bd heartbeat` for a claimed issue lease.
Those are useful executor conventions, not a one-to-one implementation of
agent/role beads, their state machine, or slot queries.

The upstream model describes lifecycle labels such as idle, spawning,
running/working, done, stuck, stopped, and dead, and slots such as a current-work
hook or a role. Treat these as design concepts from the source material, not
states or slot records this CLI can create or query.

Do not assume `bd agent` or `bd slot` is available and do not invent replacement
flags. Workflows that require those specialized APIs must stop or use a separately
approved, documented system. Routine Beads work does not need agent beads,
Witness, a slot service, or a new orchestration layer.

## When a separate agent record could help

Only consider specialized agent records when a project already has a supported
coordination design that needs durable role capabilities, liveness, or multiple
named assignments. Establish who owns those records and how they are retired
before writing any. A heartbeat on an assigned issue refreshes that issue's
claim lease; it is not a general process monitor.
