# learning-houses Specification

## Purpose
Turn the first session into a memorable moment that also tells students which study approach suits them.

## Requirements

### Requirement: Sorting ceremony
The system SHALL open a sorting ceremony after the first sign-in of an account without a house, with eight questions mapped to four houses: Lumina, Eco, Forja and Raiz.

#### Scenario: Clear result
- **WHEN** a student finishes the eight questions
- **THEN** the house with the most answers is announced

#### Scenario: Tied result
- **WHEN** two or more houses tie
- **THEN** the tied house chosen last wins

### Requirement: Changing house
The system SHALL let a student repeat the ceremony for free when the house stays the same and SHALL charge 150 coins when it changes.

#### Scenario: Not enough coins
- **WHEN** the new result is another house and the balance is below 150 coins
- **THEN** the student stays in the current house and is told why

### Requirement: House profile
The system SHALL show the percentage per house, strengths and study tips for the student's profile.

#### Scenario: Opening the profile
- **WHEN** a student opens the house tab of the Jornada page
- **THEN** the full profile is displayed

### Requirement: House Cup
The system SHALL rank houses by the sum of weekly XP of students who joined the public ranking.

#### Scenario: Private student
- **WHEN** a student does not join the ranking
- **THEN** that student's XP does not count for the cup
