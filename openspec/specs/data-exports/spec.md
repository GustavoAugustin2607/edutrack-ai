# data-exports Specification

## Purpose
Let students take their data with them and reuse their agenda outside the app.

## Requirements

### Requirement: Workspace export
The system SHALL export the full workspace as a JSON file.

#### Scenario: Manual export
- **WHEN** a student exports the data in the settings
- **THEN** a dated JSON file is downloaded

#### Scenario: Recovery copy
- **WHEN** a save fails
- **THEN** the error message offers a recovery JSON with the current state

### Requirement: Calendar export
The system SHALL export planned study blocks as an ICS calendar file.

#### Scenario: Importing elsewhere
- **WHEN** a student exports the agenda
- **THEN** an `.ics` file is downloaded

### Requirement: Weekly report
The system SHALL generate a weekly PDF report in the browser.

#### Scenario: Generating the report
- **WHEN** a student asks for the report
- **THEN** a dated PDF is downloaded without sending data to a server
