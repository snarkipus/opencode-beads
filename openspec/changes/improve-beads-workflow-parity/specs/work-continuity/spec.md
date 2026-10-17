# Work continuity

## Purpose

Preserve meaningful work context so authorized work can resume across compaction, session changes and delegation without reconstructing failed approaches or asking the user to repeat known context.

These are proposed common outcomes, not approved feature selections. The owner gate in proposal/design blocks implementation. Delivery mechanisms and selected integration features require a follow-on revision after Matt's dispositions.

## ADDED Requirements

### Requirement: Meaningful progress checkpoints

During authorized tracked work, the integration SHALL guide preservation of material attempts, outcomes, rationale, blockers and the next action at meaningful work transitions without requiring repeated user reminders. Records SHALL preserve relevant prior learning and distinguish verified results from hypotheses.

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

#### Scenario: Prepared checkpoint fails during compaction

- **WHEN** an awaited compaction hook attempts to finish an already-prepared authorized checkpoint and persistence fails or times out
- **THEN** the integration preserves the incomplete status without claiming successful persistence
- **AND** it does not wait for a recursive same-session prompt or initiate new permission escalation inside that checkpoint path

#### Scenario: User stops execution

- **WHEN** an execution interruption or permission wait is observed
- **THEN** the integration does not automatically restart work or approve the blocked operation to manufacture a final checkpoint
- **AND** recovery uses earlier durable checkpoints and reports known gaps
