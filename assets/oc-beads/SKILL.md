---
name: oc-beads
description: >
  Use Beads when work needs durable tracking across sessions, has dependencies or
  blockers, needs a meaningful progress checkpoint, or must be resumed with its
  prior attempts and decisions. Also use when searching or updating reusable
  project knowledge. Follow the current project's instructions and the installed
  bd CLI for supported operations.
---

# Beads work in OpenCode

> Adapted from [Beads marketplace-main `SKILL.md` at commit `4a67d0d0288c1b4ee23e17fc896f47616931ba2d`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/SKILL.md).

Beads is the external issue and execution record. The installed `bd` CLI owns its
commands and data. Repository and user instructions set the authority for each
operation. The project's specification system (for example OpenSpec, when used)
records intended behavior; project documents retain detailed rationale and
evidence; Beads records execution, assignment, and acceptance.

Use the current Beads context when the host provides it. If it is absent, retrieve
current workflow context through the permissioned CLI only when that operation is
authorized and no hold is active. Distinguish context that is missing, failed to
load, or deliberately withheld. A migration or permission hold is a stop signal;
do not bypass it by manually running `bd prime`. If execute is unavailable, use direct shell only when separately available and
authorized. Native shell is direct-only and cannot be called inside execute. Do
not assume an unstated tool name, approval, or setup step.

When typed composition is available, discover current signatures through native
`search({namespace: "beads"})`; each leaf retains its own permission checks.
Follow [code-mode composition](resources/CODE_MODE.md) for bounded reads,
projection, ordered writes, completeness, uncertainty and decline/Stop semantics.

## Work within the assigned scope

- Read the relevant issue and its dependencies before changing tracked state.
- An assignment to one specific item is an exact assignment: finish that item,
  report the outcome, and stop. Continue across a batch only when the user or
  repository instructions explicitly authorize that batch or goal. Discovering
  more work can justify reporting or recording a finding when authorized; it
  does not expand the work you may perform.
- For an authorized tracked task, claim atomically with the actual executor
  actor. Keep that actor on every agent-authored Beads write and heartbeat:

  ```sh
  bd update '<id>' --claim --actor='<executor-actor>' --sandbox --json
  bd heartbeat '<id>' --actor='<executor-actor>' --sandbox --json
  ```

  Use the host-rendered actor derived from your actual request session and agent,
  matching typed write results. If unavailable, refuse writes until the host
  supplies it; never copy a sample or impersonate another executor. Use a
  readable, unambiguous identity, not the human Git identity or a model name.
  Give delegated instructions the delegate's real actor and have the
  executing worker claim its own authorized work. A deliberate handoff changes
  ownership; parent review does not.
- Read back `created_by` (audit author), `owner` (record/account ownership), and
  `assignee` (executor) separately. Leave new work unassigned unless assignment
  is intentional. Preserve historical authorship; document provenance
  corrections in notes instead of rewriting it.
- Direct work is suitable for small, clear tasks. Delegate when separate work
  benefits from another executor or independent review, and state the scope,
  evidence expected, actor, and stop condition. There is no required
  command-count threshold or one-issue-per-invocation loop.

## Keep useful progress

At a meaningful change in direction, record what was attempted, what happened,
why the next step follows, any blocker, and the concrete next action. Append to
the issue's notes so useful earlier learning remains available:

```sh
bd update '<id>' --append-notes="Tried …; result …; because …; blocker …; next …" --actor='<executor-actor>' --sandbox --json
```

Use `--append-notes` for checkpoints. Replacing notes is a deliberate edit, not
the routine checkpoint path. Keep records concise and evidence-based; do not
store credentials, raw dumps, or guesses as facts. Do not write just to meet a
count or frequency target when nothing material changed. If a write fails or its
result is uncertain, report that state and inspect before retrying.

## Separate task notes from reusable knowledge

Attempts, issue-specific test results, decisions, and the next action belong on
the issue. Use persistent Beads memory only for validated project knowledge that
will likely help beyond this issue. Search for existing knowledge first, then
update it deliberately with scope and evidence; a temporary failure usually
belongs in the task record rather than global memory. Recall before updating an
existing stable key: writing the same key replaces its content in place.

```sh
bd memories '<keyword>'
bd recall '<known-key>'
bd remember "Validated learning, where it applies, and supporting evidence" --key='<stable-key>' --actor='<executor-actor>' --sandbox
```

Do not dump all memories into every handoff or delete old knowledge as routine
cleanup. Use the current CLI help for exact memory options.

Do not initialize or reroute a store, synchronize it, change permissions, or enable automation as a side effect.
Those separate administrative operations require explicit authorization.
Examples assume a project policy prohibiting automatic remote updates and include
`--sandbox`; it only suppresses Dolt auto-push and provides no migration safety.

## Validation, handoff, and stopping

Before marking work complete, compare the result with its acceptance criteria and
run the relevant authorized validation. Keep failed or unrun checks explicit.
Close an issue only when closure is within your authority and its own acceptance
is met. If a parent, owner, or human controls acceptance, return evidence and
leave that decision to them. A discovered issue does not become authorized work
just because it is linked.

For a handoff, provide the current state, material attempts and outcomes,
rationale, validation evidence, blockers, next action, and useful issue or memory
references. Preserve enough context to continue without replaying a failed
approach. Stop when the exact assignment is done, authority is absent, a hold is
active, or a required guarantee cannot be established.

## Supporting guidance

These resources are separate so advanced or reference material can be opened
only when relevant. Every selected support file is linked explicitly because a
host may display only a limited automatic file list.

### Daily work

- [Boundaries: durable tracking and short-lived work](resources/BOUNDARIES.md)
- [Current CLI reference sources](resources/CLI_REFERENCE.md)
- [Dependency direction and provenance](resources/DEPENDENCIES.md)
- [Issue creation and useful fields](resources/ISSUE_CREATION.md)
- [Common execution patterns](resources/PATTERNS.md)
- [Resumability and recovery notes](resources/RESUMABILITY.md)
- [Meaningful workflows and checkpoints](resources/WORKFLOWS.md)
- [OpenCode and Beads integration patterns](resources/INTEGRATION_PATTERNS.md)
- [Current troubleshooting and stop conditions](resources/TROUBLESHOOTING.md)

### Advanced, on demand

- [Agent beads, executor identity, and unsupported slot APIs](resources/AGENTS.md)
- [Asynchronous gates](resources/ASYNC_GATES.md)
- [Molecule and wisp patterns](resources/CHEMISTRY_PATTERNS.md)
- [Molecule and formula reference](resources/MOLECULES.md)
- [Static reference data](resources/STATIC_DATA.md)
- [Worktree routing](resources/WORKTREES.md)

### Rationale

- [ADR-0001: keep exact CLI syntax dynamic](adr/0001-bd-prime-as-source-of-truth.md)
