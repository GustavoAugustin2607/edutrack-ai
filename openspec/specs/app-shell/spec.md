# app-shell Specification

## Purpose
Provide one consistent, accessible frame for every page, from phones to wide screens.

## Requirements

### Requirement: Responsive navigation
The system SHALL show a sidebar from 1024 px and, below that, bottom tabs with a "Mais" sheet holding the remaining pages.

#### Scenario: Phone
- **WHEN** the app opens on a phone
- **THEN** every page is reachable and the layout has no horizontal overflow

### Requirement: Global search
The system SHALL open a search over pages and study items with Ctrl K or ⌘ K.

#### Scenario: Keyboard shortcut
- **WHEN** a student presses the shortcut
- **THEN** the search opens with the field focused

### Requirement: Themes
The system SHALL support light and dark themes, plus color themes bought in the shop.

#### Scenario: Equipping a theme
- **WHEN** a student equips a purchased theme
- **THEN** the accent colors change across the app

### Requirement: Reduced motion
The system MUST respect `prefers-reduced-motion` in page entrances, celebrations and the sorting ceremony.

#### Scenario: Motion turned off in the system
- **WHEN** the system asks for reduced motion
- **THEN** content appears without decorative animation

### Requirement: Keyboard access
The system SHALL offer a skip link and let dialogs and sheets close with Escape.

#### Scenario: Skip link
- **WHEN** a keyboard user activates the skip link
- **THEN** focus moves to the main content
