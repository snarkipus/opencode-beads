---
name: code-simplification
description: Simplify working TypeScript for readability without changing behavior. Use for an explicitly requested cleanup of a diff, module, or named source scope.
---

# Code simplification

Make working code easier to understand and change. Fewer lines or a better complexity score are not success criteria. Leaving understandable code alone is a valid result.

1. **Bind the scope.** Read `AGENTS.md`, the relevant canonical OpenSpec requirements, and the assigned scope. Default to the changed code. For a whole-source request, inspect all of `src/` but edit only clearly worthwhile areas, in coherent batches. Keep refactors separate from bug fixes, features, tooling, and formatting churn.
2. **Understand the code before moving it.** Trace callers, dependencies, side effects, ordering, errors, and the tests that define the contract. Consult history when a non-obvious check or boundary has no clear explanation. If you cannot establish why it is safe to change, leave it and report what is unknown.
3. **Prefer explicit, familiar code.** Use guard clauses to reduce nesting, descriptive names for important decisions, and existing utilities for genuine duplication. Keep useful boundaries and comments that explain why. Remove a wrapper or abstraction only when that makes its callers clearer and changes no observable behavior. For example, replace a nested status ternary with ordered early returns, preserving which status wins when multiple conditions are true. When diagnostics mix evidence decisions into string construction, derive the report facts once and render them in their existing order. Avoid assumptions such as interchangeable `||` and `??`, or interchangeable async wrappers and direct calls: falsy values, rejection behavior, or timing may change.
4. **Preserve the contract exactly.** Keep inputs, outputs, error behavior, side effects, ordering, and public interfaces intact. For this plugin, pay particular attention to command names and arguments, permission and actor boundaries, native `bd` invocations and mutation behavior, diagnostics text/order, and cancellation/replay. Do not add speculative guards or compensate for upstream behavior. If you discover a bug or missing contract, report it separately rather than silently fixing it.
5. **Verify incrementally.** Establish a passing baseline, then run focused tests after each coherent batch. Treat existing tests as the regression oracle; do not change expected results to make a refactor pass. Leave tests alone by default; a narrowly scoped regression test for a demonstrable gap is a separate, explained change within the assignment. For production source changes, finish with `bun run check`, `bun test`, and `bun run test:package`, plus the applicable focused native check if the touched boundary depends on native behavior. Report what was not run. Review the diff for net readability and drop any change that is harder to explain than the original.

Hand back the changes by area, untouched areas worth calling out, preserved behavior, and actual verification results. Do not commit or publish unless the assignment explicitly permits it.

## Provenance

Adapted from [Addy Osmani’s code-simplification skill](https://github.com/addyosmani/agent-skills/blob/e997ac5b9a74eab332d5e9793bb38a38c8cfdd74/skills/code-simplification/SKILL.md) (MIT, see [LICENSE](LICENSE)). This port keeps the understand-first, exact-behavior, convention, incremental-change, and verification principles; it limits examples to TypeScript and replaces the generic line threshold and commit loop with repository scope, verification, and authority rules.
