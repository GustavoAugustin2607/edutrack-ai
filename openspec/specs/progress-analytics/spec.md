# progress-analytics Specification

## Purpose
Show students what deserves attention now and how they delivered over time, using only real study data.

## Requirements

### Requirement: Overview
The system SHALL show a greeting, weekly metrics, a seven-day study chart, the next action, upcoming deadlines and daily quests.

#### Scenario: Metrics are shortcuts
- **WHEN** a student clicks a metric on the overview
- **THEN** the app opens the page that explains that number

#### Scenario: Next action
- **WHEN** a student starts the suggested action
- **THEN** the focus page opens with that task selected

### Requirement: Delivery classification
The system SHALL classify tasks as on time, late, overdue, pending, unknown or without due date, comparing the local date of `completed_at` with `due_date`.

#### Scenario: Completed on the due date
- **WHEN** a task is completed on or before its due date
- **THEN** it counts as on time

#### Scenario: Completed after the due date
- **WHEN** a task is completed after its due date
- **THEN** it counts as late

#### Scenario: Missing completion history
- **WHEN** a finished task has no valid `completed_at`
- **THEN** it counts as unknown instead of being guessed

### Requirement: Subject analysis
The system SHALL chart delivery status per subject, with period filters and the list of activities behind the chart.

#### Scenario: Changing the period
- **WHEN** a student selects another period
- **THEN** chart and activity list update together
