# Compatibility evidence

This page summarizes native checks supporting the compatibility listed in the
[README](../README.md). Admission and qualification are separate: the ranges in
the README do not mean every patch was tested. Each report identifies the
candidate and exact environment it exercised; these are not new runs against
later refactors.

| Exact OpenCode host | Observed coverage                                                                                              | Original report                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3.0               | Native delegation, report freshness, Stop and Code Mode reads.                                                 | [2.3.0](https://github.com/snarkipus/opencode-beads/blob/592177b194ac8d9d3a1d3c2a0cd2b5cd44d9c67c/docs/opencode-23-qualification-xwq.md) |
| 2.4.1               | Registration, typed read, denial, Stop during approval, saved-workflow replay after reopen, and child handoff. | [2.4.1](https://github.com/snarkipus/opencode-beads/blob/592177b194ac8d9d3a1d3c2a0cd2b5cd44d9c67c/docs/opencode-241-qualification.md)    |
| 2.4.2               | Same six canary cases on exact 2.4.2.                                                                          | [2.4.2](https://github.com/snarkipus/opencode-beads/blob/592177b194ac8d9d3a1d3c2a0cd2b5cd44d9c67c/docs/opencode-242-qualification.md)    |

The 2.3.0 run deferred repeated idle reports with outstanding work. The 2.4.x
canaries used Beads 1.3.4 on Linux and stopped a pending permission request, not an
already-running `bd` process. Reopening a saved session is not compaction or
cross-provider replay. These runs do not establish live database upgrade behavior.

For a new run use the [native release probe](native-release-probe.md). For a
released plugin pin for an older host, see the [user guide](user-guide.md#compatibility).
