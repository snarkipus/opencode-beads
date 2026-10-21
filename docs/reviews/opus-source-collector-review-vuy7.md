# Opus source collector review

Baseline: `a5d6b2bea779259ba9aa3175ab86fb2f4f2b862b` plus unchanged 10-path candidate.
Reviewer: `claude:oc-source-check`, Claude Opus 5.5, requested effort medium.
Session: `38ee7b26-db63-400c-bf94-d9f3e28119bc`; review record `opencode-beads-t1v`.
Actual modelUsage confirmed; completed, is_error=false, no permission denials.
Parent verified all reviewed path hashes unchanged before acceptance.
Source only; no workflow/CI activation or tagged-CLI qualification.

Review done; writing up the verdict now.

## READY (source only)

I did a read-only review of `scripts/check-beads-integration.ts`, `tests/upstream-review.test.ts`, the upstream-review spec, task 5.1 and the policy appendix (`docs/beads-artifact-policy.md:91-107`). I ran no tests, network calls, edits or agents. The live run evidence is the parent's, not mine.

### Standards findings
No material defects.

- **Complete enumeration and SHA selection:** a tree only counts if its SHA matches the expected one and it reports `truncated === false` (`:65`). Every entry needs a valid path, a 40-hex SHA and a mode/type pair that agree (`:70-79`). The baseline's selected files must match the reviewed inventory exactly, in both count and blob IDs (`:164`). So a partial or empty retrieval can never show up as `unchanged`. If every candidate file disappears, that is reported as deletions (`changed`), not as no change.
- **Root matching:** prefixes end in a slash (`:3`), so `plugins/beads-extra` isn't pulled in. A test covers this (`:93-95`).
- **Renames:** a rename is only reported when the removed file's blob and mode are unique and there is exactly one matching added file (`:98-100`). Anything else stays a delete plus an add. The appendix documents this limit (`:99`).
- **Credentials:** transport errors are swallowed without echoing them (`:138-140`). Error messages carry only the API path and HTTP status. The token never reaches stdout, and the subprocess test checks this (`:226`).
- **Scope:** there's no `.github` wiring, no tag or release queries (test `:147`), no baseline-advance option (`:196`), and no file writes. The script only reads `marketplace_main`.

### Spec findings
No material gaps against the spec or task 5.1.

- **Main changes exit 0 as information:** both `changed` and `unchanged` return exit 0 with `level: info` and `channel: development-source` (`:175-183`). This is checked through the real CLI entrypoint with a stubbed fetch (`:220-226`), not just the pure function: exit 0, empty stderr, and no `::error::` or `::warning::`.
- **Unavailable is distinct:** every failure path returns `kind: unavailable`, exit 2, and no `status` or `changes`. The tests check this (`:163-199`), and the entrypoint returns exit 2 for a truncated tree (`:233-238`).
- **CLI compatibility stays independent:** the collector never queries tags, its report has no `compatible` or `taggedRelease` fields (`:227-228`), and the inventory and `package.json` bytes are unchanged afterwards (`:243-244`). Nothing ties it to a hardcoded release.
- **Output:** includes both commits, per-file links at their exact commits, and a compare link (`:157-173`). Output is sorted, and repeated runs are byte-identical (`:132-133`, `:229`).
- **Explicit baseline advancement:** this only happens through a revised inventory passed in by hand (`:150-161`). There's no automatic path.

### Non-blocking notes (no fix needed)
- The frozen `stableCLIResult` / `stableCLIFailure` objects in the entrypoint test (`:209-239`) prove almost nothing, because nothing could change them. The real independence evidence is the no-tag-query check, the missing report fields and the unchanged files.
- An oddly named path anywhere in the upstream repo (say, one containing a backslash) would make the whole run unavailable. That fails safe, never as a false success, so it isn't material.

### Smallest material correction
None.
