# Dependencies

Model ordering and discovery relationships in Beads so `bd ready` reflects genuinely unblocked work. Use `bd dep --help` for current dependency commands and types; do not infer direction from prose alone.

When implementation reveals separate follow-up, create it with a `discovered-from` relationship to the issue that exposed it. Avoid dependencies between work that can proceed independently.
