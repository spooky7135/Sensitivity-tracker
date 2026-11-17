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
--   'minecraft' = percentage slider on a curve (not a fixed yaw)
alter table games
    add column if not exists calc_type text not null default 'standard';

alter table games drop constraint if exists games_calc_type_check;
alter table games
    add constraint games_calc_type_check
    check (calc_type in ('standard', 'siege', 'minecraft'));

-- Where each yaw came from, for reference. Not shown on the site.
alter table games add column if not exists source text;

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

-- More games (added 2026-11-16). Each yaw has at least one published source:
--   KM = keymap.io/sensitivity-converter
--   SM = sensitivitymatch.com/methodology
--   UM = ultimatemove.eu sensitivity converter
--   AG = github.com/Alpherg951/fps-sensitivity-converter
-- Games whose sources disagree, or that have no published value, are left out.
insert into games (name, yaw, source) values
    -- Source, GoldSrc and id Tech engines all use 0.022
    ('Counter-Strike: Global Offensive', 0.022, 'KM, SM, UM'),
    ('Counter-Strike: Source',           0.022, 'KM, SM'),
    ('Counter-Strike 1.6',               0.022, 'KM, SM'),
    ('Team Fortress 2',                  0.022, 'KM, SM, UM'),
    ('Titanfall 2',                      0.022, 'KM, SM'),
    ('Titanfall',                        0.022, 'SM'),
    ('Left 4 Dead 2',                    0.022, 'KM, SM'),
    ('Left 4 Dead',                      0.022, 'SM'),
    ('Garry''s Mod',                     0.022, 'KM, SM'),
    ('Half-Life',                        0.022, 'KM, SM'),
    ('Half-Life 2',                      0.022, 'KM, SM'),
    ('Portal 2',                         0.022, 'KM, SM'),
    ('Black Mesa',                       0.022, 'KM, SM'),
    ('Day of Defeat: Source',            0.022, 'KM, SM'),
    ('Insurgency (2014)',                0.022, 'KM'),
    ('Quake Champions',                  0.022, 'KM, SM, UM'),
    ('Quake Live',                       0.022, 'KM, SM, UM'),
    ('Quake III Arena',                  0.022, 'KM, SM'),
    ('Wolfenstein: Enemy Territory',     0.022, 'KM'),
    ('Xonotic',                          0.022, 'KM'),
    ('DOOM Eternal',                     0.022, 'KM'),
    ('DOOM: The Dark Ages',              0.022, 'KM'),
    ('KovaaK''s',                        0.022, 'KM, SM, UM'),
    ('Farlight 84',                      0.022, 'KM, SM'),

    -- Call of Duty
    ('Call of Duty: Warzone',                    0.0066, 'KM, SM, UM, AG'),
    ('Call of Duty: Modern Warfare (2019)',      0.0066, 'AG'),
    ('Call of Duty: Modern Warfare II (2022)',   0.0066, 'KM, SM'),
    ('Call of Duty: Modern Warfare III (2023)',  0.0066, 'KM, SM'),
    ('Call of Duty: Black Ops 6',                0.0066, 'KM, SM, AG'),
    ('Call of Duty: Black Ops 7',                0.0066, 'KM, SM'),
    ('Call of Duty: Modern Warfare 4',           0.0066, 'KM, SM'),
    ('Call of Duty 4: Modern Warfare (2007)',    0.022,  'KM'),
    ('Call of Duty: WWII',                       0.022,  'KM'),

    -- Everything else
    ('Destiny 2',                0.0066,     'KM, SM, AG'),
    ('Escape from Tarkov',       0.125,      'KM, SM'),
    ('Rust',                     0.1125,     'KM, SM'),
    ('Arena Breakout: Infinite', 0.102375,   'KM'),
    ('Roblox',                   0.39783,    'SM; KM gives 0.397896'),
    ('Roblox RIVALS',            0.005,      'SM'),
    ('Marvel Rivals',            0.0175,     'KM, SM; UM gives 0.017453'),
    ('Halo Infinite',            0.02222,    'SM; KM gives 0.0225'),
    ('Krunker',                  0.13751,    'KM'),
    ('Hunt: Showdown 1896',      0.0429718,  'KM'),
    ('Insurgency: Sandstorm',    0.14,       'KM'),
    ('Squad',                    0.174983,   'KM'),
    ('DayZ',                     0.178571,   'KM'),
    ('Cyberpunk 2077',           0.01,       'KM'),
    ('SMITE 2',                  0.00732422, 'KM'),
    ('BattleBit Remastered',     0.0005,     'KM'),
    ('Gray Zone Warfare',        0.063,      'KM'),
    ('Splitgate 2',              0.0111727,  'KM'),
    ('Strinova',                 0.0138819,  'KM'),
    ('FragPunk',                 0.05555,    'KM'),
    ('Blood Strike',             0.00143239, 'KM'),
    ('Combat Master',            0.001,      'KM'),
    ('Warface',                  0.00333,    'KM'),
    ('Black Squad',              0.00549316, 'KM'),
    ('Borderlands 2',            0.00549316, 'KM'),
    ('Borderlands 3',            0.00700389, 'KM'),
    ('Dying Light 2',            0.00833333, 'KM'),
    ('Valheim',                  0.05,       'KM'),
    ('7 Days to Die',            0.25,       'KM'),
    ('ARK: Survival Evolved',    0.17498,    'KM'),
    ('Risk of Rain 2',           0.5,        'KM'),
    ('3D Aim Trainer',           0.0066,     'KM'),
    ('1v1.LOL',                  0.00605216, 'KM'),
    ('Redmatch 2',               0.05,       'KM'),
    ('STRAFTAT',                 0.1,        'KM')
on conflict (name) do nothing;

-- Minecraft: the slider is a percentage on a curve, so the website does the
-- maths itself. yaw here is the value at 100%, used only on the games page.
insert into games (name, yaw, calc_type, notes, source) values
    ('Minecraft (Java Edition)', 0.15, 'minecraft',
     'Percentage slider from 0 to 200%, on a curve', 'KM')
on conflict (name) do update
    set yaw = excluded.yaw,
        calc_type = excluded.calc_type,
        notes = excluded.notes,
        source = excluded.source;

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
