# Change: add-progress-script

## Why
Teachers and students need the completion rate of a set of tasks outside the app, for reports and quick checks.

## What Changes
- Add `scripts/calculate_progress.py`, which receives completed and total tasks and prints the percentage as JSON.

## Impact
- Affected specs: study-scripts
- Affected code: scripts/calculate_progress.py, scripts/test_scripts.py
