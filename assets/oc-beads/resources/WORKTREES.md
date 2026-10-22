# Worktree routing

> Adapted from [Beads marketplace-main `WORKTREES.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/WORKTREES.md).

A worktree can isolate code changes while retaining a repository's shared Beads
database. The installed CLI documents common-directory discovery for its
worktree command. Do not assume that every unrelated checkout, redirected
workspace, or custom route shares the same store.

Use a worktree only when isolation helps and its creation is authorized. Before
changing issues, confirm which repository and Beads location the CLI resolved.
Keep the assignment and explicit executor actor the same across the worktree;
Git identity is not a Beads actor. Do not initialize a separate store, change
routes, or copy database state to make a task appear ready.

Use `bd worktree --help` and relevant subcommand help for current commands and
safety checks. Inspect local changes before removal, preserve work that is not
yours, and remove only a worktree whose cleanup is authorized. This resource
does not create or clean up a worktree automatically.

`oc-beads:sync` requests supported Dolt-remote synchronization, distinct from
`bd federation sync` and removed JSONL sync. Follow the focused
[synchronization procedure](CLI_REFERENCE.md#synchronization) for --no-adopt,
existing configuration, actor, permissions and honest outcomes. This resource is
secondary worktree context; the installed Beads CLI owns synchronization and
consistency semantics.
