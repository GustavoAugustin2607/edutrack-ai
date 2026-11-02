# accounts Specification

## Purpose
Let a student create an account and reach the app without depending on e-mail delivery, and let any visitor try the product without signing up.

## Requirements

### Requirement: Immediate sign-up
The system SHALL create accounts through the `signup` Edge Function, already confirmed, and sign the student in right after.

#### Scenario: Valid sign-up
- **WHEN** a visitor submits a valid e-mail, a name with at least 2 characters and a password of 8 to 72 characters
- **THEN** the account is created without a confirmation e-mail and the student enters the app

#### Scenario: E-mail already registered
- **WHEN** a visitor signs up with an e-mail that already has an account
- **THEN** the function answers 409 and the form tells the visitor to sign in instead

#### Scenario: Passwords do not match
- **WHEN** the password and its confirmation differ
- **THEN** the form shows an alert and the account is not created

### Requirement: Sign-in and recovery
The system SHALL support password sign-in and password recovery by e-mail through Supabase Auth.

#### Scenario: Password recovery
- **WHEN** a student requests a recovery link and opens it
- **THEN** the app returns with the recovery mode active and accepts a new password

### Requirement: Protected sign-out
The system MUST NOT end a session while the workspace holds an unsaved error state.

#### Scenario: Pending data
- **WHEN** a student signs out while the last save failed
- **THEN** the app asks the student to export the pending data first

### Requirement: Demo mode
The system SHALL offer a demonstration with sample data that needs no account and stays on the device.

#### Scenario: Explore the demo
- **WHEN** a visitor chooses "Explorar demonstração"
- **THEN** the app opens with sample data stored only in `localStorage`

#### Scenario: Sign-up stays the first screen
- **WHEN** a visitor reloads the page without a session
- **THEN** the sign-up screen is shown, with the demonstration as an option
