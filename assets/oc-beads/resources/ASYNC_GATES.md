# Asynchronous gates

> Adapted from [Beads marketplace-main `ASYNC_GATES.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/ASYNC_GATES.md).

An async gate models a wait condition that blocks a later step. It does not do
the work, grant permission, or make a human decision. Use one only when an
authorized workflow needs a durable wait relationship; ordinary blockers can
remain issue dependencies.

## Gate kinds

The pinned guidance distinguishes a human decision from a condition that can
be checked:

| Kind | Successful condition | Failure or timeout behavior |
| --- | --- | --- |
| `human` | Explicit human decision, recorded by manual resolution. | A `--timeout` can be stored as metadata but is not enforced by `bd gate check`; silence is not consent. |
| `timer` | The timeout has elapsed when an authorized executor runs `bd gate check --type=timer --actor='<executor-actor>' --sandbox --json`. | Otherwise it remains pending. |
| `gh:run` | Run is completed with success (the pinned guidance also treats skipped as resolved). | Completed failure or cancellation escalates; the gate remains open for a decision. |
| `gh:pr` | Pull request is merged. | Closed without merge escalates; the gate remains open for a decision. |
| `bead` | The referenced issue is closed, when supported by the installed create path. | An open target remains pending. |

The installed `bd gate check --help` confirms timer evaluation and GitHub
success/failure conditions. The pinned source says a human gate's stored timeout
is not enforced by `check`. The installed `bd gate create --help` lists human,
timer, `gh:run`, and `gh:pr`; it does not list `bead` as a create type. Check
current help before relying on a gate type; this guidance does not qualify host
behavior.

## Inspect and resolve deliberately

Use `bd gate --help` and `bd gate '<subcommand>' --help` for current syntax. The
installed help supports this deliberate human-decision flow:

```sh
# An authorized executor creates the wait condition.
bd gate create --type=human --blocks='<issue-id>' \
  --reason="Needs owner review" --actor='<executor-actor>' --sandbox --json
bd gate list --json
bd gate show '<gate-id>'

# The actual human runs this command only after making the decision.
bd gate resolve '<gate-id>' --reason="Reviewed; decision recorded" \
  --actor='<actual-human-actor>' --sandbox --json
```

Read both the gate and blocked issue before changing either. An agent must never
supply a human actor or resolve a human gate on the human's behalf. Never infer
consent from silence. A failed CI run or unmerged closed pull request is a failure
to investigate, not a successful gate. If an authorized executor runs a check, keep its actor explicit and
inspect the resulting state before continuing.

Do not create gates automatically for every handoff, approval, test, or issue.
Do not add polling, watchers, or approval automation as a side effect of reading
this resource. Gates and issue dependencies are distinct: use a gate for a
documented async condition, and an issue dependency for work ordering.

## Stop conditions

Stop if the gate cannot be read, its referenced event cannot be verified, a
human decision is required, or the current CLI lacks the required gate action.
Report the gate ID, observed state, evidence, and the decision needed. Never
route around a permission denial by calling a different interface.
