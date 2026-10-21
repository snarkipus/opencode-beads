# Beta preparation — opencode-beads-jrm

## Parent-reviewed candidate

- Package: `@snarkipus/opencode-beads@1.1.0-beta.1`.
- Intended npm dist-tag: **next**. Registry **latest remains 1.0.2**; no publication or tag mutation has occurred.
- Exact prepared archive: `/opt/data/cache/scratch/oc-beads-beta-preparation/archive/snarkipus-opencode-beads-1.1.0-beta.1.tgz`.
- SHA-256: `c78a1bb98e0703172205c4f46bc9e5ea26bf50eb1daf2280ff5ad09e169cceea`.
- Baseline: merged implementation `450176905e46ac96f0f2aab23c9b1cc5281cd62b`.
- Sole implementation executor: `codex:oc-beta`, Sol/high, session `01a16067-fbf7-75f1-a047-7513ae39d5b6`.

The normal public plugin entrypoint now enables the already-qualified registration. Opt-in means selecting this beta artifact; no external wrapper, dependency injection or additional activation setting is required. Existing version admission, host interface checks, per-operation permissions, identity, guards, cancellation and outcomes remain intact. No argv/normalizer/runner changes were made.

Release preparation supports stable/latest and beta/next explicitly. GitHub prerelease metadata must agree with the package version; conflicting or missing CLI metadata fails before an archive or publication. The protected release workflow verifies the one prepared archive and passes an explicit dist-tag to npm. Existing OIDC, attestation and immutable archive handling are retained.

## Verification

Parent independently ran **196 tests, zero failures**, typecheck, package smoke and exact-archive verification with `--tag v1.1.0-beta.1 --dist-tag next --prerelease true`. Packed-package tests exercise the ordinary public setup, eleven native code-mode definitions, 30 commands, 17 resource links and owned disposal. Channel tests cover stable/beta and mismatched metadata; the implementation worker retained RED/GREEN evidence under the scratch root.

A short actual OpenCode **2.1.1** native run loaded the ordinary unchanged archive through package configuration, without wrapper or internal qualification injection. Native search observed all eleven `tools.beads.*` signatures; actual native execute returned an acknowledged structured get for the disposable `BETA_PUBLIC_ENTRY_READ_PROOF` issue. Controlled provider responses drive these entrypoint mechanics; prior genuine model semantics remain the accepted implementation evidence, not a repeated model campaign. Parent inspected the native messages and independently compared all **31 archive files** to installed and current source bytes.

All **145 protected repository paths** remained unchanged. Parent independently confirmed owned listener absence. Operator executable/config/auth remained unchanged; the controlled fixture used no genuine provider account. Initial scratch harness attempts and their logs are retained separately; only the final `native4` observations are passing evidence. No registry or operator mutation is implied by local archive preparation.

## Publication boundary

This report is preparation evidence, not proof of a public release. Source/CI review precedes tag/GitHub prerelease/npm publication. The implementation worker did not commit, push, tag, publish or close the release task. Parent owns source integration; owner approval gates actual publication. After publication, verify `next=1.1.0-beta.1`, `latest=1.0.2`, registry/release archive digests and exact clean-consumer installation before closing the release task.

Proposed owner installation after publication:

```json
{
  "plugins": ["@snarkipus/opencode-beads@1.1.0-beta.1"]
}
```

`@next` follows the beta channel; the exact version is preferable for evaluation reproducibility. OpenCode `>=2.1.1 <2.2` and Beads `>=1.3.1` remain prerequisites. No operator runtime upgrade or installation is performed automatically.
