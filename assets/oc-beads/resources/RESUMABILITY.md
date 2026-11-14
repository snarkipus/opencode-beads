# Resumability and recovery

> Adapted from Beads [`RESUMABILITY.md`](https://github.com/gastownhall/beads/blob/5ac194105c138ca799bc2f6534c8f92712d8d782/plugins/beads/skills/beads/resources/RESUMABILITY.md) at `5ac194105c138ca799bc2f6534c8f92712d8d782`; see [third-party notices](../THIRD_PARTY_NOTICES.md).

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
different outcomes. An explicit authority or permission hold is not an invitation to run a
manual fallback. If a write timed out, read the issue before retrying; the first
write may have landed. Preserve uncertainty explicitly until it is resolved.

Use the current CLI syntax from `bd prime` and command help when authorized.

## Restore pre-compaction issue content

`oc-beads:restore` guides `bd restore` retrieval of pre-compaction issue content,
display-only by default. `--apply` requires explicit authority to write that
content back to the issue. This is not database backup recovery, Git history
restoration or general store repair. Inspect installed help and report missing
content or uncertainty honestly; conflicting compact/restore help does not
establish guaranteed recovery or reversibility.


### Verbatim upstream excerpt: RESUMABILITY, When Resumability Matters

## When Resumability Matters

**Use enhanced documentation for:**
- Multi-session technical features with API integration
- Complex algorithms requiring code examples
- Features with specific output format requirements
- Work with "occult" APIs (undocumented capabilities)

**Skip for:**
- Simple bug fixes with clear scope
- Well-understood patterns (CRUD operations, etc.)
- Single-session tasks
- Work with obvious acceptance criteria

**The test:** Would a fresh Claude instance (or you after 2 weeks) struggle to resume this work from the description alone? If yes, add implementation details.

**OpenCode adaptation:** Follow the existing assignment and permissions; quoted commands are historical illustrations, not copyable local commands. Use the actor-scoped examples above.


### Verbatim upstream excerpt: RESUMABILITY, Anti-Patterns

## Anti-Patterns

### ❌ Over-Documenting Simple Work
```markdown
Title: Fix typo in README
Notes: IMPLEMENTATION GUIDE
WORKING CODE: Open README.md, change "teh" to "the"...
```
**Problem:** Wastes tokens on obvious work.

### ❌ Design Details in Acceptance Criteria
```markdown
Acceptance:
- [ ] Use batchUpdate approach
- [ ] Call API with fields parameter
- [ ] Format as markdown with ## headers
```
**Problem:** Locks implementation. Should be in Design/Notes, not Acceptance.

### ❌ Raw JSON Dumps
```markdown
API RESPONSE:
{giant unformatted JSON blob spanning 100 lines}
```
**Problem:** Hard to read. Extract relevant parts, show structure.

### ✅ Right Balance
```markdown
API RESPONSE SAMPLE:
Returns dict with 49 entries. Example entries:
- 'text/markdown': ['application/vnd.google-apps.document']
- 'text/plain': ['application/vnd.google-apps.document']
- 'application/pdf': ['application/vnd.google-apps.document']
```

**OpenCode adaptation:** Follow the existing assignment and permissions; quoted commands are historical illustrations, not copyable local commands. Use the actor-scoped examples above.

## Append or replace

Use `--append-notes` for incremental checkpoints. At a deliberate current-state handoff, replace working notes with `--notes`, carrying forward relevant decisions, rejected approaches and reasons, blockers, and the next action. Keep verified results distinct from hypotheses.

```sh
bd update '<id>' --append-notes="Result and evidence; next action" --actor='<executor-actor>' --sandbox --json
bd update '<id>' --notes="Current state; decisions; blockers; next action" --actor='<executor-actor>' --sandbox --json
```

The typed `note` operation is append-only. When only typed operations are available, append a labelled current-state handoff and report the typed-only limitation; do not claim replacement occurred. Use the direct shell route only when available and permissioned.
