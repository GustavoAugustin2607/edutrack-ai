# subjects-and-tasks Specification

## Purpose
Give students one place to organize courses and academic work, keeping history available for progress analysis.

## Requirements

### Requirement: Subject lifecycle
The system SHALL let a student create, edit, archive, restore and delete subjects.

#### Scenario: Archive keeps history
- **WHEN** a student archives a subject
- **THEN** it leaves the active lists and its tasks, sessions and cards are preserved

#### Scenario: Delete removes linked data
- **WHEN** a student confirms the deletion of a subject
- **THEN** the subject and its tasks, sessions, cards and planned blocks are removed

### Requirement: Task lifecycle
The system SHALL let a student create, edit, delete, complete, reopen, filter and search tasks with due date, priority, estimate and notes.

#### Scenario: Completing a task
- **WHEN** a student completes a task
- **THEN** `completed_at` records the moment and the XP for that task is granted

#### Scenario: Reopening a task
- **WHEN** a student reopens a completed task
- **THEN** `completed_at` is cleared and a later completion records a new moment

#### Scenario: Deleting a task
- **WHEN** a student confirms the deletion of a task
- **THEN** the task and its planned blocks are removed

### Requirement: Subjects table
The system SHALL store each subject with id, name, teacher, hours and the owner's user_id.

#### Scenario: Student creates a subject
- **WHEN** a student creates a subject
- **THEN** it is stored linked to that student's user_id

### Requirement: Academic tasks table
The system SHALL store each academic task with title, status, due date and the subject_id of its subject, owned by the student's user_id.

#### Scenario: Task linked to a subject
- **WHEN** a student creates a task for a subject
- **THEN** the task stores that subject_id and the student's user_id
