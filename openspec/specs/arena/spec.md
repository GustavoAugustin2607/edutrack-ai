# arena Specification

## Purpose
Offer short games built on the student's own study cards, so playing doubles as review.

## Requirements

### Requirement: Three game modes
The system SHALL provide Quiz Relâmpago, Jogo da Memória and Verdadeiro ou Falso.

#### Scenario: Quiz Relâmpago
- **WHEN** a student plays it
- **THEN** a 60-second round runs with four options, a combo multiplier up to ×5 and a 3-second penalty per mistake

#### Scenario: Verdadeiro ou Falso
- **WHEN** a student plays it
- **THEN** 12 rounds run with a bonus for answers given in under 3 seconds

### Requirement: Deck source
The system SHALL use the student's own cards when at least four exist and MUST NOT present sample cards to signed-in students.

#### Scenario: Signed-in student with few cards
- **WHEN** a signed-in student has fewer than four cards
- **THEN** the games stay locked and the app offers to generate cards per subject

#### Scenario: Demo visitor
- **WHEN** a visitor without an account opens the Arena with few cards
- **THEN** a sample deck is used

### Requirement: XP limits
The system SHALL cap Arena XP at 60 per run and 150 per day.

#### Scenario: Daily cap reached
- **WHEN** a run finishes after the daily cap is reached
- **THEN** the score is saved and grants no XP

### Requirement: AI challenge
The system SHALL let the Tutor build a Quiz Relâmpago on any topic and SHALL let the student keep its questions as flashcards.

#### Scenario: Saving the questions
- **WHEN** a challenge ends and the student keeps the questions
- **THEN** they become cards of the chosen subject
