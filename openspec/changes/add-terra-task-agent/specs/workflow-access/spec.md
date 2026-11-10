## ADDED Requirements

### Requirement: Optional named task-agent profiles

The integration SHALL offer independent opt-in Luna Max and Terra Medium task-agent profiles alongside its unchanged model-inheriting default. Fixed profiles SHALL select explicit provider, model and reasoning variant without changing the parent route or silently falling back. All profiles SHALL preserve existing Beads scope, permissions, context, ownership and lifecycle behavior and native user-configuration precedence.

#### Scenario: Existing configuration remains unchanged

- **WHEN** neither option is enabled, or only existing `luna: true` is enabled
- **THEN** the default `beads-task-agent` remains model-inheriting
- **AND** Luna is absent unless enabled, and enabled Luna retains `beads-task-agent-luna` with `openai/gpt-6-luna` at `max`
- **AND** Terra is not registered without `terra: true`

#### Scenario: Terra is selected independently

- **WHEN** `terra: true` is enabled and Luna is not enabled
- **THEN** `beads-task-agent-terra` is registered with `openai/gpt-6.1-terra` at `medium` alongside the unchanged default
- **AND** no Luna profile is added and the parent session route is unchanged

#### Scenario: Both fixed profiles are selected

- **WHEN** `luna: true` and `terra: true` are enabled together
- **THEN** the default, Luna and Terra profiles are independently selectable with their respective routing
- **AND** selecting a profile does not authorize additional work, synchronization, publication or closure

#### Scenario: Terra participates in the existing task-agent lifecycle

- **WHEN** a Terra task agent executes a permitted read-only assignment or authorized task
- **THEN** it receives the same applicable Beads context, guidance, interruption cap and permission rules as the other task-agent profiles, with identity derived from its actual invoking session and agent
- **AND** existing stop, partial-result, ownership and parent-acceptance requirements remain controlling
- **AND** native configuration overrides and plugin disposal apply without changing unrelated user artifacts

#### Scenario: The configured provider route is unavailable

- **WHEN** an enabled fixed profile cannot use its configured provider, model or variant
- **THEN** the host-reported inability is preserved without a plugin-selected substitute model or a claim of successful execution
