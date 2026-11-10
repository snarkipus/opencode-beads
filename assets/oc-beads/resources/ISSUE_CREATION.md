# Creating useful issues

> Adapted from Beads [`ISSUE_CREATION.md`](https://github.com/gastownhall/beads/blob/5ac194105c138ca799bc2f6534c8f92712d8d782/plugins/beads/skills/beads/resources/ISSUE_CREATION.md) at `5ac194105c138ca799bc2f6534c8f92712d8d782`; see [third-party notices](../THIRD_PARTY_NOTICES.md).

Create a durable issue when work needs its own assignment, dependencies,
multi-session history, or acceptance record, and only when the existing authority
allows creation. Do not create one for every retry, note, or discovered idea.
Discovery may be reported without being worked; a `discovered-from` edge does
not authorize the new issue.

## Write for the next executor

- **Title:** a specific outcome or problem.
- **Description:** why the work exists, relevant context, and boundaries.
- **Design:** the intended approach and important constraints.
- **Acceptance:** observable conditions that define completion.
- **Notes:** evolving progress, incremental checkpoints and deliberate current-state handoffs.

Do not treat a proposed approach as an acceptance test. Avoid secrets, copied
logs, vague “investigate” titles without a question, and unsupported promises.
Leave new work unassigned unless an assignment is intentional. If a human owns
the work, assign that person deliberately; an agent actor is not proof of
permission.

Keep design and acceptance distinct: design records a candidate approach and
trade-offs that may change; acceptance states a testable outcome that remains
true if the implementation changes. For example, “reuse the current parser if
it handles quoted fields” is design; “quoted commas and quotes round-trip in the
export” is acceptance. Put the former in `--design` and the latter in
`--acceptance`.

Current syntax comes from `bd create --help`. A write must use the actual
executor actor, for example:

```sh
bd create "Clarify retry behavior" --type=task --priority=2 \
  --description="Record the user-visible issue and affected path." \
  --design="Trace the current behavior and document the supported correction." \
  --acceptance="The behavior and validation evidence are recorded." \
  --actor='<executor-actor>' --sandbox --json
```

Before creating linked work, inspect the parent and verify dependency direction.
Keep planning and implementation ownership distinct when the project assigns
them to different people.


### Verbatim upstream excerpt: ISSUE_CREATION, When to Ask First vs Create Directly and Issue Quality

## When to Ask First vs Create Directly {#when-to-ask}

### Ask the user before creating when:
- Knowledge work with fuzzy boundaries
- Task scope is unclear
- Multiple valid approaches exist
- User's intent needs clarification

### Create directly when:
- Clear bug discovered during implementation
- Obvious follow-up work identified
- Technical debt with clear scope
- Dependency or blocker found

**Why ask first for knowledge work?** Task boundaries in strategic/research work are often unclear until discussed, whereas technical implementation tasks are usually well-defined. Discussion helps structure the work properly before creating issues, preventing poorly-scoped issues that need immediate revision.

## Issue Quality {#quality}

Use clear, specific titles and include sufficient context in descriptions to resume work later.

### Field Usage

**Use --design flag for:**
- Implementation approach decisions
- Architecture notes
- Trade-offs considered

**Use --acceptance flag for:**
- Definition of done
- Testing requirements
- Success metrics

**OpenCode adaptation:** Follow the existing assignment and permissions; quoted commands are historical illustrations, not copyable local commands. Use the actor-scoped examples above.


### Verbatim upstream excerpt: ISSUE_CREATION, Design vs Acceptance Criteria

## Design vs Acceptance Criteria (Critical Distinction) {#design-vs-acceptance}

Common mistake: Putting implementation details in acceptance criteria. Here's the difference:

### DESIGN field (HOW to build it):
- "Use two-phase batchUpdate approach: insert text first, then apply formatting"
- "Parse with regex to find * and _ markers"
- "Use JWT tokens with 1-hour expiry"
- Trade-offs: "Chose batchUpdate over streaming API for atomicity"

### ACCEPTANCE CRITERIA (WHAT SUCCESS LOOKS LIKE):
- "Bold and italic markdown formatting renders correctly in the Doc"
- "Solution accepts markdown input and creates Doc with specified title"
- "Returns doc_id and webViewLink to caller"
- "User tokens persist across sessions and refresh automatically"

### Why this matters:
- Design can change during implementation (e.g., use library instead of regex)
- Acceptance criteria should remain stable across sessions
- Criteria should be **outcome-focused** ("what must be true?") not **step-focused** ("do these steps")
- Each criterion should be **verifiable** - you can definitively say yes/no

### The pitfall

Writing criteria like "- [ ] Use batchUpdate approach" locks you into one implementation.

Better: "- [ ] Formatting is applied atomically (all at once or not at all)" - allows flexible implementation.

### Test yourself

If you rewrote the solution using a different approach, would the acceptance criteria still apply? If not, they're design notes, not criteria.

### Example of correct structure

✅ **Design field:**
```
Two-phase Docs API approach:
1. Parse markdown to positions
2. Create doc + insert text in one call
3. Apply formatting in second call
Rationale: Atomic operations, easier to debug formatting separately
```

✅ **Acceptance criteria:**
```
- [ ] Markdown formatting renders in Doc (bold, italic, headings)
- [ ] Lists preserve order and nesting
- [ ] Links are clickable
- [ ] Large documents (>50KB) process without timeout
```

❌ **Wrong (design masquerading as criteria):**
```
- [ ] Use two-phase batchUpdate approach
- [ ] Apply formatting in second batchUpdate call
```

**OpenCode adaptation:** Follow the existing assignment and permissions; quoted commands are historical illustrations, not copyable local commands. Use the actor-scoped examples above.


### Verbatim upstream excerpt: ISSUE_CREATION, Quick Reference

## Quick Reference

**Creating good issues:**

1. **Title**: Clear, specific, action-oriented
2. **Description**: Problem statement, context, why it matters
3. **Design**: Approach, architecture, trade-offs (can change)
4. **Acceptance**: Outcomes, success criteria (should be stable)
5. **Notes**: Implementation details, session handoffs (evolves over time)

**OpenCode adaptation:** Follow the existing assignment and permissions; quoted commands are historical illustrations, not copyable local commands. Use the actor-scoped examples above.
