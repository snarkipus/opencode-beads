# Resumability and recovery

> Adapted from [Beads marketplace-main `RESUMABILITY.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/RESUMABILITY.md).

A future executor needs the state of the work, not a transcript. At meaningful
transitions preserve:

1. what was attempted and why;
2. the observed result and evidence location;
3. the decision or hypothesis that changed;
4. what remains blocked or uncertain; and
5. one concrete next action within the assigned scope.

Append this checkpoint to the issue so earlier attempts remain visible. Do not
copy full logs, secrets, or unverified conclusions. An abrupt process stop can
prevent a final write, so checkpoint after important results instead of relying
on end-of-session cleanup.

## Example: make a thin checkpoint resumable

### Before checkpoint

```text
Tried the export change; the test still fails.
```

### After checkpoint

```text
Attempted: split export rows on commas.
Observed evidence: tests/export.test.ts, case quoted-comma still fails;
  fixture: tests/fixtures/quoted-comma.csv.
Rationale: commas inside quoted fields are data, so splitting cannot work.
Blocker: confirm whether the existing parser exposes a streaming API.
Next: inspect the parser contract, then add a regression test before changing it.
```

The second checkpoint carries the approach, observed evidence and its location,
the decision it supports, the remaining uncertainty, and one next action. Use a
small handoff shape when the example is too detailed:

### Minimal handoff template

```text
Task and scope:
Attempt and result (evidence/reference):
Decision and rationale:
Blocker or uncertainty:
Next authorized step:
```

Add a tested minimal command or code snippet only when the next executor needs
it to reproduce a hard-to-infer result or response shape. Mark what was actually
run and where. Otherwise link to the relevant test or document and summarize the
result. Do not paste raw logs, giant JSON dumps, credentials, or speculative
snippets; acceptance describes the observable outcome, while notes retain
implementation discoveries and rationale.

## Resume safely

For a cold start or after compaction, recover the assigned work rather than
selecting fresh work from `bd ready`:

```sh
bd list --status=in_progress --assignee='<executor-actor>' --json
bd show '<issue-id>' --long --json
```

Use your actual assignment actor for the assignee filter. If the assignment
already gives an exact issue ID, show that issue directly; an empty list is not
permission to claim another task. Read the latest appended checkpoint and earlier
notes for attempts, evidence, decisions, blockers, and the next authorized step.
Retrieve only relevant reusable memory, then verify current assignment, status,
dependencies, and time-sensitive evidence before acting. The issue notes explain
work on this item; memory carries validated learning beyond it. Neither should
override current user or repository instructions.

Treat missing context, failed retrieval, and deliberately withheld context as
different outcomes. A permission or migration hold is not an invitation to run a
manual fallback. If a write timed out, read the issue before retrying; the first
write may have landed. Preserve uncertainty explicitly until it is resolved.

Use the current CLI syntax from `bd prime` and command help when authorized.
