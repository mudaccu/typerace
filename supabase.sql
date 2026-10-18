-- Run this once in Supabase → SQL Editor → New query → Run.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 16),
  mode text not null check (mode in ('sprint', 'race', 'marathon', 'daily')),
  wpm int not null check (wpm between 0 and 250),
  acc int not null check (acc between 0 and 100),
  time_ms int not null,
  day date not null,
  car text not null default 'starter',
  timeline jsonb not null
);

create index if not exists scores_board on public.scores (mode, created_at desc, wpm desc);
create index if not exists scores_daily on public.scores (mode, day, wpm desc);

-- Anyone can read the leaderboard...
alter table public.scores enable row level security;
drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores for select using (true);
-- ...but there is no insert/update/delete policy, so only /api/submit
-- (which uses the secret service_role key and runs the anti-cheat check) can write.
