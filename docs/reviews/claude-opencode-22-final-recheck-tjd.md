# F1 recheck: final SOURCE+QUALIFICATION gate (`opencode-beads-tjd`, session `71dc3fce-9fb7-40a3-a7eb-c833ba95d080`)

I read `f1-correction.patch`, grepped the current docs, and looked at the parent's test log. I ran nothing and wrote nothing.

## Verdicts

- **Standards: READY.** The correction only touches docs and one test. It adds no runtime change, no packed-file change and no new mechanism.
- **Spec (corrected final gate): READY.** F1 is resolved, and the correction introduced no material regression.

## F1: resolved

- **SDK contract:** `docs/opencode-sdk-contract.md:5` and `:169` now say exact OpenCode 2.2.6 qualification is parent-accepted for the full archive SHA-256 `072d9c29…ac836`. Both link to `opencode-22-qualification-5rj2.md` and say `opencode-beads-o66` is still unresolved. A grep of `docs/` finds no remaining "has not been qualified" sentence. The wording doesn't overclaim: it doesn't call the candidate released, and the published beta.5 range and "not a release or operator activation" are still stated in the same paragraph.
- **Tests:** in `tests/docs.test.ts`, the old assertion is replaced by checks for the accepted-status phrase, the digest and the link. A new negative check makes sure the obsolete wording can't come back. The README table assertion at `:215` is deliberately left as it was, which is correct because the README is packed and frozen.
- **Summary:** the new "Frozen README status" bullet at `docs/opencode-22-qualification-5rj2.md:37`:
  - names `README.md:24` and `:202` exactly;
  - says this summary supersedes them for that exact digest;
  - assigns updating both README statements and their compatibility-row test to the separately authorized 2.0.0 metadata change;
  - forbids changing or silently repackaging the qualified archive.

  That covers the task 2.3 duty to reconcile docs while leaving the remaining gap explicit. Nothing else in the summary changed.

## Regression check

- **Packed files and archive:** the three changed files are all outside the package. `package.json` `files` covers only `src`, `assets/oc-beads`, `README.md` and `LICENSE`. So the 31-file archive identity is unaffected, which matches the parent's byte-identity and SHA check.
- **Tests:** `f1-green-tests.log:245-248` shows 218 pass, 0 fail, 11,888 `expect()` calls, across 12 files. The parent's red log shows the updated assertion first failing at `docs.test.ts:212`, as expected.
- **Wording:** the new text doesn't contradict the README's o66 limitation, the published beta.5 range or the 2.0.0 release recommendation.

## Optional (nonblocking)

- The assertion count went up by 5, while the patch's net change is +3 explicit `expect` lines. This most likely comes from shared helpers or iterated checks. It doesn't affect the verdict.
- The earlier optional observations still stand and are still nonblocking.

READY here closes the final review of this exact runtime and qualification candidate, so parent can now accept task 2.3. It does not approve publication, release, version or metadata changes, canonical sync or archive, CI, or operator activation, and it does not resolve `o66`.
