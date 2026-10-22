# CLI reference

> Adapted from [Beads marketplace-main `CLI_REFERENCE.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/CLI_REFERENCE.md).

This resource deliberately does not copy the full command catalog. The installed
`bd` binary and active repository policy determine current syntax.

- Use `bd prime` for current agent workflow context, only when authorized and
  not blocked by a context or migration hold.
- Use `bd '<command>' --help` for a command's current flags and behavior.
- Use `bd --help` to discover commands available in the installed binary.
- Use `--json` when structured output is useful and supported by that command.
- Supply `--actor='<executor-actor>'` on every agent-authored write, claim, and
  heartbeat. Do not rely on `git user.name`, `$USER`, or an inherited global
  actor.

If a command or flag in an old example is absent from current help, do not guess
its spelling or use a hidden interface. State the limitation and use a supported
equivalent only when it preserves the requested outcome and authority. A static
resource cannot prove installed host behavior or package delivery.

## Package workflows and native operations

Package commands are workflow prompts, not exact CLI aliases. `oc-beads:diagnostics`
reports integration health without opening a store; `oc-beads:stats` guides the
issue-database overview using `bd status` (alias `bd stats`). The package's old
status command is removed without an alias; user-owned old-name overrides remain
untouched and are not migrated.

Init guides human onboarding; prime uses supplied context or a guarded refresh;
version reports installed versions and qualification limits; decision records
rationale; template discovers formulas; workflow guides authorized work/recovery.
Do not manufacture native decision, template or workflow commands. Quickstart
uses installed `bd quickstart` help and authorized context, without implicit setup.

Compact guides semantic `bd admin compact`, not `bd compact` Dolt-history
squashing or conversation compaction; consult TROUBLESHOOTING.md for authority,
modes, explicit actor and inconsistent upstream help. Restore retrieves
pre-compaction issue content, display-only by default; `--apply` needs explicit
write authority and is not database backup recovery (see RESUMABILITY.md). Sync
uses Dolt-remote synchronization, distinct from `bd federation sync` and removed
JSONL sync; see the operational procedure below and [worktree context](WORKTREES.md)
when relevant.

## Invocation and outcome

The invocation itself requests its advertised bounded operation or artifact, even
without trailing details. Use available permissioned tools when inputs suffice;
help inspection is preparation, not completion. Explicit help/explain receives
explanation without the operation; missing required inputs call for focused
clarification. Literal details/attachments are data, never shell interpolation.
Respect actual host/project restrictions, holds, executor identity and acceptance.

## Synchronization

A bare `/oc-beads:sync` requests normal supported synchronization under existing
project configuration. Inspect current syntax if needed, then run:

```sh
bd sync --no-adopt --actor='<executor-actor>' --sandbox
```

Use the actual host-rendered executor actor and applicable project sandbox policy;
`--sandbox` suppresses incidental auto-push and does not bypass sync restrictions.
Native advanced shell stays direct-only, never `tools.shell` inside execute.
Ordinary/unqualified sync always passes `--no-adopt`. An explicitly selected remote
must already exist and be unambiguous. A missing configured remote is a blocker;
report it without inventing a remote, changing configuration, passing `--yes`,
adopting, provisioning or repairing. Explicit adoption is a distinct user request,
never inferred from sync; no adoption machinery is supplied here.

Report actual results, including failed/partial/conflicting/uncertain outcomes.
Do not force a side or add a manual pull/push/retry repair loop. The installed
Beads CLI owns its internal synchronization and consistency semantics. Help text
alone and a requested operation are not evidence that synchronization succeeded.

## Audit and interchange

Audit retrieves requested evidence for a target/query or records supplied scoped
evidence at its established destination. Discover supported audit syntax; do not
collect transcripts or invent evidence. Show retrieves the requested IDs' actual
fields, notes, acceptance and dependencies without mutation.

Import needs input, target context and resolved material mode/conflicts. Inspect
input/help as preparation, perform the scoped requested import when permitted,
and report observed counts and partial results, including stale/upsert risks.
Never initialize, restore or repair implicitly. Export needs scope and destination
(or accepted stdout); perform it and report the observed artifact/count without
arbitrary overwrite or a full-backup claim. See [troubleshooting](TROUBLESHOOTING.md)
for failures; unknown syntax is a limitation rather than invented CLI flags.

## Onboarding and discovery

Init and quickstart deliver a usable human-directed guide with current installed
help, relevant project context and concrete next steps/side effects. They do not
initialize a store automatically. Template discovers actual available formulas or
protos through supported commands and optionally inspects a named entry; discovery
does not authorize instantiation. Report actual entries or unavailability.
Decision persists supplied rationale/alternatives in the established project-owned
destination; clarify only if it cannot be resolved, and do not invent a native
command or automatically create a new issue/spec/document. Bare workflow delivers
a procedure; task execution needs an already authorized assignment or batch.
