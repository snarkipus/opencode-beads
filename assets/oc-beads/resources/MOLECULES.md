# Molecules, formulas, and wisps

> Adapted from [Beads marketplace-main `MOLECULES.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/MOLECULES.md).

The current CLI describes formulas as workflow sources, protos as reusable
templates, molecules as instantiated work, and wisps as ephemeral workflows.
Use these only when their lifecycle solves a real project need; a normal issue
graph is clearer for one-off work.

## Decide before instantiating

| Question | Choose |
| --- | --- |
| Is this one-off work with a clear owner and no template need? | A normal issue graph. |
| Must each step and its audit history remain durable? | Persistent molecule with durable audit history from an inspected formula/proto. |
| Is the work short-lived and low-audit, with an agreed way to preserve findings? | Wisp, only with explicit lifecycle authority. |
| Is the workflow repeatable and already validated? | Consider distilling a formula after preserving its evidence and lessons. |

Inspect the formula's gates, dependencies, variables, and children before
creating work. Confirm that every step fits the authorized scope. Keep generated
children aligned with the intended parent acceptance; closed children do not
prove the parent outcome.

## Example: approved review wisp

When a bounded review is authorized as temporary and an existing review proto
fits the scope, create the wisp, inspect its instantiated steps, and retain only
validated findings:

```sh
bd mol wisp create '<review-proto-id>' --var 'candidate=<revision>' \
  --actor='<executor-actor>' --sandbox --json
bd mol show '<wisp-id>'
```

If the review produced reusable evidence or actionable findings, summarize and
promote the result to a durable digest:

```sh
bd mol squash '<wisp-id>' \
  --summary="Candidate <revision>: verified findings and evidence references" \
  --actor='<executor-actor>' --sandbox --json
```

If the wisp contains only noise with no future value, burn it only when that
deletion is explicitly authorized; this leaves no digest:

```sh
bd mol burn '<wisp-id>' --actor='<executor-actor>' --sandbox --json
```

These verbs and phase effects are confirmed by installed subcommand help. A
wisp is ephemeral and not synced via Git; do not use it as the only home for
required acceptance evidence. A digest is a summary, not proof that findings
were independently validated or that a parent issue is accepted.

Distilling a formula is useful only after a workflow has proved repeatable.
Retain validation and lessons in the reusable template, not accidental details
from one run. Bonding workflows can create large graphs; inspect the result and
ownership before proceeding. Do not pour, bond, squash, burn, or distill as
automatic setup or background orchestration.

Use `bd formula --help` and `bd mol --help`, then each relevant subcommand's
help, for current syntax. These are state changes; keep the actual executor
actor explicit.
