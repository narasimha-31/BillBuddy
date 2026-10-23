-- Shoppers keep several lists, each with its own name ("Gym", "Keto week"). The one list there was
-- becomes "My list".
create table public.shopping_lists (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	name text not null check (char_length(btrim(name)) between 1 and 30),
	items text[] not null default '{}' check (cardinality(items) <= 60 and pg_column_size(items) <= 8000),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index shopping_lists_user on public.shopping_lists (user_id, created_at);

alter table public.shopping_lists enable row level security;

create policy "own lists" on public.shopping_lists for all to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

-- ten lists each; the lock stops two inserts at once from both slipping under
create function public.limit_shopping_lists() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	perform pg_advisory_xact_lock(hashtext('shopping_lists' || new.user_id::text));
	if (select count(*) from public.shopping_lists where user_id = new.user_id) >= 10 then
		raise exception 'list limit' using errcode = 'P0001';
	end if;
	return new;
end;
$$;

revoke execute on function public.limit_shopping_lists() from public, anon, authenticated;

create trigger limit_shopping_lists before insert on public.shopping_lists
	for each row execute function public.limit_shopping_lists();

insert into public.shopping_lists (user_id, name, items)
select user_id, 'My list', shopping_list from public.user_settings where cardinality(shopping_list) > 0;
