-- receipts: totals, processing state and a fingerprint to catch the same photo twice
alter table public.receipts
	add column subtotal_cents integer check (subtotal_cents >= 0),
	add column tax_cents integer check (tax_cents >= 0),
	add column status text not null default 'pending'
		check (status in ('pending', 'processing', 'review', 'saved', 'failed')),
	add column image_hash text check (image_hash ~ '^[0-9a-f]{64}$'),
	add unique (id, user_id),
	add unique (user_id, image_hash);

-- one row per printed line; there are deliberately no columns for card or payment details
create table public.receipt_items (
	id uuid primary key default gen_random_uuid(),
	receipt_id uuid not null,
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	position smallint not null check (position >= 0),
	kind text not null default 'item' check (kind in ('item', 'discount')),
	raw_text text not null check (char_length(raw_text) between 1 and 120),
	name text check (char_length(name) between 1 and 120),
	brand text check (char_length(brand) <= 60),
	category text check (char_length(category) <= 40),
	quantity numeric(10, 3) not null default 1 check (quantity > 0),
	unit text not null default 'ea' check (unit in ('ea', 'lb', 'oz', 'kg', 'g', 'gal', 'l', 'ct')),
	unit_price_cents integer check (unit_price_cents >= 0),
	total_cents integer not null check (kind = 'discount' or total_cents >= 0),
	created_at timestamptz not null default now(),
	unique (receipt_id, position),
	foreign key (receipt_id, user_id) references public.receipts (id, user_id) on delete cascade
);

create index receipt_items_user_name on public.receipt_items (user_id, name);

-- what a receipt abbreviation turned out to be, per user and store, so repeat lines skip the AI
create table public.name_memory (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	store_id uuid,
	raw_text text not null check (char_length(raw_text) between 1 and 120),
	name text not null check (char_length(name) between 1 and 120),
	brand text check (char_length(brand) <= 60),
	category text check (char_length(category) <= 40),
	updated_at timestamptz not null default now(),
	unique nulls not distinct (user_id, store_id, raw_text),
	foreign key (store_id, user_id) references public.stores (id, user_id) on delete cascade
);

-- what each user agreed to keep; everything optional starts switched off
create table public.user_settings (
	user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
	keep_store_name boolean not null default false,
	keep_store_location boolean not null default false,
	keep_photos boolean not null default false,
	zip_code text check (zip_code ~ '^[0-9]{5}$'),
	updated_at timestamptz not null default now()
);

alter table public.receipt_items enable row level security;
alter table public.name_memory enable row level security;
alter table public.user_settings enable row level security;

create policy "own items" on public.receipt_items
	for all to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

create policy "own name memory" on public.name_memory
	for all to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

create policy "own settings" on public.user_settings
	for all to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

revoke all on public.receipt_items, public.name_memory, public.user_settings from anon;
grant select, insert, update, delete on public.receipt_items, public.name_memory, public.user_settings
	to authenticated, service_role;
