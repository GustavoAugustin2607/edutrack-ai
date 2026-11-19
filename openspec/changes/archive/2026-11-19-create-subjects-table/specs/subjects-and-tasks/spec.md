# subjects-and-tasks Specification

## Purpose
Give students one place to organize courses and academic work.

## ADDED Requirements

### Requirement: Subjects table
The system SHALL store each subject with id, name, teacher, hours and the owner's user_id.

#### Scenario: Student creates a subject
- **WHEN** a student creates a subject
- **THEN** it is stored linked to that student's user_id
