# Change: create-subjects-table

## Why
Students need to register their subjects so tasks and progress can be grouped per subject.

## What Changes
- Expose `public.subjects` with id, name, teacher, hours, description, archived and user_id, read from the student's workspace and protected by RLS.

## Impact
- Affected specs: subjects-and-tasks
- Affected code: backend/schema.sql
