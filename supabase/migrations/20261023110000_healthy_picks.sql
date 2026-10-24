-- Healthy foods found by the daily web search on nutrition sites, shared by everyone. `diet` is the
-- strictest diet a food fits: vegan foods suit everyone, vegetarian ones suit all but vegans.
create table public.healthy_foods (
	name text primary key check (char_length(name) between 1 and 60),
	why text not null check (char_length(why) between 1 and 220),
	diet text not null check (diet in ('vegan', 'vegetarian', 'meat')),
	category text not null check (char_length(category) <= 40),
	source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 500),
	source text not null check (char_length(source) <= 80),
	found_on date not null default current_date
);

alter table public.healthy_foods enable row level security;
create policy "anyone signed in reads healthy foods" on public.healthy_foods for select to authenticated using (true);
grant select on public.healthy_foods to authenticated;
grant select, insert, update, delete on public.healthy_foods to service_role;

-- What each shopper eats, asked once, and the healthy picks they have been shown, so none repeats.
alter table public.user_settings
	add column diet text check (diet in ('vegan', 'vegetarian', 'meat')),
	add column healthy_pick text check (char_length(healthy_pick) <= 60),
	add column healthy_pick_on date,
	add column healthy_seen text[] not null default '{}' check (cardinality(healthy_seen) <= 500);
