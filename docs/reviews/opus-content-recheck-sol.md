# Content correction recheck

Original candidate: `981bfbecad58347d4af2fb4cf3c8625ddd56774c`; original report published at `dd1edc192dd087ac625c4c16728e0b8860855f2b`. This report covers the uncommitted Sol correction delta over dd1edc1, subsequently published together with this report. Reviewer `claude:oc-content`, existing session `77b30a82-e681-4cf8-a138-95199707f49a`, explicit Opus 5.5 medium. No runtime qualification or implementation beyond content is implied.

# Delta recheck of review opencode-beads-8rl (content corrections on `dd1edc1`): **READY**

**Reviewer:** claude:oc-content

All four original findings (M1–M4) are fixed. The corrections introduced no new material defects. I checked the flags the new examples use against the 1.3.1 source.

| Finding | Status | Evidence |
| --- | --- | --- |
| **M1** Actor examples and shell safety | Resolved | Every `--actor` in the corpus is now the quoted `'<executor-actor>'`. The one exception is the human gate step, which uses `'<actual-human-actor>'`. No `codex:` or `9c2e1` remains. In shell examples every placeholder is quoted (`SKILL.md:41-42,68,87-89`, `MOLECULES.md:31-49`, `WORKFLOWS.md:26`, `DEPENDENCIES.md:41-48`). `SKILL.md:45-48` says to use the actor from your assignment and to ask if none was given. It mentions `opencode:<suffix>` only as an illustration in prose. `ASYNC_GATES.md:42-48` now says the human runs the resolve command and that an agent must never supply a human actor. `SKILL.md:97-98` now explains that the examples include `--sandbox` because of project policy. |
| **M2** Dependency direction and readback | Resolved | `DEPENDENCIES.md:36-51` adds the rule "X needs Y means X depends on Y" and the `bd dep add '<dependent-id>' '<prerequisite-id>'` form. It adds a wrong/right Phase 1/Phase 2 example and readback through `bd blocked` and `bd dep list`. It notes that `dep list` defaults to showing dependencies, which matches `dep.go:254,905` and `ready.go:298`. |
| **M3** Recovery entry point | Resolved | `RESUMABILITY.md:61-76` adds a cold-start/compaction sequence: `bd list --status=in_progress --assignee='<executor-actor>' --json`, then `bd show '<issue-id>' --long --json`. It says to recover assigned work rather than take new work from `bd ready`, and that an empty list does not permit claiming another task. Then read the latest checkpoint and verify state before acting. The flags exist in the source (`list.go:402`, `show.go:300`). `SKILL.md:83-84` also adds the warning that reusing a memory key replaces it in place. |
| **M4** OpenSpec presented as universal | Resolved | `SKILL.md:17-18`, `BOUNDARIES.md:17` and `INTEGRATION_PATTERNS.md:10,37,64` now refer to "the project's specification system (for example OpenSpec, when used)". `INTEGRATION_PATTERNS.md:21-25` labels the planning/review Bead pattern as a project-policy example, not a universal Beads requirement. |

**Regression tests:** The four new tests (`tests/workflows.test.ts:164-208`) check these properties directly: neutral quoted actors, no unquoted angle brackets in shell blocks, the dependency examples, recovery and memory-key wording, and the conditional specification wording. I did not run them.

**No remaining correction is required.** The only thing I'd tidy is cosmetic: `ASYNC_GATES.md:50` is one unwrapped long line.

**Limits:** This was a static, read-only recheck covering M1–M4 only. I didn't run tests or `bd`, and I have no runtime, packaging or model-behavior evidence. CLI checks are against the scratch tree whose CHANGELOG shows 1.3.1, not the installed binary. Tracking, publication and closure stay with the parent.
