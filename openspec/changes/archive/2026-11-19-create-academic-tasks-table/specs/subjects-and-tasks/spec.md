# subjects-and-tasks Specification

## Purpose
Give students one place to organize courses and academic work.

## ADDED Requirements

### Requirement: Academic tasks table
The system SHALL store each academic task with title, status, due date and the subject_id of its subject, owned by the student's user_id.

#### Scenario: Task linked to a subject
- **WHEN** a student creates a task for a subject
- **THEN** the task stores that subject_id and the student's user_id
