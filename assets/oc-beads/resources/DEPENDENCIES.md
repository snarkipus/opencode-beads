# Dependency types and direction

> Adapted from [Beads marketplace-main `DEPENDENCIES.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/DEPENDENCIES.md).

Beads dependencies describe relationships between issues. Confirm direction
before writing: in the current `bd create` help, a bare ID, `depends-on:<id>`, or
`blocked-by:<id>` makes the new issue depend on that ID; `blocks:<id>` reverses
that direction. Check `bd dep --help` for the current update form.

## Choose a relationship by meaning

| Question | Relationship | Effect to preserve |
| --- | --- | --- |
| Can B start before A is complete? | `blocks` (A blocks B) | Hard ordering constraint; the dependent waits. |
| Is B part of A's planned work? | `parent-child` (A parent, B child) | Decomposition and ownership; not an ordering edge. |
| Did work on A uncover B? | `discovered-from` (B from A) | Discovery provenance; not permission to start B. |
| Are A and B connected but independently actionable? | `related` | Informational association, not a blocker. |

For a new dependent issue, current `bd create --help` says that
`--deps='depends-on:<prerequisite-id>'` means **this new issue depends on that
prerequisite**. For example, an API task can depend on a schema task like this:

```sh
bd create "Implement API" --type=task \
  --parent='<epic-id>' \
  --deps='depends-on:<schema-task-id>' \
  --actor='codex:<short-session>' --sandbox --json
```

The command above makes the API task a child of an epic while also adding a
separate hard blocker on schema setup. Read back both edges: hierarchy answers
“what work belongs here?”; a blocker answers “what must finish first?”. Add a
hard block only when a real prerequisite exists.

### Diamond and parallel merge

```text
                  setup
                 /     \
            API work   UI work
                 \     /
                 integration tests

setup blocks API work and UI work; each implementation blocks the merge tests.
The two implementations can proceed in parallel after setup.
```

`related` is useful for an optional improvement that should remain independently
ready. A discovery cascade is different: B may be discovered from A, and C from
B, preserving how the questions emerged. `discovered-from` does not make that
cascade required work, grant authority, or create a hard blocker.

Use the narrowest accurate relation. Do not use a hard blocker for a preference,
shared topic, or unverified assumption. Avoid cycles and redundant edges. Before
adding or changing an edge, inspect both issues and verify which one depends on
which. Afterward, read the graph back when the relationship affects readiness.

Dependency direction is especially easy to reverse when creating a child or
recording discovery. The current CLI help is authoritative for syntax; this page
preserves relationship meaning, not every command form. Agent-authored graph
writes require an explicit executor actor. A ready result is only a scheduling
view: it does not override assignment, task scope, or authorization. The
installed CLI describes hard blockers as affecting readiness; inspect the graph
after a meaningful edit rather than inferring it from the prose alone.
