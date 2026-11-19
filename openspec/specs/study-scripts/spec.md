# study-scripts Specification

## Purpose
Python helpers that compute and report study progress from exported data.

## Requirements

### Requirement: Progress percentage
The system SHALL compute progress as completed divided by total tasks and print it as JSON with two decimals.

#### Scenario: Partial progress
- **WHEN** the script runs with 3 completed out of 8 tasks
- **THEN** it prints a percentage of 37.5

#### Scenario: No tasks yet
- **WHEN** the total is zero
- **THEN** it prints a percentage of 0.0 instead of failing

#### Scenario: Invalid input
- **WHEN** completed is greater than total
- **THEN** it prints a JSON error and exits with code 1

### Requirement: Hybrid subject search
The system SHALL return the student's subjects whose name contains the search term OR that have tasks not done with a past due date.

#### Scenario: Match by name or by overdue tasks
- **WHEN** a student searches for "mat" with the overdue filter on
- **THEN** subjects matching the name and subjects with overdue tasks are both returned

#### Scenario: Other students' data
- **WHEN** a student calls the RPC
- **THEN** only that student's subjects can be returned

### Requirement: PDF progress report
The system SHALL generate a PDF with the student name, the date and one row per subject with completed, total and percentage.

#### Scenario: Generating the report
- **WHEN** the script receives a student and a list of subjects
- **THEN** it writes a PDF file and prints its path as JSON
