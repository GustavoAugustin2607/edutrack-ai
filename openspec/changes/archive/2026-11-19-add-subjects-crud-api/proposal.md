# Change: add-subjects-crud-api

## Why
The app must create, read, update and delete subjects while each student only reaches their own data.

## What Changes
- Read through `GET /rest/v1/subjects`; write through `POST /rest/v1/rpc/save_study_workspace`.
- RLS policies own_select, own_insert, own_update and own_delete on study_workspaces.

## Impact
- Affected specs: workspace-storage
- Affected code: backend/schema.sql, frontend/repository.ts
