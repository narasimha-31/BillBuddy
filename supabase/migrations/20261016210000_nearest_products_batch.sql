-- The nearest products for every new name on a receipt in one round trip: each embedding walks the
-- HNSW index for its few closest products, and anything below the floor is left out.
create function public.nearest_products_batch(p_embeddings text[], p_count int default 3, p_floor double precision default 0.8)
returns table (slot int, id uuid, name text, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
	select (e.ord - 1)::int, n.id, n.name, n.similarity
	from unnest(p_embeddings) with ordinality as e(vec, ord)
	cross join lateral (
		select p.id, p.name, 1 - (p.embedding operator(extensions.<=>) e.vec::extensions.vector) as similarity
		from public.products p
		order by p.embedding operator(extensions.<=>) e.vec::extensions.vector
		limit least(greatest(p_count, 1), 10)
	) n
	where n.similarity >= p_floor
	order by 1, n.similarity desc;
$$;

revoke all on function public.nearest_products_batch(text[], int, double precision) from public, anon, authenticated;
grant execute on function public.nearest_products_batch(text[], int, double precision) to service_role;
