# Troubleshooting and stop conditions

> Curated replacement for [Beads marketplace-main `TROUBLESHOOTING.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/TROUBLESHOOTING.md). Legacy repair examples are not carried forward where they imply setup, server changes, or automatic repair.

## Context is absent, failed, or withheld

First identify which state actually occurred. If no context was provided, retrieve
current CLI context only when permitted and no hold is active. If retrieval
failed, report the error and preserve the task's last known state. If a migration
or permission guard withheld context, stop; do not run `bd prime`, a different
CLI surface, or another agent as a bypass.

## A command or flag is unknown

Use `bd --help` and `bd <command> --help` to inspect the installed CLI. Do not
guess a flag from an old example, invoke a similarly named command, or assume an
MCP interface. If a workflow depends on an unavailable command, explain the
limitation and use a documented replacement only when it preserves the needed
semantics. The specialized `bd agent` and `bd slot` commands are absent from the
inspected CLI; see [AGENTS.md](AGENTS.md).

## Store, migration, or routing problem

If the CLI reports no store, an outdated schema, an unexpected location, or a
redirect, do not initialize, migrate, reroute, repair, or synchronize it
automatically. Preserve the diagnostic and ask the authorized owner to choose a
supported recovery. The plugin's context guard is not permission to bypass the
same restriction through a shell command.

## Permission denial or external access prompt

Respect the decision. Do not switch to another tool, path, or identity to obtain
the same denied result. If a referenced guidance file is unreachable, state that
and continue only if the remaining task can be done safely and accurately.

## Empty result, failed read, or uncertain write

An empty successful query differs from an error. Report the actual result, not
the exit code alone. After a timeout or interrupted write, inspect the issue or
memory before retrying; the write may have landed. Do not blindly repeat a
create, claim, remember, or close operation.

## Lost claim or blocked task

Read the current assignee, status, and lease before continuing. If another actor
owns it or the claim was reclaimed, stop writes and coordinate a deliberate
handoff. Never force-reassign yourself or fall back to the human Git identity.
Record unresolved acceptance, missing evidence, and the next authorized action
in the handoff.
