# study-scripts Specification

## Purpose
Python helpers that compute and report study progress from exported data.

## ADDED Requirements

### Requirement: PDF progress report
The system SHALL generate a PDF with the student name, the date and one row per subject with completed, total and percentage.

#### Scenario: Generating the report
- **WHEN** the script receives a student and a list of subjects
- **THEN** it writes a PDF file and prints its path as JSON
