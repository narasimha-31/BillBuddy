-- One shared list of generic products ("Bananas"), each with an embedding of its name, so the
-- same product groups together whatever a receipt or the model called it. Only the generic name
-- is shared; who bought what, where and for how much stays in receipt_items behind row level security.
create extension if not exists vector with schema extensions;

create table public.products (
	id uuid primary key default gen_random_uuid(),
	name text not null check (length(name) between 1 and 80),
	embedding extensions.vector(1024) not null,
	created_at timestamptz not null default now()
);

create unique index products_name_key on public.products (lower(name));
create index products_embedding on public.products using hnsw (embedding extensions.vector_cosine_ops);

-- everyone signed in can read the list; only the server adds to it
alter table public.products enable row level security;
create policy "products are readable by signed-in people" on public.products for select to authenticated using (true);

-- the product a line belongs to, and the one it might be when the match was not certain
alter table public.receipt_items
	add column product_id uuid references public.products (id) on delete set null,
	add column maybe_product_id uuid references public.products (id) on delete set null;

create index receipt_items_product on public.receipt_items (user_id, product_id);

-- the closest products to an embedding, most similar first
create function public.nearest_products(p_embedding extensions.vector(1024), p_count int default 5)
returns table (id uuid, name text, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
	select p.id, p.name, 1 - (p.embedding operator(extensions.<=>) p_embedding)
	from public.products p
	order by p.embedding operator(extensions.<=>) p_embedding
	limit least(greatest(p_count, 1), 10);
$$;

revoke all on function public.nearest_products(extensions.vector, int) from public, anon, authenticated;
grant execute on function public.nearest_products(extensions.vector, int) to service_role;
