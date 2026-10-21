# Upstream plugin test gap assessment

## Scope and evidence

Parent source comparison against exact OpenCode 2.1.1 commit `ba546ec1598a70db2570e9c6258028d955ba8f58`, the selected qualification target. This is not an independent Opus verdict or executed acceptance result.

The recursive upstream GitHub tree was complete (`truncated: false`). Twelve selected first-party test files were fetched and their Git blob hashes verified against that tree. The survey covered core plugin command, skill, permission-assert, Promise-tool, supervisor, supervisor-reload, session-compact and module tests; SDK host resolution; core plugin lifecycle and failure isolation; and subagent observer lifetime. Relevant assertions were compared with local workflow, continuity, host and packed-package tests and the current OpenSpec tasks. Upstream tests were inspected, not executed; no installed host or model was exercised.

The preceding Claude Beads comparison found relevant layout/setup and prime tests alongside the CLI rather than a separate test suite in the selected plugin subtree. This follow-up checks OpenCode-owned integration contracts, not test-count parity or a claim of superior thoroughness.

## Case crosswalk

- **Command registration and invocation — locally covered; installed dispatch pending.** Upstream checks effective membership, execution, literal arguments, attachments and queue/steer delivery. Local workflow tests and package smoke exercise the actual registration callbacks and bodies through a fixture host. Those fixtures do not qualify actual installed dispatch.
- **Skills and package entrypoints — locally covered at the package boundary; installed access pending.** Upstream checks effective skill registration and root/server resolution. Local smoke resolves both exports, verifies packaged resource bytes and all 16 supporting links, registers guidance and diagnoses missing resources. Task 6.2 already owns installed discovery and external-directory ask/deny. Generic TUI/RPC and conditional-export resolution belong upstream.
- **Cleanup and interruption — plugin responsibilities covered in fixtures; host behavior pending.** Local tests cover owned disposal, idempotent cleanup, partial-setup cleanup, process/approval cancellation and ignored late results. Upstream exercises host interruption reaching Promise executors. Tasks 1.1/4.2 retain the relevant live signal/permission checks.
- **Permission outcomes — generic propagation covered; concrete host variants pending.** Upstream distinguishes blocked, correction-with-feedback and explicit decline. Local `tests/continuity.test.ts` verifies identical rejection propagation and no rejected target operation. `src/continuity.ts` leaves permission assertions outside the CLI-result catch. No implementation defect was demonstrated; actual host outcome delivery remains qualification work.
- **Compaction — intentionally different API usage.** Upstream plugin compaction tests admit a compaction request. This plugin does not invoke that API; it adds reference-only guidance while preserving host compaction payloads. Keep the existing noninterference fixtures and installed recovery checks rather than porting unused-API tests.
- **Supervisor, module loader and background notification infrastructure — host-owned or outside selected scope.** Do not duplicate reload scheduling, dependency redirection, policy admission, failed-generation isolation or moved background-child notification matrices. The selected task flow uses normal blocking child return; task 4.2 already owns relevant failure/stop/handoff checks.

## Owner-approved refinements

### Permission correction and decline — task 1.1 / opencode-beads-vuy.2

Include correction with feedback and explicit decline alongside the existing allow/ask/deny probe. Verify preservation of the actual host outcome and correction feedback, no rejected target operation, no false success and no automatic retry. Use the existing minimal disposable-host probe, not an adapter replica or a new permission translator.

**Evidence state: unexecuted.** The generic rejection fixture and source inspection are not actual host qualification.

### Installed unload/reactivate — task 6.2 / opencode-beads-vuy.9

Include one actual installed unload/reactivate round trip. Observe owned entry removal and restoration of the expected commands and skill under native user-override precedence; one eligible request must receive one Beads context injection, with no late result injected from pending old-generation work. Registry rebuilds, imports and disposer fixtures are not substitutes for actual host lifecycle evidence. No reload matrix or supervisor rewrite is selected.

**Evidence state: unexecuted.** Existing source/package acceptance is preserved, not retroactively relabeled as live success.

## Authority and disposition

Matt approved incorporating these two cases into existing acceptance. They do not create tasks, change checkmarks or dependencies, reopen accepted source work, block independent task 6.1, or authorize host provisioning, model experiments, activation, dispatch, publication or release. Existing disposable-host and execution authority gates remain in force. Intended behavior lives in the workflow-access delta; exact cases are in tasks 1.1/6.2 and their existing Beads owners.

## Representative pinned sources

- [Core plugin lifecycle, unload and replacement command on reload](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/test/plugin.test.ts)
- [Permission outcomes for Effect and Promise plugins](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/test/plugin/permission-assert.test.ts)
- [Promise-tool interruption and error propagation](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/test/plugin/promise-tool.test.ts)
- [Command registry and invocation contract](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/core/test/plugin/command.test.ts)
- [SDK host entrypoint resolution](https://github.com/anomalyco/opencode/blob/ba546ec1598a70db2570e9c6258028d955ba8f58/packages/plugin/test/host.test.ts)

Detailed retrieval inventories remain supporting scratch evidence under `/opt/data/cache/scratch/opencode-v2-test-gap-assessment/`; the pinned links and this disposition are the repository-owned record.
