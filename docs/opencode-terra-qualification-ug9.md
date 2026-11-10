# Terra task-agent qualification — 2026-11-10

Parent acceptance for `opencode-beads-ug9`, OpenSpec task 2.2. This record supplements the [accepted base integration qualification](opencode-22-qualification-5rj2.md); it does not repeat that campaign.

## Observed result

Actual OpenCode **2.2.6** loaded the exact prepared **2.1.0** package with `terra: true`. Native model discovery exposed enabled Terra with the `medium` variant, and the package registered the inherited default and Terra agents plus all 30 commands.

- Parent `ses_e3a4da974ffeXLLwZBauh2kbmY`: `terra_qualification_parent`, `openai/gpt-6.1-sol` / `high`.
- One native subagent call created child `ses_e3a4d919bffd39dwywJDdOjp9H`: `beads-task-agent-terra`, `openai/gpt-6.1-terra` / `medium`.
- The child loaded the packaged skill, discovered `tools.beads.get`, read disposable issue `t21-bne`, and returned its actual title and `TERRA_UG9_READ_ONLY_OK` acceptance marker.
- The Beads result was acknowledged and complete, with no failures. Both sessions completed successfully; the parent remained on Sol/high after the child returned.
- Native assistant records and provider response IDs establish the actual routes. An observation-only context hook agrees; it is pre-serializer evidence, not a wire capture.
- Independent CLI readback found the entire fixture issue unchanged, including revision and timestamps. The three one-time permission grants covered only delegation, packaged skill access and the exact fixture read. No issue write, claim, synchronization or retry occurred.

The disposable host used a previously user-authenticated native test profile in place, not an operator session. Credentials/databases were not copied, hashed, translated or exported. The owned server and listener were stopped, execution/permission inventories were empty, and transient server secrets/logs were removed. The native test profile remains privately retained in its original custody.

## Artifact and evidence boundary

The native run used archive SHA256 `b1e084f66f129ebbf2d857e2fb6b1179e6a427e50c647a9cf612ebbad9f73b89`; all 31 installed files matched. The parent verifier passed 50 assertions. That immutable archive retains the earlier README table saying “Terra qualification pending”; this dated record supersedes that historical status statement, not its runtime bytes. Subsequent release preparation may refresh the README, but must identify the new archive and verify unchanged executable and packaged-guidance bytes rather than relabeling it as the archive used by this run.

Detailed native sessions, tool results, permissions, before/after issue records, archive inventory, preservation checks and cleanup receipts are retained outside the repository at `/opt/data/research/opencode-beads-terra-qualification/`, indexed by `qualification-report.md` and `analysis.json`.

This is one representative read-only parent-to-Terra sample, not a model reliability benchmark, Luna requalification or a new permission/disposal campaign. Earlier deterministic source checks cover profile combinations and preserved shared mechanisms. The disclosed `opencode-beads-o66` limitation remains unresolved. Packaged-guidance follow-up `opencode-beads-gjk` is separate and nonblocking. No publication, consumer activation, or canonical specification archival is established by this record.
