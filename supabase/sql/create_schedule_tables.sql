-- Phase 1: persist jobs/members/assignments/time-off (previously held only in
-- React state, which is why entries never synced across devices).
-- Paste this whole file into the Supabase SQL Editor and run it once.

create table if not exists public.members (
  id text primary key,
  name text not null,
  hours_per_day int not null default 8,
  color_idx int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text primary key,
  name text not null,
  category text not null default 'Other',
  mann_days numeric not null default 1,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- portion supports Phase 2 half-day assignments; unused (always 1) until then.
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  member_id text not null references public.members(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  portion numeric(2,1) not null default 1 check (portion in (0.5, 1)),
  created_at timestamptz not null default now(),
  unique (day, member_id, job_id)
);
create index if not exists assignments_day_idx on public.assignments(day);

create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  member_id text not null references public.members(id) on delete cascade,
  type text not null check (type in ('sick', 'vacation')),
  created_at timestamptz not null default now(),
  unique (day, member_id)
);
create index if not exists time_off_day_idx on public.time_off(day);

alter table public.members enable row level security;
alter table public.jobs enable row level security;
alter table public.assignments enable row level security;
alter table public.time_off enable row level security;

-- Any signed-in user can read the schedule; only admins can change it
-- (mirrors the profiles/invites policy split — see scope_admin_policies_to_authenticated.sql).
create policy "Authenticated read members" on public.members
  for select to authenticated using (true);
create policy "Admin write members" on public.members
  for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

create policy "Authenticated read jobs" on public.jobs
  for select to authenticated using (true);
create policy "Admin write jobs" on public.jobs
  for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

create policy "Authenticated read assignments" on public.assignments
  for select to authenticated using (true);
create policy "Admin write assignments" on public.assignments
  for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

create policy "Authenticated read time_off" on public.time_off
  for select to authenticated using (true);
create policy "Admin write time_off" on public.time_off
  for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- Lets the app subscribe to live changes so other devices update without a refresh.
alter publication supabase_realtime add table public.members, public.jobs, public.assignments, public.time_off;

-- Seed from the current hardcoded roster/jobs (src/constants.js) so nothing is lost.
insert into public.members (id, name, color_idx, hours_per_day) values
  ('hank', 'Hank', 0, 8),
  ('mark', 'Mark', 1, 8),
  ('reuben', 'Reuben', 2, 8),
  ('steve', 'Steve', 3, 8),
  ('jake', 'Jake', 4, 8),
  ('josh', 'Josh', 5, 8),
  ('joshh', 'Josh H.', 6, 8),
  ('john', 'John', 7, 8),
  ('turner', 'Turner', 8, 8),
  ('zach', 'Zach', 9, 8),
  ('guy', 'Guy', 0, 8),
  ('elijah', 'Elijah', 1, 8),
  ('ezra', 'Ezra', 2, 8),
  ('brandon', 'Brandon', 3, 8),
  ('raleigh', 'Raleigh', 4, 8),
  ('tristan', 'Tristan', 5, 8),
  ('tristanb', 'Tristan B', 6, 8),
  ('dustin', 'Dustin', 7, 8),
  ('clayton', 'Clayton', 8, 8)
on conflict (id) do nothing;

insert into public.jobs (id, name, category, mann_days, notes) values
  ('j1', 'Social Club S&G Doors', 'Metal Fab', 33, ''),
  ('j2', 'FV Grimshaw Ret Wall Iron Rail', 'Metal Fab', 30, ''),
  ('j3', 'Platt Denning Family Room S&G', 'Metal Fab', 30, ''),
  ('j4', 'Platt Denning Great Room S&G', 'Metal Fab', 29, ''),
  ('j5', 'Dovetail Umami Hood', 'Metal Fab', 25, ''),
  ('j6', 'SL Coates Doors', 'Metal Fab', 32, ''),
  ('j7', 'FV Grimshaw Upper Porch Cable', 'Install', 31, ''),
  ('j8', 'Sadlon Meyers Steel Cladding', 'Install', 30, ''),
  ('j9', 'Hickory Grove Baptist Church', 'Stair', 20, ''),
  ('j10', 'DJ Salamon Shop-built', 'Stair', 15, ''),
  ('j11', 'Earnhardt Hood', 'Metal Fab', 7, ''),
  ('j12', 'CS Hess Exterior Rails', 'Install', 9, '')
on conflict (id) do nothing;
