# EduTrack AI — specification

## Intent
Organize academic work around the next useful action. Responsive React frontend,
Supabase Auth/private data, and user-triggered read-only Google Classroom import.
FlutterFlow and Xano are intentionally not used, following the user's instruction.

## Delivered behavior
- Subjects: create, edit, archive and restore; name, teacher, workload, period, notes.
- Tasks: create, edit, delete with confirmation, complete/reopen, filter/search,
  due date, estimates, notes, priority and Classroom origin.
- Focus: configurable focus/break cycle, pause/resume, wall-clock deadline,
  reload recovery, optional local-generated ambient audio, completed-session log.
- Planner: prioritize deadline/importance, divide work into blocks, include breaks,
  reserve 20 percent capacity, show unscheduled effort, edit/remove blocks.
- Flashcards: reveal, self-assessment, 1/3/7/14/30-day review intervals.
- Progress: completion proportion, recent study minutes, active days, XP and badges.
- Auth: email/password registration, sign-in, recovery, sign-out.
- Storage: demo stays on device, signed-in workspace is private with revision checks.
- Classroom: OAuth token in memory; paginated student courses, coursework and own
  submissions; idempotent import; local completion is separate from actual submission.
- Exports: JSON and calendar ICS. Light/dark themes and reduced motion.

## Explicit external requirements
Supabase project creation requires the connector's cost confirmation. Google Cloud
OAuth client ID, enabled Classroom API, authorized origins/test users are required.
The configured Supabase Auth redirect allowlist must include the app origin.
Rule-based insights are implemented; no generative AI service is represented as live.
Unattended Classroom sync/push notifications/native mobile binaries are not implemented.

## Verification
See tests for task lifecycle, persistence, planning, reviews, timer behavior,
mobile layout and external-configuration failures. No latency/scale guarantee
is asserted without representative load tests.
