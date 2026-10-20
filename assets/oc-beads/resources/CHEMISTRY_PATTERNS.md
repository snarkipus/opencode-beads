# Molecule and wisp patterns

> Adapted from [Beads marketplace-main `CHEMISTRY_PATTERNS.md`](https://github.com/gastownhall/beads/blob/4a67d0d0288c1b4ee23e17fc896f47616931ba2d/plugins/beads/skills/beads/resources/CHEMISTRY_PATTERNS.md).

Molecules and wisps are advanced ways to organize repeated or temporary work.
They are optional. A normal issue and its dependencies are usually enough for
one task. Do not introduce a molecule workflow simply because it is available.

## Choose by phase and lifetime

| Need | Record | Lifetime |
| --- | --- | --- |
| One-off owned work with no reusable workflow | Normal issue and dependencies | Durable issue history. |
| Repeated multi-step work whose children and audit trail should persist | Formula/proto instantiated as a persistent molecule | Reusable source, then durable execution records. |
| Authorized short-lived research, review, triage, or operations with low audit value | Wisp from an existing formula/proto | Ephemeral; useful findings must be promoted before cleanup. |

Treat formulas/protos as reusable workflow sources, molecules as instantiated
work, and wisps as the temporary phase. Do not use a wisp when the full trail
must persist or assume that a formula will stay inside the exact assignment.

Before using a formula, inspect the available formula and its steps. Decide what
evidence should survive and who owns each child. Do not let a template silently
expand an exact assignment into unrelated work.

An approved one-time review can use an existing review formula: capture evidence
and uncertainty in its wisp, promote validated actionable findings to a durable
record, then discard only noise with no future value. A bounded research spike
can preserve sources, rejected hypotheses, and a conclusion the same way. These
are optional work patterns, not authority to create a formula, spawn workers, or
start a background patrol.

## Preserve useful results

At the end of a wisp, retain validated findings, rejected hypotheses, sources,
and resulting authorized work in the appropriate durable record. Discard only
noise that has no future value. A digest should not turn unverified notes into
facts. `bd mol squash` creates a durable digest; `bd mol burn` deletes a wisp
without a digest. Use either only when that lifecycle is authorized and current
help confirms the operation.

Use `bd mol --help`, `bd formula --help`, and relevant subcommand help for exact
syntax. Creating a proto, molecule, wisp, or child issue is a Beads write and
requires the actual executor actor. These features do not start workers, set
permissions, or enable background automation by themselves.
