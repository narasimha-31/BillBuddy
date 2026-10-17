-- The aisle a shopper chose for a shared product. It is theirs alone: it moves their own lines and
-- every later line of that product they buy, and never what another shopper sees.
create table public.my_aisles (
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete cascade,
	aisle text not null check (aisle in ('Produce', 'Meat & seafood', 'Dairy & eggs', 'Bakery', 'Pantry', 'Frozen', 'Snacks', 'Beverages', 'Household', 'Personal care', 'Baby', 'Pet', 'Alcohol', 'Other')),
	updated_at timestamptz not null default now(),
	primary key (user_id, product_id)
);

alter table public.my_aisles enable row level security;

create policy "own aisles" on public.my_aisles
	for all to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

revoke all on public.my_aisles from anon;
grant select, insert, update, delete on public.my_aisles to authenticated, service_role;
