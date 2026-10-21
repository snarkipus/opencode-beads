# Beads in native code mode

Use the actual request capability block. When the beads namespace is registered
and execute is visible, use native `search({namespace: "beads"})` to discover
current signatures. Catalog discovery and each operation's permissions determine
what is callable; execute visibility alone does not establish leaf availability.
Do not copy a signature catalog from prose or invent tools. If execute is denied,
code-mode-only Beads operations disappear. Permissioned direct shell is a fallback
only when available, authorized and no guard hold applies. Native shell is
**direct-only**: never call `tools.shell` inside execute. Repository editing,
tests and Git run in separate direct shell turns.

## Read, choose, then act

Start with bounded discovery and inspect scope and `complete`. `true` refers to
that query, `false` means truncated or partial, and `null` means completeness is
unknown. Ready, list, search and blocked have different supported filters;
unsupported combinations are rejected. Blocked and edge reads can return unknown
completeness. Unknown or failed edges never prove that work is unblocked.

Get chosen IDs together (at most 25); the adapter performs sequential single-ID
reads. Inspect per-ID failures and `complete`; an all-failed get is failed, not
missing. There is no snapshot-consistency or transaction promise. For independent
reads, use small bounded fan-out (for example at most eight candidates with
`Promise.allSettled`), retain rejected/failed outcomes as unknowns, and return a
projection of relevant fields. Return memory keys first, then recall selected
keys. A found empty memory differs from a missing key; memories retains a
key-to-value map, including a successful empty map.

Selecting a candidate does not authorize claiming it. Read scope, prior attempts,
acceptance and dependencies before acting. Await an authorized claim and stop
dependent work unless it acknowledges the actual executor as assignee in
`in_progress`. A claim never hides a second readback prompt; use get explicitly
when needed. `not-claimed` requires evidenced non-claim, and `uncertain` requires
current-state inspection before considering another write.

## Ordered writes and honest outcomes

Await dependent writes in order; inspect each result before the next call. Do not
parallelize claim, note, update, close or dependent creates. Each invocation has
its own canonical permission resources and `save: []`: an "always" response may
apply to that call only, so ask may prompt again. Saved shell grants remain
subject to denies. Orchestrator authority does not bypass host permission prompts.
Do not catch a rejected operation and continue its dependent writes. Plain
permission decline on OpenCode 2.1.1 may still permit later independently
permissioned work or model steps; it does not promise whole-program termination.
Explicit Stop/Cancel is distinct and its installed qualification remains separate.

Use note for append checkpoints. Selected-field update excludes ownership changes
and closure. Close needs caller-authorized acceptance evidence; it is never an
automatic workflow step. Create generates an ID and does not automatically assign
an executor. An uncertain create retains its identifying query/title: search and
read back before considering a manual retry, to avoid duplicates.

Every typed write returns the host-derived actor. Use that same rendered actor
for direct shell writes, claims and heartbeats with command-scoped `--actor` or
`BEADS_ACTOR`, and `--sandbox` to suppress automatic Dolt push. No global actor
configuration, model-controlled actor argument or human Git fallback. A child
uses its own actual session/agent actor and claims only authorized work; parent
review does not transfer assignment. Audit author (`created_by`), account owner
(`owner`) and executor (`assignee`) are separate observations; missing fields
remain unknown. Attribution is not permission or authentication.

Only authoritative CLI evidence acknowledges a write. Started interrupted,
timed-out or malformed writes may have landed: retain target, actor and original
diagnostic, then inspect durable state under fresh authorization. Do not blindly
retry, force, commit or synchronize. A landed but uncommitted memory retains
`commit_error`/`commit_indeterminate`; it is not committed durability. Fulfilled
Promises, outer execute completion and compaction summaries do not establish
successful persistence. Write inputs remain in host trace metadata.

Full prime remains the canonical workflow reference. Meaningful checkpoints
carry attempts, measured outcomes, rationale, blockers and next action. Important
recovery, external changes and child returns require fresh relevant state;
acknowledged writes do not require a generic redundant read of their own result.
Preserve distinct repository/user authority, guard holds and exact scope. Missing
capability or failed context is reported honestly, without manual-prime bypass,
implicit sync, automatic retries or a replacement workflow manager.
