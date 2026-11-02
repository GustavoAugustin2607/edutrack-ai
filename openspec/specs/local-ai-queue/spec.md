# local-ai-queue Specification

## Purpose
Run the language model on a personal PC without opening inbound ports or exposing that PC to the internet.

## Requirements

### Requirement: Pull-based private queue
The system SHALL keep generation jobs in tables without browser access, and the worker SHALL fetch them over outbound HTTPS.

#### Scenario: Browser access
- **WHEN** a browser queries the queue tables directly
- **THEN** access is denied

### Requirement: Worker authentication
The system MUST authenticate the worker with its own random 256-bit token, storing only its hash, and MUST NOT accept student credentials in its place.

#### Scenario: Invalid token
- **WHEN** a request presents a badly formed token
- **THEN** the endpoint answers 401

### Requirement: Queue limits
The system SHALL allow one active job per account and three active jobs in total, and SHALL expire jobs after six minutes.

#### Scenario: Queue is full
- **WHEN** a request arrives with three active jobs
- **THEN** the student is told to wait

### Requirement: Long polling
The system SHALL hold the worker's claim request for up to 20 seconds so jobs start quickly with few requests.

#### Scenario: Job arrives during the wait
- **WHEN** a job is queued while the worker waits
- **THEN** the worker receives it without a new polling cycle

### Requirement: Quiz self-check
The worker SHALL generate one spare quiz question, answer the draft blindly against the sources and prefer the questions whose answer matches the key.

#### Scenario: Doubtful question
- **WHEN** the blind answer differs from the key
- **THEN** confirmed questions are used first

### Requirement: Private logs
The worker MUST NOT write student content to its local logs.

#### Scenario: Finished job
- **WHEN** a job ends
- **THEN** the log records technical data such as the token count, without the prompt or the result
