# Epic map cross-check — opencode-beads-vuy

Planning baseline: `84ab18e76be43f9a733bd799c5a506fed03ce7f6`. Actual model verified: `claude-opus-5-5`; medium effort explicitly requested. Review is read-only and covers the created records before publication, not runtime qualification.

**READY.** I found no material mapping defects and no corrections are needed.

## Verdict on each check

- **13 tasks, each owned exactly once.** The `metadata.task_ids` in the parent readback matches the execution map and `task_owners`: .1→1.2, .2→1.1, .3→2.1, .4→3.1/3.2, .5→2.2/3.3, .6→4.1/4.2, .7→5.1, .8→6.1, .9→6.2/6.3. That's 13 IDs with no duplicates or gaps.
- **17 requirements covered.** The `requirement_coverage` in the check results matches the reconciliation table at `reconciliation.md:39-55` row by row, with the same task IDs. The owners follow correctly from the task owners.
- **Dependency order and cycles.** The `blocks` edges in the readback are exactly .2→.1; .4→.1; .5→.1/.3/.4; .6→.3/.4/.5; .8→.5/.7; .9→.2/.5/.6/.8. These match the map. There's also .8→.6 as `related` (readback line 1011), not a blocking edge. The graph orders cleanly as {.1,.3,.7} → {.2,.4} → .5 → {.6,.8} → .9, so there are no cycles. Every prerequisite in tasks.md is satisfied directly or through another child.
- **The live 2.0.32 host prerequisite blocks only live work.** .3, .7 and .1 have no edges at all. .4 and .5 have no edge to .2. Their phase boundaries say they deliver source and fixtures only, and that the 1.1 activation step and the 6.2 end-to-end acceptance remain open. Nothing claims a closed source child means the feature is live.
- **The .6 partial phase is explicit in the records themselves, not just the map:**
  - .6 description, design, acceptance and metadata all say: "owns ALL of 4.2 and stays open until live checks pass", in the order 4.1, then the 4.2 fixtures, then the 4.2 live checks after 1.1.
  - The `deterministic_handoff` metadata records `state: not_started`, `live_prerequisite: opencode-beads-vuy.2` and `completion_requires_live: true`.
  - The .6 notes require the tested source revision, the fixture commands and results, and an explicit list of pending live checks. The parent verifies these before dispatching .8. Relevant source edits invalidate the evidence.
- **.8 waits on the .6 evidence without waiting for .6 to close.** Its description and acceptance say to consume the passing 4.2 fixture evidence and "Do NOT wait for that child to close or for 1.1/4.2 live checks." It also says to record the tested revision and invalidate the evidence if relevant source changes.
- **.9 has real blocking edges** on .2, .5, .6 and .8. Because .6 only closes after its live checks, .9 correctly waits for all of 4.2.
- **Nothing is marked done early or dispatched automatically.** All 10 records are `blocked`, have `implementation_authorized=false` and carry the `execution-not-authorized` label. The only `assignee` in the readback belongs to d9n (`Snarkimedes`), which is the planning record, not one of the new ones. Every description says "dependency-ready never means authorized". The handoff state is not_started with no evidence, and all 13 OpenSpec task checkboxes are still unchecked.
- **Splitting into nine children is reasonable.** The groupings (continuity, package, flow, acceptance) follow the order the tasks have to run in. I see no harmful fragmentation.

## Minor nits (none block)

1. **The handoff state is stored twice.** The `deterministic_handoff` JSON is copied into both the .6 and .8 metadata, so the two copies could drift apart. Treat .6 as the single source of truth and have .8 point to it, or at least update both together.
2. **Graph readiness for .8 doesn't reflect the .6 gate.** Once .5 and .7 close, .8 will look ready even if the .6 evidence hasn't been verified. The blocked status and the notes cover this, but the parent shouldn't move .8 to open just because the graph says it's ready.
3. **One redundant edge.** .9→.5 is already implied through .6 and .8. It's harmless and makes the 2.2 activation dependency explicit.

## Evidence limitations

- I read the parent readback for .6, .8 and .9 in full. For the other children I only scanned status, `implementation_authorized`, task IDs and dependencies. I relied on the results file for their phase boundaries.
- I didn't check that every child's `requirement_contributions` matches the coverage table, apart from .6, .8 and .9.
- I didn't open the records snapshot separately from the readback.
- The lint and validation passes are the reported results in the check file; I didn't rerun them.
- No runtime or behaviour qualification is being claimed.

I made no writes, ran no `bd` commands and launched no agents. You asked for findings in this response only, so I didn't create a plan file or call ExitPlanMode.
