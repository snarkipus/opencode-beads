# Opt-in native OpenCode release probe

This is a Linux canary, not daily CI or a substitute for the exact published SDK checks. It requires Python 3.12+, Git, a trusted exact OpenCode executable, a trusted `bd` executable, and a packed candidate. Obtain and verify the host and CLI separately; the probe does not install them. Use a model available to a **new, empty** native profile. The probe never imports credentials. A model or auth blocker is not a pass.

```sh
bun pm pack --destination /absolute/scratch
# Replace these placeholders with the filename printed by the pack command and its checksum.
sha256sum /absolute/scratch/PACKED_FILENAME.tgz
python3 scripts/native-qualification.py \
  --version EXACT_OPENCODE_VERSION --host /absolute/pinned/opencode --bd /absolute/pinned/bd \
  --package /absolute/scratch/PACKED_FILENAME.tgz \
  --package-sha256 REPLACE_WITH_SHA256 --scratch /absolute/scratch \
  --fixture-actor REPLACE_WITH_ACTUAL_EXECUTOR_ACTOR \
  --model PROVIDER/MODEL
```

The supplied scratch directory must exist. Each invocation creates its own workspace,
Beads store, OpenCode profile, database and loopback server; it loads the checked
archive's unpacked directory using normal registration. The probe seeds only its
disposable issue. It sends synthetic prompts and fixture data to the selected model.
It must never be pointed at live work or supplied with an operator profile.

The checks use native registration and diagnostics, tool records, independent CLI
readback, and (on reopen) a separate read-only request observer. Model prose is not
pass evidence. Stop checks the exact in-flight **permission wait**, not a running
`bd`; it tries at most one `once` reply for that same request and fails if the fixture
changes, the tool resumes, a saved approval appears, or the request is still pending.
Process sampling is supporting evidence, not proof that no transient process ran.

Use `--cases registration stop` to run only the follow-up checks.
Other selectable cases are `read`, `deny`, `replay` (reopen, not compaction), and
`handoff`. Without `--cases`, all six run. `--timeout` bounds each model wait
(default 60 seconds; maximum 120). A failure stops further cases, and cleanup
terminates only the server process group started by this invocation.
Exit codes: **0** selected cases passed, **1** failed, **2** blocked.
The printed evidence directory contains `results.json`, API captures, fixture
readbacks, and the owned cleanup receipt. Retain that directory as review evidence;
it is not written into the repository.

The [compatibility evidence](compatibility-evidence.md) links to the recorded
six-case runs and their limits.
