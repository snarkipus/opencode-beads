# ADR-0001: Keep exact CLI syntax dynamic

## Status

Accepted for this guidance corpus.

## Context

The upstream Beads skill and its resources have useful decision guidance, but
they are not a generated reference for every installed `bd` release. Copying
flags and command forms throughout prose lets examples age independently of the
CLI. A successful `bd prime` or command exit is also not proof that a particular
record was found, a memory was returned, or a write was acknowledged.

## Decision

- Keep cognitive and workflow guidance in `SKILL.md` and its on-demand resources.
- Use `bd prime` for current workflow context and `bd '<command>' --help` for
  exact syntax. Do not duplicate a broad CLI reference here.
- Respect an explicit context, permission, or migration hold. A manual prime is
  not a fallback around a hold.
- Keep examples limited to supported CLI forms verified against the installed
  help. When an operation is unavailable, say what supported path or limitation
  applies instead of inventing a flag or tool.
- Treat host registration, package inclusion, installed resource access, and
  behavioral qualification as separate evidence. The presence of these source
  assets does not establish those outcomes.

## Consequences

This keeps the startup guidance short and moves depth to linked resources. CLI
help can still be incomplete or ambiguous, so examples and compatibility claims
need review against their relevant Beads release. No claim that drift is
impossible is made. Advanced features remain opt-in and do not enable automation,
store initialization, synchronization, or permission changes by themselves.

## Source attribution

Adapted from [Beads marketplace-main ADR-0001 at commit
`4a67d0d0288c1b4ee23e17fc896f47616931ba2d`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/adr/0001-bd-prime-as-source-of-truth.md).
