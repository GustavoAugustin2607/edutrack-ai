# agent-rules Specification

## Purpose
Rules that AI assistants follow when they change this repository.

## Requirements

### Requirement: Task scope
AI assistants SHALL include in tasks.md only what the user explicitly asked for.

#### Scenario: Table request
- **WHEN** the user asks for a table
- **THEN** tasks.md does not add APIs, tests or screens

### Requirement: No automatic deploy
AI assistants MUST NOT push, deploy or apply migrations; the developer publishes changes.

#### Scenario: Generated files
- **WHEN** an assistant finishes the files of a change
- **THEN** it stops and leaves publishing to the developer
