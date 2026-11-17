-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- The whole file is safe to run more than once: every statement either
-- checks first ("if not exists") or skips rows that are already there.

-- ---------- 1. GAMES ----------
-- One row per game.
create table if not exists games (
    id    bigint generated always as identity primary key,
    name  text    not null unique,
    yaw   numeric not null check (yaw > 0),
    notes text
);

-- calc_type tells the website which games need special handling.
--   'standard' = one sensitivity number (most games)
--   'siege'    = whole-number slider, settings file multipliers, scopes
alter table games
    add column if not exists calc_type text not null default 'standard';

alter table games drop constraint if exists games_calc_type_check;
alter table games
    add constraint games_calc_type_check check (calc_type in ('standard', 'siege'));

-- TODO: verify every yaw against a trusted source before launch.
insert into games (name, yaw) values
    ('CS2',          0.022),
    ('Valorant',     0.07),
    ('Apex Legends', 0.022),
    ('Overwatch 2',  0.0066),
    ('Fortnite',     0.005555)
on conflict (name) do nothing;

-- Rainbow Six Siege. yaw is degrees per mouse count for each point of the
-- hip-fire slider at the default settings file multiplier (0.02).
-- 0.00572958 is a community-measured value, not published by Ubisoft.
insert into games (name, yaw, calc_type, notes) values
    ('Rainbow Six Siege', 0.00572958, 'siege',
     'Hip-fire slider from 1 to 100, plus scope settings')
on conflict (name) do update
    set yaw = excluded.yaw,
        calc_type = excluded.calc_type,
        notes = excluded.notes;

-- ---------- 2. SCOPES ----------
-- One row per scope. game_id points at a row in games (a "foreign key"),
-- so a scope always belongs to a real game.
create table if not exists game_scopes (
    id             bigint generated always as identity primary key,
    game_id        bigint  not null references games (id) on delete cascade,
    label          text    not null,
    fov_multiplier numeric not null check (fov_multiplier > 0),
    sort_order     int     not null,
    unique (game_id, label)
);

-- FOV multipliers from Ubisoft's "Guide to ADS Sensitivity in Y5S3" (2020).
-- "select ... from games where name = ..." looks up Siege's id for us.
insert into game_scopes (game_id, label, fov_multiplier, sort_order)
select games.id, scope.label, scope.fov_multiplier, scope.sort_order
from games
cross join (values
    ('1.0x',  0.9,   1),
    ('1.5x',  0.59,  2),
    ('2.0x',  0.49,  3),
    ('2.5x',  0.42,  4),
    ('3.0x',  0.35,  5),
    ('4.0x',  0.3,   6),
    ('5.0x',  0.22,  7),
    ('12.0x', 0.092, 8)
) as scope (label, fov_multiplier, sort_order)
where games.name = 'Rainbow Six Siege'
on conflict (game_id, label) do update
    set fov_multiplier = excluded.fov_multiplier,
        sort_order = excluded.sort_order;

-- ---------- 3. SECURITY ----------
-- With Row Level Security on and no policy, NOBODY can read or write via the API.
alter table games enable row level security;
alter table game_scopes enable row level security;

-- Allow everyone (including the public key) to READ only.
-- No insert/update/delete policy exists, so writes are rejected.
drop policy if exists "Anyone can read games" on games;
create policy "Anyone can read games"
    on games for select
    using (true);

drop policy if exists "Anyone can read game scopes" on game_scopes;
create policy "Anyone can read game scopes"
    on game_scopes for select
    using (true);
