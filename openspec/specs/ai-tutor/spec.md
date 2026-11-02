# ai-tutor Specification

## Purpose
Generate study material about real subject content, grounded in public sources, with the student reviewing everything before it is saved.

## Requirements

### Requirement: Authenticated generation
The system SHALL generate quizzes, flashcards, study plans and explanations through the `study-ai` Edge Function, which requires a session and validates the request.

#### Scenario: Request without a session
- **WHEN** a request arrives without a valid JWT
- **THEN** it is rejected

#### Scenario: Oversized source text
- **WHEN** the study content exceeds 12,000 characters
- **THEN** it is rejected with a clear message

### Requirement: Web research
The system SHALL search Wikipedia in Portuguese, then English, before generating anything other than a plan, and SHALL show the sources under the result.

#### Scenario: Sources found
- **WHEN** the topic has public references
- **THEN** up to 3 excerpts are passed to the model and listed to the student

### Requirement: Content-only questions
The system MUST NOT ask about tasks, deadlines, teachers, grades or course organization; those fields only identify the topic.

#### Scenario: Quiz for a subject
- **WHEN** a quiz is generated for a registered subject
- **THEN** the questions test the subject matter itself

### Requirement: Student review
The system MUST NOT change the agenda or the cards until the student confirms the generated result.

#### Scenario: Generated flashcards
- **WHEN** flashcards are generated
- **THEN** they stay editable and are stored only after confirmation

### Requirement: Output validation
The system MUST validate the generated JSON against the expected shape before delivering it.

#### Scenario: Malformed output
- **WHEN** the model returns an invalid structure
- **THEN** the student receives an error instead of partial content

### Requirement: Offline behavior
The system SHALL report when the Tutor is offline and keep every other feature available.

#### Scenario: PC turned off
- **WHEN** the local worker is offline
- **THEN** the Tutor shows an offline message and the agenda keeps working

### Requirement: Hosted provider limits
The system SHALL limit the hosted OpenAI path to 5 generations per minute and 20 per day per account, with idempotent retries by `request_id`.

#### Scenario: Limit reached
- **WHEN** an account passes a limit
- **THEN** the request is refused with the limit that applied
