-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- 1. The table: one row per game.
create table if not exists games (
    id    bigint generated always as identity primary key,
    name  text    not null unique,
    yaw   numeric not null check (yaw > 0),
    notes text
);

-- 2. Seed data.
-- TODO: verify every yaw against a trusted source before launch.
insert into games (name, yaw) values
    ('CS2',          0.022),
    ('Valorant',     0.07),
    ('Apex Legends', 0.022),
    ('Overwatch 2',  0.0066),
    ('Fortnite',     0.005555)
on conflict (name) do nothing;

-- 3. Security: turn on Row Level Security.
-- With RLS on and no policy, NOBODY can read or write via the API.
alter table games enable row level security;

-- 4. Allow everyone (including the public anon key) to READ only.
-- No insert/update/delete policy exists, so writes are rejected.
create policy "Anyone can read games"
    on games for select
    using (true);
