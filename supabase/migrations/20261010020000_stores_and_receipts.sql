create table public.stores (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	name text not null check (char_length(name) between 1 and 120),
	created_at timestamptz not null default now(),
	unique (id, user_id)
);

create unique index stores_user_name on public.stores (user_id, lower(name));

create table public.receipts (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	store_id uuid,
	purchased_on date,
	total_cents integer check (total_cents >= 0),
	currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
	image_path text,
	created_at timestamptz not null default now(),
	-- a receipt can only point at a store owned by the same user
	foreign key (store_id, user_id) references public.stores (id, user_id) on delete set null (store_id)
);

create index receipts_user_purchased on public.receipts (user_id, purchased_on desc);

alter table public.stores enable row level security;
alter table public.receipts enable row level security;

create policy "own stores" on public.stores
	for all to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

create policy "own receipts" on public.receipts
	for all to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

revoke all on public.stores, public.receipts from anon;
grant select, insert, update, delete on public.stores, public.receipts to authenticated;
