# leaderboard Specification

## Purpose
Add social motivation without exposing study content, keeping participation a choice of each student.

## Requirements

### Requirement: Opt-in participation
The system SHALL publish a student's score only after the student opts in.

#### Scenario: Leaving the ranking
- **WHEN** a student turns the ranking off
- **THEN** that student's row is deleted

### Requirement: Minimal public data
The system MUST publish only display name, title, frame, XP, level, streak, weekly XP and house.

#### Scenario: Study content
- **WHEN** a score is published
- **THEN** no subject, task or card data leaves the private workspace

### Requirement: Weekly and all-time views
The system SHALL show the top 50 of the current week and of all time.

#### Scenario: Weekly view
- **WHEN** a student opens the weekly ranking
- **THEN** rows are limited to the current week and sorted by weekly XP

### Requirement: Row ownership
The system MUST allow writes only to the student's own row and reads only to authenticated users.

#### Scenario: Anonymous request
- **WHEN** an unauthenticated client queries the leaderboard
- **THEN** access is denied
