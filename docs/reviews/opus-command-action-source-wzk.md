# Opus command-action implementation review — original REVISE

Baseline: `de2443c2624950dfdda7fdcf98f71d2bad1d3ad3`. Reviewer: actual Claude Opus 5.5, medium requested; session `8571889e-f5be-4cbe-9a69-7ce2c72ab257`. Parent verified completed/no-error/no-permission-denial result and frozen candidate identities. Review inspection is separate from parent-run 205 tests and the five bounded real-model samples. No publication or runtime authority is conferred.

Reviewed tracked-plus-new diff SHA-256: `0ea3ba41e4492fbbe29bc261778656d27ded1785b0af1f1f905c762e7ead339a`. The report below is retained verbatim; its documentation findings were subsequently corrected and independently rechecked.

---

**Verdict for this candidate: REVISE, for documentation honesty only.** The candidate is the uncommitted `fix/command-action-wzk` branch on baseline `de2443c`: the 19-path manifest, `candidate.diff`, and installed archive `bbf30225…`. Source, guidance, tests, the spec delta and the evaluation evidence all meet the accepted plan and Matt's intent. Two committed docs state an acceptance status that the rest of the candidate contradicts. Neither fix needs a source change, test change or re-evaluation. My earlier plan verdicts stand: the first review was REVISE with F1–F3, and the recheck was READY.

## Spec/Behavior

**Material findings**

1. **The evaluation report opens with an outdated status** (`docs/command-action-evaluation.md`, diff lines 487–490, 497, 570–574). Its first lines still say "Semantic acceptance remains **unverified**… No… R2–R5 sample followed" and "OpenSpec acceptance markers remain unchecked." The corrected R1–R5 results only appear after line 589.
   - **Consequence:** anyone reading this committed doc from the top gets the wrong current status. That conflicts with `tasks.md` (all `[x]`) and with `parent-acceptance.json`, which accepts R1–R5.
   - **Smallest fix:** add a 2–3 line current-status header. It should say:
     - the first R1 was invalid, caused by a harness false positive;
     - the one corrected R1–R5 run gave valid single samples;
     - parent accepted the evidence, and release is not authorized.
   - Retitle the original section "Superseded first attempt: invalid harness rejection." `report-original.md` already keeps the byte-for-byte copy, so the committed doc doesn't need to lead with outdated status.
2. **`tasks.md` contradicts itself** (diff line 877). The prose says "all acceptance markers remain unchecked until parent verification", but every box is `[x]`.
   - **Fix:** reword it to say parent checked the markers after independent verification.

**Checked and correct**
- **Rendering:** `src/workflows.ts` puts `Invoked command` and `Requested outcome` first. `Literal user details` appears only when text is present, so bare invocations no longer end in an empty `User request:` label. There is no parser or executor. The `diagnostics` command is unchanged.
- **F1 authority wording:** the sync, delete, import, restore, rename-prefix and compact purpose strings and `guidance.ts:37` are reconciled. Restore `--apply`, compact `--auto`/`--dolt` plus the explicit `--actor`, the concrete rename prefix, and parent acceptance are all kept. No admin action is quietly broadened.
- **F2 `--no-adopt`:** it is unconditional in the sync purpose, in CLI_REFERENCE's Synchronization section, in SKILL.md and in the spec delta. A missing remote is a blocker.
- **Resources:** all seven remaps match the plan. CLI_REFERENCE gets concise sections. WORKTREES is now a secondary link and no longer contradicts the sync guidance. The other mappings are unchanged, with 30 names and 17 links.
- **Spec delta:** the three MODIFIED requirements carry their full original scenarios plus additive ones, consistent with canonical compact/restore.
- **README and CHANGELOG:** both clearly separate unreleased source behavior from the published beta.2 archive.
- **Evidence:**
  - `R1-bd-calls.json` shows exactly one `sync --no-adopt --actor=… --sandbox --json` call, exit 0, `pulled`/`pushed`, after help was inspected as a preparation step.
  - R2 explained and stated that no sync was attempted.
  - R3 asked for the missing issue and fields, with no writes.
  - The invalid first R1 is labeled honestly and is not counted as either a pass or a product failure.

## Standards/Proportionality
- No machinery was added. The tests check the changed contracts: every stem renders correctly whether details are empty, help text, or hostile-looking text; resources are pinned; and the installed package callbacks check bare and explain sync. The tests explicitly say fixtures don't prove model behavior. Changing the purpose check from `toBe` to `toContain` is acceptable because the full purpose is asserted through `startsWith`.
- Adding `tests/guidance.test.ts`, outside the planned test paths, is justified by the `guidance.ts` change.

## Optional observations (not blocking)
- **Model resolved a precedence question:** in R1, `bd prime` said "local-only/no-remote… no push, pull, or remote sync". That was detected from the missing Git remote, even though the context showed a configured Dolt remote. The model chose to sync anyway. Treating the explicit invocation as taking priority matches AGENTS.md, but this was the model's judgment on a single sample, not something the guidance spells out. A deliberate project-level no-sync policy still depends on the model honoring it.
- **Actor wording:** the spec delta (line 827) says "actor identity… remain controlling". On the direct-shell path, actor attribution is guidance; only typed tools derive it deterministically. Consider adding "(host-enforced where applicable)".
- **Ambiguous sentence:** in SKILL.md (diff line 72), "a concrete migration needs the intended prefix" doesn't name rename-prefix and sits next to compact text.
- **Long descriptions:** purposes double as command descriptions, and the sync description is now about 480 characters in the picker.
- **R4 scope:** R4 tested capability that was absent from the tool inventory, not a deny issued mid-flow. Existing deterministic tests cover typed denials.
- **Scratch paths:** the evaluation doc points to scratch paths that won't last.

## What I inspected vs. what parent ran
- **Inspected (read-only):**
  - `candidate.diff` in full, including the new docs and OpenSpec files
  - `manifest.json`
  - baseline `src/workflows.ts`, `guidance.ts`, SKILL.md and the canonical spec
  - `R1-bd-calls.json`, the R2 and R3 responses, and `parent-acceptance.json`
- **Not verified by me:** hashes, the 205 tests, typecheck, package smoke, OpenSpec validation, whitespace checks, and the R4/R5/cleanup raw files.

READY after these two doc fixes would cover this candidate only. It is not new host/model qualification, a reliability claim, or approval to commit, publish, activate or close.