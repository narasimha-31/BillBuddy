-- Where each of the shopper's stores is, for the map. A receipt's printed address still wins; this
-- fills in stores whose receipts had none: a branch OpenStreetMap suggests near the shopper's ZIP
-- (sure = false until they say yes) or an address they typed (sure = true).
alter table public.stores
	add column address text check (char_length(address) <= 200),
	add column lat double precision check (lat between 18 and 72),
	add column lng double precision check (lng between -180 and -64),
	add column place_source text check (place_source in ('map', 'typed')),
	add column place_sure boolean not null default false,
	add constraint stores_place_whole check ((lat is null) = (lng is null) and (lat is null) = (place_source is null));

drop function public.my_store_places();

create function public.my_store_places()
returns table (id uuid, name text, visits bigint, lat double precision, lng double precision, address text, source text, sure boolean)
language sql
stable
security invoker
set search_path = ''
as $$
	with printed as (
		select
			r.store_id,
			count(*) as visits,
			(array_agg(r.store_lat order by r.purchased_on desc nulls last, r.created_at desc) filter (where r.store_lat is not null))[1] as lat,
			(array_agg(r.store_lng order by r.purchased_on desc nulls last, r.created_at desc) filter (where r.store_lat is not null))[1] as lng,
			(array_agg(r.store_address order by r.purchased_on desc nulls last, r.created_at desc) filter (where r.store_lat is not null))[1] as address
		from public.receipts r
		where r.user_id = (select auth.uid()) and r.status = 'saved' and r.store_id is not null
		group by r.store_id
	)
	select
		s.id,
		s.name,
		p.visits,
		coalesce(p.lat, s.lat),
		coalesce(p.lng, s.lng),
		coalesce(p.address, s.address),
		case when p.lat is not null then 'receipt' else s.place_source end,
		p.lat is not null or s.place_sure
	from printed p
	join public.stores s on s.id = p.store_id
$$;

revoke all on function public.my_store_places() from public, anon;
grant execute on function public.my_store_places() to authenticated;
