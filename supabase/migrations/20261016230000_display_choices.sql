-- How the shopper wants the app drawn: text size, more contrast, and a palette for colour blindness
alter table public.user_settings
	add column text_size text not null default 'standard' check (text_size in ('standard', 'large', 'larger')),
	add column more_contrast boolean not null default false,
	add column palette text not null default 'standard' check (palette in ('standard', 'colorblind'));
