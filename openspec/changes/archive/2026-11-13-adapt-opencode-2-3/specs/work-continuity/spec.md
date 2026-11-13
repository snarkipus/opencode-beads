# Spec Delta

## MODIFIED Requirements

### Requirement: Delegated knowledge and closure evidence

For selected delegated workflows, the integration SHALL preserve the task's scope, significant learning, validation, blockers and next action across the worker-to-caller boundary. Completion SHALL be distinguished from partial progress; closure SHALL require relevant acceptance and validation evidence.

#### Scenario: Worker returns a partial result

- **WHEN** a worker stops after a failed approach or blocker
- **THEN** the caller receives the attempt, outcome, durable references and next action needed to continue
- **AND** the result is not represented as completed work merely because the invocation ended

#### Scenario: Closure with unresolved acceptance

- **WHEN** a task has unresolved acceptance criteria or relevant validation has failed
- **THEN** the workflow preserves the unresolved state and evidence rather than closing it as complete

#### Scenario: Native launch acknowledgement precedes a report

- **WHEN** the host immediately acknowledges an authorized child launch or follow-up with a running session handle
- **THEN** the integration treats it as transport acknowledgement rather than a child result or completed task
- **AND** host-owned asynchronous execution does not authorize additional workers, nested work, claim transfer or scope expansion

#### Scenario: Repeated idle reports require reconciliation

- **WHEN** a native child report reaches an idle or already-running parent, including a repeated idle-period report with work outstanding
- **THEN** the next eligible parent request obtains relevant current task state and knowledge or discloses unavailable, withheld or uncertain freshness before relying on it
- **AND** the caller reconciles scope, actual actor/session, attempts, outcomes, validation, durable references, blockers and remaining acceptance under existing permissions and custody
- **AND** a period-completed label or idle report alone does not establish task completion, authorize closure or resume deliberately stopped work

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

- **WHEN** summary/native history is recovered or forked on the selected host, or its provider/model changes
- **THEN** the integration preserves host-owned native replay and summary retention without substituting a provider replacement window for a summary
- **AND** tool execution state and UI metadata are not treated as renamed provider replay payloads
- **AND** workflow snapshots present in native latest-compaction context follow workflow-access expansion; earlier ordinary user messages restored after a non-replayable native-window model switch receive explicit unavailable-guidance disclosure when their snapshots are absent from that context
