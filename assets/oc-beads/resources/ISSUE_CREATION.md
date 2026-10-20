# Creating useful issues

> Adapted from [Beads marketplace-main `ISSUE_CREATION.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/ISSUE_CREATION.md).

Create a durable issue when work needs its own assignment, dependencies,
multi-session history, or acceptance record, and only when the existing authority
allows creation. Do not create one for every retry, note, or discovered idea.
Discovery may be reported without being worked; a `discovered-from` edge does
not authorize the new issue.

## Write for the next executor

- **Title:** a specific outcome or problem.
- **Description:** why the work exists, relevant context, and boundaries.
- **Design:** the intended approach and important constraints.
- **Acceptance:** observable conditions that define completion.
- **Notes:** current progress and later checkpoints, appended as work proceeds.

Do not treat a proposed approach as an acceptance test. Avoid secrets, copied
logs, vague “investigate” titles without a question, and unsupported promises.
Leave new work unassigned unless an assignment is intentional. If a human owns
the work, assign that person deliberately; an agent actor is not proof of
permission.

Keep design and acceptance distinct: design records a candidate approach and
trade-offs that may change; acceptance states a testable outcome that remains
true if the implementation changes. For example, “reuse the current parser if
it handles quoted fields” is design; “quoted commas and quotes round-trip in the
export” is acceptance. Put the former in `--design` and the latter in
`--acceptance`.

Current syntax comes from `bd create --help`. A write must use the actual
executor actor, for example:

```sh
bd create "Clarify retry behavior" --type=task --priority=2 \
  --description="Record the user-visible issue and affected path." \
  --design="Trace the current behavior and document the supported correction." \
  --acceptance="The behavior and validation evidence are recorded." \
  --actor='<executor-actor>' --sandbox --json
```

Before creating linked work, inspect the parent and verify dependency direction.
Keep planning and implementation ownership distinct when the project assigns
them to different people.
