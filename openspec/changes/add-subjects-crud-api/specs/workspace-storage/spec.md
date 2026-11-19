# workspace-storage Specification

## Purpose
Keep each student's study data private and consistent.

## ADDED Requirements

### Requirement: Subjects CRUD API
The system SHALL offer create, read, update and delete of subjects through the Supabase REST API, and MUST restrict every operation to the authenticated user.

#### Scenario: Reading subjects
- **WHEN** a student calls GET /rest/v1/subjects
- **THEN** only that student's subjects are returned

#### Scenario: Request without a session
- **WHEN** a request has no user token
- **THEN** no subject is returned or changed
