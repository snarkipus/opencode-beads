# Repository scripts

Run package commands from the checkout root. These tools are maintained here
alongside the plugin.

## Package archives

- [`packaging/test-package.ts`](packaging/test-package.ts) runs via
  `bun run test:package` in local checks and CI. It packs the checkout or
  accepts `--archive <tgz> --sha256 <digest>` together. In exact-archive mode
  it checks the SHA-256 before installing the supplied archive into a disposable
  consumer with lifecycle scripts disabled. Both modes verify the packed plugin
  and remove their scratch directory. A supplied archive stays in place.
- [`packaging/release.ts`](packaging/release.ts) prepares and verifies the archive
  used by the release workflow. The `prepare` command creates the output
  directory if needed, requires it to be empty, and writes one tarball. It
  appends the archive path, SHA-256 and dist-tag to `GITHUB_OUTPUT` when set.
  The workflow passes that path and SHA-256 to the smoke check before
  attestation and GitHub upload. Immediately before npm publication, `verify`
  rechecks the same archive against the prepared SHA-256 and validates the
  release tag and channel. Use `bun run test:release` for local release fixtures.

## Beads compatibility and source review

- [`bd-contract.ts`](bd-contract.ts) runs via `bun run test:bd-contract` with
  an installed `bd` on PATH. It exercises selected native CLI reads and writes in
  disposable repositories with an isolated home and an explicit test actor.
- [`install-bd.sh`](install-bd.sh) downloads and checksum-verifies a pinned
  Linux amd64 or arm64 Beads release and runs the staged binary to verify the
  exact requested version before writing `bd` into the supplied directory.
  CI uses a disposable destination.
- [`check-beads-integration.ts`](check-beads-integration.ts) compares the
  reviewed source inventory with current upstream source over the GitHub API.
  It emits advisory JSON and can use `GH_TOKEN` or `GITHUB_TOKEN`. [Current collector maintenance](../docs/beads-artifact-policy.md#current-collector-maintenance)

## Native qualification and lint

- [`native-qualification.py`](native-qualification.py) runs an opt-in Linux
  canary with pinned OpenCode and Beads binaries and a verified package.
  It starts a loopback host, writes fixture and evidence files under scratch,
  and can send fixture data to the selected model provider. [Native probe instructions](../docs/native-release-probe.md)
- [`test-native-qualification.py`](test-native-qualification.py) tests the
  probe's output parsers using fixtures. Run it with
  `python3 scripts/test-native-qualification.py`.
- [`oxlint-plugin.mjs`](oxlint-plugin.mjs) supplies the chained-type-assertion
  rule loaded by `bun run lint`.
