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
`handoff`. Without `--cases`, all six run. Replay requires a saved diagnostics
snapshot from registration. When no earlier selected case captured it, replay
runs registration itself.

`--timeout` sets the default polling window (60 seconds, accepted range 1–120).
Each poll checks the deadline between attempts. A request already in progress can
outlast that window. HTTP calls use an eight-second socket timeout, which can
apply to individual operations during a response. Startup readiness and plugin
registration each use their own 15-second polling window.

A failure stops further cases. The first SIGINT or SIGTERM stops dispatch and
allows cleanup and evidence writing to finish. Exit codes are **0** for selected
cases passed, **1** for failure or interruption, and **2** for a blocked run
without failures. The printed scratch directory contains `results.json`, API
captures, fixture readbacks, and any cleanup receipts. The receipts record the
listener and the original owned server process group separately. A JSON
`null` records an inconclusive observation. A process group can close while a
listener on the port remains reachable. Cleanup signals only the original
owned group, including surviving members after its leader exits. Retain the
scratch directory as review evidence.

The [compatibility evidence](compatibility-evidence.md) links to the recorded
six-case runs and their limits.
