# gamification Specification

## Purpose
Reward real study habits with progress that cannot drift from what the student actually did.

## Requirements

### Requirement: Derived XP
The system SHALL derive XP from the study record plus claimed rewards and MUST NOT keep a writable XP counter.

#### Scenario: Task XP
- **WHEN** a student completes a task
- **THEN** it grants 30 XP, plus 15 for high or 5 for medium priority, plus 10 when on time

#### Scenario: Focus XP
- **WHEN** a focus session is logged
- **THEN** it grants 2 XP per minute, plus 15 for sessions of 25 minutes or more

#### Scenario: Reviews and quizzes
- **WHEN** a card is reviewed or a Tutor quiz is finished
- **THEN** it grants 5 XP per review, or 10 XP per correct answer plus 25 for a perfect quiz

#### Scenario: Deleted study data
- **WHEN** a student deletes the records behind earned XP
- **THEN** the total goes down accordingly

### Requirement: Levels and ranks
The system SHALL cost `150 + 50 × (level − 1)` XP per level and assign ranks at levels 1, 5, 10, 15, 20, 30 and 40.

#### Scenario: Level up
- **WHEN** a student reaches a new level
- **THEN** a celebration appears and the level adds 20 coins to the wallet

### Requirement: Study streak
The system SHALL count consecutive days with any study activity and keep the streak alive until the current day ends.

#### Scenario: No activity yet today
- **WHEN** a student has not studied today but studied yesterday
- **THEN** the streak stays alive and is flagged as at risk

#### Scenario: Protector covers a missed day
- **WHEN** a student missed yesterday and owns a streak protector
- **THEN** the protector is spent automatically and the streak continues

### Requirement: Quests and daily chest
The system SHALL offer three daily quests, stable during the day, and three weekly challenges, and SHALL grant a chest of 50 XP and 40 coins when every daily quest is claimed.

#### Scenario: Claiming twice
- **WHEN** the same quest is claimed again
- **THEN** no extra reward is granted

### Requirement: Achievements
The system SHALL track 38 achievements with four rarities worth 10, 25, 50 and 100 coins, including hidden ones.

#### Scenario: Unlocking
- **WHEN** study data meets the target of an achievement
- **THEN** it unlocks once and a notification appears

### Requirement: Coins and shop
The system SHALL sell themes, avatar frames, titles and streak protectors with coins, honoring level gates and a limit of three stored protectors.

#### Scenario: Not enough coins
- **WHEN** a student buys an item above the balance
- **THEN** the purchase is refused and nothing changes

#### Scenario: Level gate
- **WHEN** a student buys an item above the current level
- **THEN** the purchase is refused and the required level is shown

#### Scenario: Balance after deletions
- **WHEN** deleting study data lowers the coins earned below the coins spent
- **THEN** the wallet shows zero instead of a negative value

### Requirement: Backward compatible game data
The system SHALL keep game data in the optional `game` field so that documents created before gamification stay valid.

#### Scenario: Older account
- **WHEN** an account without the `game` field loads
- **THEN** default game data is used and past study still counts as XP
