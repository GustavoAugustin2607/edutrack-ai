# study-planner Specification

## Purpose
Turn pending tasks into a realistic weekly agenda that keeps breaks and spare capacity instead of filling every hour.

## Requirements

### Requirement: Daily capacity
The system SHALL limit each day to 80% of the student's daily minutes, counting studied minutes, planned blocks and their breaks.

#### Scenario: Block does not fit
- **WHEN** a block plus its break exceeds the free time of the day
- **THEN** the block is rejected and the message states how many minutes still fit

### Requirement: Block validation
The system MUST reject blocks that start in the past, last outside 1 to 180 minutes, overlap another block or its break, exceed the unscheduled minutes of the task, or end after midnight.

#### Scenario: Overlapping block
- **WHEN** a block overlaps another block or its break
- **THEN** it is rejected with an overlap message

#### Scenario: Past time
- **WHEN** a student picks a time that already passed
- **THEN** it is rejected and a future time is requested

### Requirement: Automatic week fill
The system SHALL distribute prioritized tasks across the week without passing their deadlines and report the minutes left unscheduled.

#### Scenario: Filling the week
- **WHEN** a student asks to organize the week
- **THEN** blocks are created in priority order and the remaining minutes are shown

### Requirement: Scheduling interactions
The system SHALL support drag and drop, offer an equivalent button for touch screens and allow the last change to be undone.

#### Scenario: Scheduling on a phone
- **WHEN** a student taps "Agendar" on a task
- **THEN** a form suggests a free slot for the chosen day

#### Scenario: Undo
- **WHEN** a student presses "Desfazer" after changing the agenda
- **THEN** the previous blocks are restored

### Requirement: Deadline notice
The system SHALL warn, without blocking, when a block is placed after the deadline of its task.

#### Scenario: Block after the deadline
- **WHEN** a student selects a day after the due date
- **THEN** a notice explains that saving confirms that schedule
