# classroom-import Specification

## Purpose
Bring courses and coursework from Google Classroom into the planner, on request and without writing anything back.

## Requirements

### Requirement: Read-only access
The system MUST request only read scopes and MUST NOT submit work or change anything in Classroom.

#### Scenario: Completing an imported task
- **WHEN** a student completes an imported task
- **THEN** the change stays in EduTrack and Classroom is not modified

### Requirement: Token kept in memory
The system MUST keep the Google access token only in memory and clear it when the session changes.

#### Scenario: Reloading the page
- **WHEN** the page reloads
- **THEN** the student connects again to sync

### Requirement: Idempotent paginated import
The system SHALL read every page of courses, coursework and the student's submissions, matching existing records by `google_id`.

#### Scenario: Syncing twice
- **WHEN** a student syncs again
- **THEN** existing subjects and tasks are updated instead of duplicated

### Requirement: Actionable OAuth errors
The system SHALL explain configuration problems, such as a missing client ID or denied permissions, in terms the student can act on.

#### Scenario: Missing client ID
- **WHEN** the integration has no Client ID
- **THEN** the page asks for it and no OAuth flow starts
