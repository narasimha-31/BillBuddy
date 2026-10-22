-- Light, dark or the device's choice, and one of four colour themes
alter table public.user_settings
	add column color_mode text not null default 'light' check (color_mode in ('light', 'dark', 'auto')),
	add column theme text not null default 'green' check (theme in ('green', 'ocean', 'sunset', 'grape'));
