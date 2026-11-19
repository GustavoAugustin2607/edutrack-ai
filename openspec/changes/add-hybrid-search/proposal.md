# Change: add-hybrid-search

## Why
Students need to find a subject by name or quickly see which subjects have overdue work.

## What Changes
- Add the RPC `search_subjects(p_name, p_overdue)` in Supabase, limited to the caller's data.
- Add `scripts/search_subjects.py` with the same rule for exported data.

## Impact
- Affected specs: study-scripts
- Affected code: backend/search.sql, scripts/search_subjects.py
