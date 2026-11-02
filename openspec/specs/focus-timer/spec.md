# focus-timer Specification

## Purpose
Run focus sessions that survive reloads and background throttling, and turn finished time into study history.

## Requirements

### Requirement: Wall-clock timer
The system SHALL compute the remaining time from an absolute end time and persist the timer per account.

#### Scenario: Reload during a session
- **WHEN** a student reloads the page during a running session
- **THEN** the timer resumes with the real remaining time

### Requirement: Session log
The system SHALL record exactly one session when a focus period ends, linked to the selected task and its subject.

#### Scenario: Timer ends twice
- **WHEN** the finish logic runs again for the same timer
- **THEN** no duplicate session is stored

### Requirement: Configurable cycle
The system SHALL use the focus and break lengths from the student's settings and allow pause and resume.

#### Scenario: Pause
- **WHEN** a student pauses a session
- **THEN** the remaining time is frozen until the session resumes

### Requirement: Ambient audio
The system SHALL offer optional ambient sound generated locally with the Web Audio API.

#### Scenario: Audio is off by default
- **WHEN** a focus session starts
- **THEN** no sound plays until the student turns it on
