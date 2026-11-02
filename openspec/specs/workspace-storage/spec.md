# workspace-storage Specification

## Purpose
Keep each student's study data private and consistent across tabs and devices, using one validated document per account.

## Requirements

### Requirement: Private workspace document
The system SHALL store each student's data as one JSON document in `study_workspaces`, protected by row level security so only its owner can read or change it.

#### Scenario: Isolation between accounts
- **WHEN** an authenticated student queries the workspace table
- **THEN** only that student's row is returned

### Requirement: Optimistic revision check
The system MUST save through `save_study_workspace` with the last known revision and reject writes based on a stale revision.

#### Scenario: Change made in another tab
- **WHEN** a save arrives after another tab already advanced the revision
- **THEN** the database raises error `40001` and the app offers to export a recovery copy or reload

### Requirement: Document validation
The system MUST validate the document when loading it and MUST reject documents above 2 MiB when saving it.

#### Scenario: Incompatible document
- **WHEN** the stored document fails validation
- **THEN** the app reports an incompatible format instead of overwriting it

#### Scenario: Oversized document
- **WHEN** a save exceeds 2 MiB
- **THEN** the database constraint rejects it

### Requirement: Unsaved work protection
The system SHALL warn the student before the tab closes while a save is pending or has failed.

#### Scenario: Closing during a save
- **WHEN** the student closes the tab with a save in progress
- **THEN** the browser shows its leave-page confirmation

### Requirement: Browser credentials
The system MUST NOT ship service-role keys, model keys or worker tokens to the browser; only the Supabase publishable key is public.

#### Scenario: Production bundle
- **WHEN** the frontend is built
- **THEN** the bundle holds only the project URL and the publishable key
