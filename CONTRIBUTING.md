# Development checks

Use the Bun version pinned in `package.json` and run `bun install --frozen-lockfile`. When intentionally changing dependencies, use `bun install` and commit the resulting `bun.lock`.

- `bun run check` runs correctness lint, the formatting check, and TypeScript. Linux CI runs this; Windows CI separately runs the tests, typecheck, and package smoke.
- `bun run format` formats project-owned TypeScript in `src/`, `tests/`, and `scripts/`. It does not rewrite Markdown, specs, or fixtures.
- `bun test` and `bun run test:package` remain the behavioral and packaging checks.
- `bun run test:coverage` prints Bun's function and line coverage for the test run. Use it to find gaps before a refactor; there is no percentage threshold or CI coverage gate.
- `bun run health` runs the pinned Fallow CLI on demand (first use downloads it). Cognitive complexity is a review lead, not a CI gate or a reason to split every large function.

The baseline follows [OpenCode v2.4.2](https://github.com/anomalyco/opencode/tree/v2.4.2): Oxlint, Prettier, and the same [`@tsconfig/bun` base used by its plugin package](https://github.com/anomalyco/opencode/blob/v2.4.2/packages/plugin/tsconfig.json). We keep semicolons to match this repository, enable correctness lint and unused locals, retain `noUncheckedIndexedAccess`, and typecheck source, tests and scripts. This source-distributed plugin does not need OpenCode's monorepo aliases, DOM libraries, or declaration-emission settings.
