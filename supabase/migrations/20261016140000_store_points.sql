-- where the store printed on a receipt is, from its printed address. Only ever set alongside
-- store_address, so it follows the same keep_store_location consent and is cleared with it.
alter table public.receipts
	add column store_lat double precision check (store_lat between 18 and 72),
	add column store_lng double precision check (store_lng between -180 and -64),
	add constraint store_point_whole check ((store_lat is null) = (store_lng is null)),
	add constraint store_point_needs_address check (store_lat is null or store_address is not null);

-- each store the shopper has receipts from: how often they went, and the map point of the
-- branch they went to most recently, if one is known
create function public.my_store_places()
returns table (name text, visits bigint, lat double precision, lng double precision)
language sql
stable
security invoker
set search_path = ''
as $$
	select
		s.name,
		count(*) as visits,
		(array_agg(r.store_lat order by r.purchased_on desc nulls last, r.created_at desc) filter (where r.store_lat is not null))[1],
		(array_agg(r.store_lng order by r.purchased_on desc nulls last, r.created_at desc) filter (where r.store_lng is not null))[1]
	from public.receipts r
	join public.stores s on s.id = r.store_id
	where r.user_id = (select auth.uid()) and r.status = 'saved'
	group by s.name
$$;

revoke all on function public.my_store_places() from public, anon;
grant execute on function public.my_store_places() to authenticated;
