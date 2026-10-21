# Work continuity

## Purpose

Preserve meaningful work context so authorized work can resume across compaction, session changes and delegation without reconstructing failed approaches or asking the user to repeat known context.

These are the selected N1 outcome contracts. Historical source acceptance remains intact; new code-mode source tasks and behavioral acceptance remain unexecuted. See design and tasks for qualified delivery boundaries.

## ADDED Requirements

### Requirement: Meaningful progress checkpoints

During authorized tracked work, the integration SHALL guide preservation of material attempts, outcomes, rationale, blockers and the next action at meaningful work transitions without requiring repeated user reminders. Records SHALL preserve relevant prior learning through append-style checkpoints and distinguish verified results from hypotheses; replacement of existing notes SHALL be intentional, not the default checkpoint path.

#### Scenario: Failed approach changes the next step

- **WHEN** an attempted solution fails and work proceeds to another approach
- **THEN** durable task context records the attempted approach, failure evidence, reason for changing course and next action
- **AND** recovery does not require repeating the failed experiment to rediscover its outcome

#### Scenario: No meaningful new learning

- **WHEN** an operation produces no material change in work context
- **THEN** the integration does not require a redundant write solely to satisfy a frequency or quantity target

### Requirement: Relevant reusable knowledge

The integration SHALL distinguish task-specific progress from supported reusable project knowledge, guide retrieval of relevant existing knowledge before relying on or duplicating it, and preserve scope and evidence when recording or correcting reusable knowledge within the user's authority.

#### Scenario: Discovery applies beyond the current issue

- **WHEN** a validated finding is likely to help later work and equivalent knowledge is absent or outdated
- **THEN** the workflow preserves the finding as reusable project knowledge with its applicability and evidence
- **AND** task context retains a reference sufficient to connect the finding to the work

#### Scenario: Temporary state is not a general rule

- **WHEN** a transient failure or unsupported hypothesis is useful only to the current task
- **THEN** it remains qualified task context rather than an asserted general project fact

### Requirement: Recovery from durable state

On resuming authorized work after compaction or a fresh session, the integration SHALL guide retrieval of relevant task state and reusable knowledge sufficient to identify previous attempts, decisions, blockers and the next action. Missing, stale or unavailable context SHALL be disclosed rather than presented as successful recovery.

#### Scenario: Conversation history is absent

- **WHEN** a new session resumes a task with durable checkpoints but no prior conversation
- **THEN** the workflow retrieves and uses the relevant checkpoints and knowledge to explain the current position and next action without asking the user to restate recorded facts

#### Scenario: Knowledge changed since cached context

- **WHEN** recovery or a relevant work transition requires knowledge newer than cached context
- **THEN** the workflow obtains current relevant state or reports why it cannot
- **AND** it does not treat cached absence as proof that no knowledge exists

### Requirement: Delegated knowledge and closure evidence

For selected delegated workflows, the integration SHALL preserve the task's scope, significant learning, validation, blockers and next action across the worker-to-caller boundary. Completion SHALL be distinguished from partial progress; closure SHALL require relevant acceptance and validation evidence.

#### Scenario: Worker returns a partial result

- **WHEN** a worker stops after a failed approach or blocker
- **THEN** the caller receives the attempt, outcome, durable references and next action needed to continue
- **AND** the result is not represented as completed work merely because the invocation ended

#### Scenario: Closure with unresolved acceptance

- **WHEN** a task has unresolved acceptance criteria or relevant validation has failed
- **THEN** the workflow preserves the unresolved state and evidence rather than closing it as complete

### Requirement: Native trigger and semantic responsibility separation

The selected integration SHALL distinguish awaited interception from observational events and semantic judgment from transport success. It SHALL document the selected native mechanism for each continuity behavior, preserve failed or uncertain persistence status, and avoid indiscriminate conversion of tool results or transcripts into durable memory.

#### Scenario: Compaction starts with unsaved meaning

- **WHEN** compaction occurs before a semantic checkpoint has been prepared
- **THEN** summary guidance does not claim that durable task context was saved
- **AND** an event subscriber is not treated as a compaction barrier or a guaranteed final-write mechanism

#### Scenario: Compaction carries known references and gaps

- **WHEN** the awaited compaction hook prepares summary or native-provider context
- **THEN** it carries acknowledged durable references and known unsaved or uncertain status without initiating persistence
- **AND** it does not wait for a same-session semantic checkpoint, queued write or permission escalation

#### Scenario: User stops execution

- **WHEN** an execution interruption or permission wait is observed
- **THEN** the integration does not automatically restart work or approve the blocked operation to manufacture a final checkpoint
- **AND** recovery uses earlier durable checkpoints and reports known gaps

#### Scenario: Host retains and replays compacted history

- **WHEN** 2.1.1 summary/native history is recovered or forked, or its provider/model changes
- **THEN** the integration preserves host-owned native replay and metadata.keepID/legacy metadata.recent semantics without substituting a provider replacement window for a summary
- **AND** tool execution state and UI metadata are not treated as renamed provider replay payloads

### Requirement: Honest persistence acknowledgement

N1 operations SHALL acknowledge only evidenced outcomes and distinguish failure, uncertain completion and a landed but uncommitted write. They SHALL NOT blindly retry an ambiguous append, force a rejected write or imply a compaction summary is durable Beads state.

#### Scenario: Memory write landed but commit failed

- **WHEN** the CLI reports a stored memory with failed or indeterminate commit status
- **THEN** the integration preserves the memory reference and qualified status without claiming committed durability or automatically committing

#### Scenario: Interrupted append has unknown outcome

- **WHEN** cancellation or timeout prevents confirmation of an append
- **THEN** recovery checks current durable state before another write and exposes the uncertainty

### Requirement: Typed daily-loop composition

The integration SHALL require Beads 1.3.1 or later and expose the eleven-operation beads daily-loop namespace with declared discriminated outputs and fixed supported argv in the accepted subcommand-first canonical form with --sandbox. It SHALL preserve CLI state/claim ownership, per-operation permissions, executor attribution, partial/uncertain outcomes and sole acknowledgement. It SHALL NOT expose generic argv or workflow macros, infer authority from readiness, or retry ambiguous writes.

#### Scenario: Bounded discovery is incomplete

- **WHEN** a bounded query, batch get or direct-edge read is incomplete or partly fails
- **THEN** results identify query scope, per-ID failures and exact or unknown completeness
- **AND** unknown or failed data is not reported as missing, empty or unblocked

#### Scenario: Claim or create outcome is uncertain

- **WHEN** a started claim or create lacks authoritative acknowledgement
- **THEN** the result or recovery state preserves operation, target/query, actual actor and uncertainty
- **AND** claim acknowledgement requires the actual executor as assignee in the actionable state; not-claimed requires evidenced non-claim rather than guessed CLI error text
- **AND** an uncertain create requires search/readback before any caller-considered retry

#### Scenario: Dependent writes compose

- **WHEN** authorized work sequences claim, checkpoint and optional closure
- **THEN** each operation uses its own canonical permission resources and post-approval/pre-spawn guard, location, actor and cancellation checks
- **AND** dependent writes are ordered and stop on rejection or non-acknowledgement, with no transaction or exactly-once promise
- **AND** closure still requires caller authority and acceptance evidence

#### Scenario: Canonical execution preserves permission and sync policy

- **WHEN** a typed read or write is prepared
- **THEN** its resource exactly renders qualified subcommand-first argv with --sandbox on all operations and derived --actor on writes, inserted after operation arguments and before any -- free-text terminator
- **AND** no automatic sync or additional permission rules compensate for changed prefixes

#### Scenario: Execution is refused before spawn

- **WHEN** input is invalid, actual identity is unavailable, a guard hold applies or location changes
- **THEN** the accepted pre-spawn refusal remains thrown; permission rejection and cancellation also propagate unchanged
- **AND** no executed:false result branch replaces the refusal; a started interrupted write retains recovery uncertainty even without a returned normal value

#### Scenario: CLI contract is unsupported

- **WHEN** a proposed filter, argv or output shape is not established on supported minimum/current Beads
- **THEN** the schema does not advertise that unsupported contract and the affected core operation stops for review if no supported mapping exists
- **AND** no implicit version bump, routing repair or invented conflict response supplies the missing contract
