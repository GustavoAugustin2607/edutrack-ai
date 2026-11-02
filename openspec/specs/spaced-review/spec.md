# spaced-review Specification

## Purpose
Schedule flashcard reviews with spaced repetition so effort goes to what is about to be forgotten.

## Requirements

### Requirement: Review intervals
The system SHALL move each card through stages with intervals of 1, 3, 7, 14 and 30 days, based on the student's self-assessment.

#### Scenario: Again
- **WHEN** a student rates a card "again"
- **THEN** the card returns to the first stage and is due the next day

#### Scenario: Hard
- **WHEN** a student rates a card "hard"
- **THEN** the card keeps its stage and is due after that stage's interval

#### Scenario: Good
- **WHEN** a student rates a card "good"
- **THEN** the card advances one stage, up to the last one

#### Scenario: Easy
- **WHEN** a student rates a card "easy"
- **THEN** the card advances two stages, up to the last one

### Requirement: Due queue
The system SHALL list cards due today or earlier, with an optional filter by subject.

#### Scenario: Nothing due
- **WHEN** a student opens the queue and no card is due
- **THEN** an empty state is shown instead of a review
