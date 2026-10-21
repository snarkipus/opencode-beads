# Independent 2.1.1 rebaseline review

Candidate: `510c3320fd357d5530373f2aefcfaa213d1a26df`. Actual model verified from result: `claude-opus-5-5`; medium effort explicitly requested. First attempt failed before inference on OAuth refresh contention; bounded retry completed with no permission denials. This review does not grant implementation authority.

# Review: OpenCode 2.1.1 rebaseline, candidate `510c332`

## Verdict: **READY**

I found no blocking findings. The delta is bounded and backed by source. It fits the existing 13 tasks and 9 children without new services, tasks or graph changes. The tracker records agree with the spec. No runtime acceptance is claimed anywhere.

## Blocking findings

None.

## Nonblocking observations (wording or record-hygiene fixes the parent can make at publication)

1. **The new experimental `todowrite` tool is not dispositioned.** The changed sources include it: `packages/core/src/plugin/internal.ts` (+`TodoTool.Plugin`), `config/normalize.ts`, `schema/src/config/experimental.ts` (`todo`, default false), and changelog lines 10/94. The memo does not mention it. This doesn't change any decision, because the existing disposition already covers TodoWrite advice ("reconcile TodoWrite advice with current prime", `docs/claude-code-integration-inventory.json:1483`). Smallest fix: one memo row saying it is opt-in, host-owned, and does not change the 2.1 guidance reconciliation.

2. **The `session.compacted` row overstates what the evidence shows.** `session.compacted` appears zero times in both the 2.0.32 and the 2.1.1 `session-event.ts`. It only shows up in the 2.0.32 V1 web plugin docs (`released/packages/web/.../plugins.mdx`), and `session-legacy.ts` does not map it. So "retire" is correct, and `src/host.ts:127` already uses `session.compaction.ended`. But the cited legacy decoder doesn't show a 2.1 removal. The real 2.1 lifecycle change is that `compaction.started` no longer carries `recent` (`session-legacy.ts:27`, `compaction.ts` publish). Fix: reword the row.

3. **Some task cross-references in the memo are slightly off.**
   - Row 1 cites 1.2/3.2/**6.1**, but the 6.1 text is unchanged. This is harmless, since 6.1 runs the suites.
   - Row 2 calls 6.2 "fixtures", but 6.2 is the live evaluation.
   - The transport row cites 6.2, but the 6.2 text doesn't mention transport.
   - The skills row cites 3.3, which is unchanged (reload is covered there already).

   Fix: wording only.

4. **"Unpublished" labels are now stale.** `execution-map.md:1`, the reconciliation 2026-10-20 section, and the record descriptions ("unpublished… No invented publication SHA") all say the delta is unpublished. But `metadata.planning_commit` already says `510c332`. I checked the manifest `/opt/data/cache/scratch/baseline211-planning-manifest.json`: its root is `72906511…`, its file set exactly equals `git diff --name-only 907232a 510c332`, and all 15 blob hashes match `510c332`. So the content identity is sound and only the labels lag. Separately, the epic notes cite a "content digest `d71f1642…`" that I couldn't reproduce from the manifest. Fix: clarify or drop that digest when the labels are refreshed.

5. **One line in `reconciliation.md:61` still reads as operative.** It says "Selected released OpenCode v2.0.32", under a heading that isn't marked historical. The verdict at line 1 and the bottom section do supersede it. Fix: prefix it with "Historical". The phrase "within V2" at `design.md:82` is generic and harmless.

6. **`metadata.recent` is a little subtler than the memo says.** `history.ts:144–182` rebuilds `metadata.recent` *in memory* from the `keepID` range for new summaries too, so readers see `recent` in both shapes. The 3.2 fixture should assert that this text is never persisted or flattened back. That fits the existing no-write rule; no task change is needed.

7. **One evidence gap on skills.** The contents of `FSUtil.ignoreGlobs` and `ignoredDirectories` aren't in the 63-file cache (`packages/util` wasn't fetched). The claim "adds ignore globs" is bounded, and explicit package registration avoids the scan path (`skill-scan.ts` filters children, not the root). Task 2.2's installed-base fixture is the right gate. Nothing to change.

8. **`.6` has no hard dependency on `.2`, even though its 4.2 live part needs 1.1.** This predates the rebaseline and is intentional: the phase dependency `4.2-live←1.1` and `metadata.deterministic_handoff.live_prerequisite=opencode-beads-vuy.2` encode it, so `.6` can hand off deterministic evidence first. Not a new issue.

## Source claims I checked against the pinned source

- **Replay renames:** `state`/`providerState`/`providerResultState`/`resultState` became `native`.
  - Tool `state: ToolState` and the `ToolState*` metadata are kept (`session-message.ts` AssistantTool; `session-legacy.ts:54` "A tool part's own `state` is its lifecycle status").
  - `SessionCompactionResult.native` matches (`plugin/src/promise/session.ts:38–44`).
- **`native.messages` replaces the summary:** it is replayed only on the same provider and model, and a mismatched or malformed window is skipped and the original transcript is used (`history.ts:27–45,135–139`; `to-llm-message.ts:294`). A malformed window "from a compaction hook" is skipped, which supports never populating it.
- **Tool replay rules** match `to-llm-message.ts:154–212`:
  - call metadata needs the same model (plus no error, or executed and settled);
  - hosted (provider-run) results need the same provider;
  - local results need the same model and no error.
- **Compaction and forks:**
  - `keepID` is written in `compaction.ts` (`metadata: { keepID, ...result.metadata }`).
  - Forks remap `keepID` (`projector.ts` fork copy).
  - `RESERVE_SHARE 0.15` / `RESERVE_MIN 16_000` match.
  - Summary preparation now sees the whole conversation (`prepare(context, context.messages…)`).
- **Permissions:**
  - Undefined metadata values are filtered (`permission.ts:198`).
  - The code-mode inventory is cached by registry and visible names while executors stay fresh (`tool.ts:236–255`).
  - `PermissionSaved.update` is added (`saved.ts`).
- **`session.list`:**
  - Plugin host and adapter only add forwarding (`plugin/host.ts:549`, `promise/adapter.ts:596`).
  - Child removal uses `store.list`, not the public paginated list (`session.ts:383`).
  - `inbox.ts` and `bus.ts` changes are decode-only (legacy upgrade).
- **Counts:** the inventory shows 63 sources (31 unchanged / 29 modified / 3 added) and 14 declarations, with only the two `session.d.ts` files modified. Both match the memo.

## Contract-delta completeness: **adequate**

- All the requested surfaces are covered: replay names, `native`, replacement replay, provider/model fallback, `keepID`/`recent`/forks, lifecycle, reference-only compaction (no writes, no recursive waits, no injected result or window), permissions, identity, deny/save/external access, grant edits/revocation, skills/reload, cancellation and late children.
- The claims that declarations and implementation are unchanged are bounded to the endpoint files and are correct where I sampled.
- Released `session.list` is reclassified but not adopted.
- Admission `>=2.1.1 <2.2` is kept separate from exact unexecuted 2.1.1 qualification. Operator 2.0.29 stays untouched, and there's no blanket V2 promise.
- Settled product choices are not reopened.
- The only omission is the experimental `todowrite` tool (observation 1).

## Tracker-map verdict: **consistent**

Checked against the fresh readback `opencode-beads-211-opus-readback.json`:

- **Ownership:** 13 unique task IDs, exactly equal to `tasks.md`. 17/17 requirement titles match the spec headings.
- **Graph:** 14 `blocks` edges, acyclic, identical to the worker snapshot and to `check-results.hard_dependencies`. `.8→.6` is `related` only.
- **Authority:** all ten records are `blocked`, have no assignee, and have `implementation_authorized=false`.
- **Gating:**
  - `.6` owns 4.2, with `completion_requires_live: true`.
  - `.8` requires parent-verified handoff evidence.
  - `.9` is blocked by `.2`, `.5`, `.6` and `.8`.
- **Stale baseline:** none. Each record has one historical "supersedes the former 2.0.32 baseline" mention, and zero operative `>=2.0.32 <3`.
- **Embedded links:** the only pinned planning links point to `84ab18e`, and they are explicitly labelled historical.

## Checks

**Executed by me (all passed):**
- `openspec validate improve-beads-workflow-parity --strict --no-interactive` — valid.
- `openspec validate --all --strict --no-interactive` — 1 passed, 0 failed.
- `python3 docs/validate-parity-planning.py /opt/data/cache/scratch/parity-sources` — 7 PASS lines, including the 2.1.1 blob, tarball and declaration integrity.
- `git diff --check` on the worktree and on `907232a..510c332` — clean.
- Read-only git diffs and source greps.
- The read-only Python record, manifest and graph checks above.
- Protected setup: the hashes of `AGENTS.md` and `.codex/*` match `check-results`, and they are unchanged in the commit range.

**Reported only, not re-run by me:**
- `bd lint` scoped lint.
- The live GitHub tag/tree API and npm registry retrieval (the validator re-verifies only the cached copies).
- The worker's "notes preserved / only eleven records updated" claim.

**Not executed:** no `bd` commands, typecheck, package tests or installs, host runs, or model runs. No runtime or model evidence exists for 2.1.1. Live gates 1.1, 4.2 and 6.2 remain wholly unexecuted, and they need separately authorized disposable host and model access.
