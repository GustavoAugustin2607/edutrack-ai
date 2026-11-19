# study-scripts Specification

## Purpose
Python helpers that compute and report study progress from exported data.

## ADDED Requirements

### Requirement: Hybrid subject search
The system SHALL return the student's subjects whose name contains the search term OR that have tasks not done with a past due date.

#### Scenario: Match by name or by overdue tasks
- **WHEN** a student searches for "mat" with the overdue filter on
- **THEN** subjects matching the name and subjects with overdue tasks are both returned

#### Scenario: Other students' data
- **WHEN** a student calls the RPC
- **THEN** only that student's subjects can be returned
