-- The first-visit tour of Home: shown until the shopper finishes or skips it
alter table public.user_settings add column tour_seen boolean not null default false;
