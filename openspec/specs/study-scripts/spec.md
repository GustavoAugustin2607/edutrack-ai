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
