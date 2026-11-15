# Integrated diagnostics acceptance — 2026-11-15

## Accepted source

The integrated diagnostics candidate adds separate Plugin / Beads observations,
compact normal output, bounded details and static help. New captures contain a
finished code-populated report with DATE, executing package VERSION and observed
native repository-root PATH under the title, plus explicit newline-separated
report/invocation boundaries. Existing saved snapshots are not retrofitted.

Implementation tasks 1–6 in `add-integrated-beads-diagnostics` are accepted.
The native Beads 1.3.1 / 1.3.4 qualification from the initial implementation is
reused; presentation-only follow-ons did not add native probes or change the
ordinary full prime/memory lifecycle. The collector-only no-store boundary does
not extend to that subsequent lifecycle.

## Independent review and execution

Claude Opus 5.5 / medium reviewed the initial integration and subsequent
presentation candidates. Final c4a delta review session
`9f78d4c8-614c-4ed2-8c80-b1ea176dd26d` returned **READY**, zero Standards and
zero Spec blockers. It inspected source/tests/spec evidence without rerunning
tests. Its nonblocking free-text observation is clarified in the diagnostics
reference: appended prose selects normal output, not an additional answer.
No speculative empty-root hardening was added.

Parent independently reran **256 tests / 12,787 assertions**, typecheck, strict
active/all-canonical specification validation, whitespace and exact-archive
package smoke. Every packed member matched the reviewed source. The no-network
regression uses the installed OpenCode 2.3.0 Chat serializer on actual expanded
command messages, not a duplicate concatenation mock.

## Owner-reported canary

Archive: `opencode-beads-template-canary-89f1cd57a447.tgz`.
SHA-256: `89f1cd57a4479573205625771d5ab1b45dd0a28d29fd3835f1e96acba03c3a22`.
Its internal version remains 2.2.1; the checksum identifies the candidate.

The owner supplied normal displayed reports from Zeus/snark-surface at
`2026-11-15T01:01:34.240Z` and VPS/docker-lab at
`2026-11-15T01:01:45.904Z`. Both show the intended header order, repository roots,
no appended invocation and no leaked report markers. Zeus reports healthy;
VPS retains its expected hook mismatch and action. Neutral first-capture context
and absent shared skills were not treated as integration failures.

This is owner-reported normal-output evidence, not independent raw provider/TUI
inspection. Help/details have automated coverage but were not supplied in this
visual pass. The original affected turn's precise cause remains unlocalized;
fixing the demonstrated request-boundary ambiguity does not prove that cause or
guarantee byte-exact model output.

## Custody and publication boundary

Detailed immutable reports, manifests, RED/GREEN and parent logs are retained at
`/opt/data/research/beads-health-design/diagnostic-report-template/`, with the
preceding integration/native receipts under `/opt/data/research/beads-health-design/`.
This record supports source/task/spec closeout. Registry release, version bump
and operator-host activation remain separate from source integration.
