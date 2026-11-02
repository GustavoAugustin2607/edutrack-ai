-- EduTrack gamification: opt-in public leaderboard.
-- Each student decides in "Jornada → Ranking" whether to appear. Only the
-- display name, cosmetic title/frame and game numbers are published; study
-- content stays private in study_workspaces.
create table if not exists public.leaderboard (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  title text check (title is null or char_length(title) <= 40),
  frame text check (frame is null or char_length(frame) <= 40),
  xp integer not null default 0 check (xp between 0 and 10000000),
  level integer not null default 1 check (level between 1 and 1000),
  streak integer not null default 0 check (streak between 0 and 100000),
  week_start date not null,
  week_xp integer not null default 0 check (week_xp between 0 and 10000000),
  updated_at timestamptz not null default now()
);
alter table public.leaderboard enable row level security;
revoke all on public.leaderboard from anon;
grant select, insert, update, delete on public.leaderboard to authenticated;
create policy leaderboard_read on public.leaderboard for select to authenticated using (true);
create policy leaderboard_insert on public.leaderboard for insert to authenticated with check ((select auth.uid()) = user_id);
create policy leaderboard_update on public.leaderboard for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy leaderboard_delete on public.leaderboard for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists leaderboard_xp_idx on public.leaderboard (xp desc);
create index if not exists leaderboard_week_idx on public.leaderboard (week_start, week_xp desc);

-- Houses (Chapéu Seletor): lets the weekly House Cup sum XP per house.
alter table public.leaderboard add column if not exists house text check (house is null or house in ('lumina','eco','forja','raiz'));
create index if not exists leaderboard_house_week_idx on public.leaderboard (week_start, house);
