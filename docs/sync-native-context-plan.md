# Sync native context design

This source change implements only `/oc-beads:sync` from the parent-accepted
plan in `opencode-beads-ueb` and READY review `opencode-beads-ag4`, under current
implementation authority `opencode-beads-9ux`. Baseline:
`76549cff2558404f8b855b8708d13ac81c52f138` (published beta.3).
The completed change is [compact-sync-command-context](../openspec/changes/archive/2026-10-22-compact-sync-command-context/proposal.md).

This is the historical sync-only design, including the earlier visible details heading. The final natural presentation and all-workflow generalization are described in [workflow native context evaluation](workflow-native-context-evaluation.md) and the archived design.

One ordinary native prompt carries `/oc-beads:sync`, followed by an exact
`Literal user details` block when nonempty. Native files, agents, skills,
prompt preparation and queue/steer delivery stay with that admission. A
version-1 `ocBeadsSync` metadata record stores the unchanged static action,
authority and installed-resource instructions, excluding literal details and
runtime actor/capabilities. This metadata is durable and exportable, not secret.

The existing primary and compaction hooks restore the snapshot into a user
text part on a transient message copy and remove only their routing key from
that copy. They run after unload protection and before context eligibility or
location returns. Foreign content/metadata, roles and IDs survive; absent or
unknown markers and unmarked beta.3 history remain untouched. The current
executor actor, capabilities, permissions and holds still come from existing
request handling. Repeated application to the request copy is idempotent;
serialized replay uses the stored record without a process-local queue.

Native-window compaction retains lowered metadata, so the next primary hook
expands retained messages once. Summary recent-context is rebuilt from visible
stored text and stays compact. One sentence in existing compaction guidance asks
for an active sync's outcome and applicable authority limits; summary retention
is semantic, without a verbatim guarantee or replay repair. The plugin must
be active to restore compact history. Title/generate have no expansion hook.

Native admission, scheduling, interruption, cancellation, revert and resume
remain host-owned. An ambiguous failure propagates without retry. Each callback
submits one prompt; externally repeated callbacks have no new exactly-once
promise. No auxiliary model call, synthetic pair or historical operation is
re-admitted. Bare sync and explicit explanation retain beta.3 semantics:
permissioned `bd sync --no-adopt`, existing configuration, actual actor and
applicable sandbox; no inferred adoption, provisioning or manual repair loop.

The other 29 command descriptions/submissions are checked against one small
generated SHA-256 fixture from baseline source using fixed inputs and resource
paths. Hashes keep the regression fixture small without a handwritten corpus.
Provider tests additionally pin the original static sync instructions, capture
real Responses serialization through a loopback endpoint, compare one and three
sync messages with an interleaved assistant and serialized native replay, and
assert stable expansion, current instructions, one snapshot and absent routing
metadata. These are deterministic serializer tests, not genuine model behavior.
See [evaluation](sync-native-context-evaluation.md) for results and the separate
bounded runtime sample.

Instructions are relocated, not claimed cheaper. Each historical sync still
carries its own static snapshot as beta.3 already did. The extra visible command
line and text-part framing add small provider bytes. Native compaction may store
another snapshot copy; native estimation from visible text can underestimate
instructions. These are disclosed storage/estimation limitations, not reasons
for an upstream workaround. No billing or cache-hit benefit is inferred.
