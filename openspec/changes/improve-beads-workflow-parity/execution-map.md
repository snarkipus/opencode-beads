# Execution map

Current local unpublished planning over published `072429f1a7723ade23e756a921924d9d0acacf31`, branch `openspec/improve-beads-workflow-parity`. This indexes actual Beads records, not a second tracker. [Tasks](tasks.md), [design](design.md), [owner decisions](owner-decisions.md) and [requirement coverage](reconciliation.md) own the current scope. Historical mapping/review at `84ab18e76be43f9a733bd799c5a506fed03ce7f6` / `dd56cf12a141d224dadb247ebd5f7754bd053ecd` remains evidence for its earlier candidate, not approval of this delta.

## Authority and status

Planning reconciliation worker `codex:oc-plan` claims only `opencode-beads-wgv`; handoff leaves it in_progress with that assignee for parent review. Planning owner `opencode-beads-d9n` remains in_progress assigned to Snarkimedes. Epic `opencode-beads-vuy` remains blocked/unassigned. Existing .2 is blocked/assigned codex:oc-host; .6 blocked/assigned codex:oc-flow; .9 blocked/unassigned. Their execution ownership is not transferred by planning edits. Closed source/review records stay intact. New `opencode-beads-vuy.10` is blocked/unassigned, created_by codex:oc-plan with no stored owner field; author, account owner and assignee are distinct.

All affected implementation records retain implementation_authorized=false. Parent review and a separate exact dispatch are required before source execution or resumed host/model qualification. No acceptance, closure, publication, activation or release follows. Readiness alone is not permission.

## Exclusive task ownership and blocking graph

Each task appears exactly once in the ownership column. Blocking edges run from dependent to prerequisite. Parent-child and discovered-from edges preserve structure/provenance, not dispatch authority.

| Actual child ID | Owned OpenSpec tasks | Deliverable | Blocking prerequisites |
| --- | --- | --- | --- |
| `opencode-beads-vuy.1` | 1.2 | accepted types history | none |
| `opencode-beads-vuy.2` | 1.1 | remaining native inventory/permission qualification | `opencode-beads-vuy.1`, `opencode-beads-wgv`, `opencode-beads-vuy.10` |
| `opencode-beads-vuy.3` | 2.1 | accepted corpus assets history | none |
| `opencode-beads-vuy.4` | 3.1, 3.2 | accepted five-operation/context history | `opencode-beads-vuy.1` |
| `opencode-beads-vuy.5` | 2.2, 3.3 | accepted package/lifecycle history | `opencode-beads-vuy.1`, `opencode-beads-vuy.3`, `opencode-beads-vuy.4` |
| `opencode-beads-vuy.6` | 4.1, 4.2 | accepted 4.1/deterministic history; remaining Stop/handoff | `opencode-beads-vuy.3`, `opencode-beads-vuy.4`, `opencode-beads-vuy.5`, `opencode-beads-vuy.10` |
| `opencode-beads-vuy.7` | 5.1 | accepted drift history | none |
| `opencode-beads-vuy.8` | 6.1 | accepted aggregate historical candidate | `opencode-beads-vuy.5`, `opencode-beads-vuy.7` |
| `opencode-beads-vuy.9` | 6.2, 6.3 | installed/model acceptance and measured closeout | `opencode-beads-vuy.2`, `opencode-beads-vuy.6`, `opencode-beads-vuy.8`, `opencode-beads-vuy.5`, `opencode-beads-vuy.10` |
| `opencode-beads-vuy.10` | 7.1, 7.2, 7.3 | cohesive code-mode source delta | `opencode-beads-wgv` |

Nine original checked identities/status remain accepted; 1.1/4.2/6.2/6.3 stay unchecked and 7.1–7.3 are new unchecked work. Existing open owners are qualification boundaries, so .10 owns the coherent source slice rather than overloading .2, reopening closed .4/.5/.8, creating a second epic or per-tool records. The task total is derived from tasks.md (currently 16), requirement total from specs (currently 19).

## Phases and independent acceptance

.10 begins with supported minimum/current runtime CLI evidence through the existing disposable install/contract scripts under future scoped authority (7.1), then typed API/schema fixtures (7.2), then context/guidance/package integration and changed-source aggregate checks (7.3). No .10 dependency on .2 or .6: source preparation must not wait for activation it enables. .10 does depend on wgv planning review; wgv has no blocking dependency on qualification. The existing .2 → wgv dependency remains, with .2 → .10 added for reviewable new shapes. Planning approval alone is not dispatch.

.6 remains the sole owner of all 4.2. Its historical deterministic contribution at `a5d6b2bea779259ba9aa3175ab86fb2f4f2b862b` remains accepted for that candidate; the new delta is covered by 7.2/7.3 deterministic evidence, which .6 consumes before adding its own Stop/handoff observation; .6 does not duplicate deterministic identity/abort suites. The historical related .8 → .6 evidence link is preserved. Closed .8/6.1 does not accept new source: 7.3 owns changed-source aggregate validation. .6 live subphase additionally waits for successful .2/1.1 and separate disposable-host/model authority; no whole-child .6 → .2 edge serializes its evidence consumption. Explicit Stop/Cancel during multi-write programs and approval waits must prevent later dispatch. The older plain-decline whole-step-termination failure remains failed-but-owner-accepted, never a Stop pass.

.9 waits for .10, .2, .6 and its retained accepted prerequisites. It runs representative design workflows A–D with actual catalog signatures, all 17 installed links, lifecycle, real actor agreement, scope, honest uncertainty and byte/process measurements. 6.3 follows 6.2; no final acceptance from fixtures, synthetic projection ratios, merged code or tool counts. Planning/review acceptance is independent of implementation completion.

## Preserved scope and evidence boundaries

Exact host 2.1.1 source `ba546ec1598a70db2570e9c6258028d955ba8f58`, admission `>=2.1.1 <2.2`; operator 2.0.29 untouched. Beads minimum >=1.3.0 and installed1.3.1 unchanged. The immutable historical/current corpus remains 73/74 members with all dispositions; new CODE_MODE delivery augments it: 16 resources plus ADR, 17 explicit links, all 30 human names and overrides. No inventory history is rewritten.

Native shell is direct-only; execute-denied agents lose typed code-mode exposure. Actual invocation permission identity is separate from the rendered audit actor. Keep guard/hold, location access, after-approval/pre-spawn rechecks, cancellation, sole acknowledgement and upstream CLI ownership. No upstream patch, routing/confinement framework, runtime install, model experiment or new datastore.

## Verification custody

Start custody: `/opt/data/cache/scratch/opencode-codemode-astra-planning/` contains protected-manifest.json, pre-dispatch-status.txt, pre-dispatch.diff and full tracker preimages. Worker readbacks, original task identities and final verification are saved there alongside the final artifact manifest. Original source/review bytes, historical authored notes, closed records and unrelated graph edges remain protected. No new commit SHA is claimed. Parent reviews this local unpublished package, chooses compatibility-visible tool-name/shared-prompt disposition, and separately authorizes the smallest next assignment: .10/7.1 contract discovery before any new argv reliance.
