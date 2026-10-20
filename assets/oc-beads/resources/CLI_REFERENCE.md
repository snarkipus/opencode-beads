# CLI reference

> Adapted from [Beads marketplace-main `CLI_REFERENCE.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/CLI_REFERENCE.md).

This resource deliberately does not copy the full command catalog. The installed
`bd` binary and active repository policy determine current syntax.

- Use `bd prime` for current agent workflow context, only when authorized and
  not blocked by a context or migration hold.
- Use `bd <command> --help` for a command's current flags and behavior.
- Use `bd --help` to discover commands available in the installed binary.
- Use `--json` when structured output is useful and supported by that command.
- Supply `--actor=<executor>` on every agent-authored write, claim, and
  heartbeat. Do not rely on `git user.name`, `$USER`, or an inherited global
  actor.

If a command or flag in an old example is absent from current help, do not guess
its spelling or use a hidden interface. State the limitation and use a supported
equivalent only when it preserves the requested outcome and authority. A static
resource cannot prove installed host behavior or package delivery.
