-- Weekly family events (Quran class every Saturday, halaqa, sports).
alter table public.family_events add column if not exists repeats_weekly boolean not null default false;
