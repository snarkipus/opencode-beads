## MODIFIED Requirements

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

- **WHEN** summary/native history is recovered or forked on the selected 2.2 host, or its provider/model changes
- **THEN** the integration preserves host-owned native replay and summary retention without substituting a provider replacement window for a summary
- **AND** tool execution state and UI metadata are not treated as renamed provider replay payloads
- **AND** workflow snapshots present in native latest-compaction context follow workflow-access expansion; earlier ordinary user messages restored after a non-replayable native-window model switch receive explicit unavailable-guidance disclosure when their snapshots are absent from that context
