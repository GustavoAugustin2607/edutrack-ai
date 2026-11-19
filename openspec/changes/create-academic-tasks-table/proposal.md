# Change: create-academic-tasks-table

## Why
Students need to register lessons, exams and assignments linked to each subject.

## What Changes
- Expose `public.academic_tasks` with title, status, due_date, estimated_minutes, completed_at, subject_id and user_id.

## Impact
- Affected specs: subjects-and-tasks
- Affected code: backend/schema.sql
