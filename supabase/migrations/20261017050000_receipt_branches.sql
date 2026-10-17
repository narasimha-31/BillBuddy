-- A store is a name ("Walmart"); a branch is where one receipt was bought. Each receipt keeps its own
-- branch: printed on it, or, with no address printed, a guess the shopper can correct. Receipts within
-- about 100 m of each other are the same branch.
alter table public.stores
	drop constraint stores_place_whole,
	drop column address,
	drop column lat,
	drop column lng,
	drop column place_source,
	drop column place_sure;

alter table public.receipts
	add column branch_guess boolean not null default false,
	add column branch_key text generated always as (
		case when store_lat is null or store_lng is null then null
		else round(store_lat::numeric, 3)::text || ',' || round(store_lng::numeric, 3)::text end
	) stored;

drop function public.my_store_places();

-- the shopper's stores by name, for the usual store and the Settings list
create function public.my_store_places()
returns table (id uuid, name text, visits bigint)
language sql
stable
security invoker
set search_path = ''
as $$
	select s.id, s.name, count(*)
	from public.receipts r
	join public.stores s on s.id = r.store_id
	where r.user_id = (select auth.uid()) and r.status = 'saved'
	group by s.id, s.name
$$;

revoke all on function public.my_store_places() from public, anon;
grant execute on function public.my_store_places() to authenticated;

-- every branch the shopper has a receipt from: one row per store and place
create function public.my_branches()
returns table (store_id uuid, name text, branch_key text, lat double precision, lng double precision, address text, visits bigint, last_visit date, guess boolean)
language sql
stable
security invoker
set search_path = ''
as $$
	select
		r.store_id,
		s.name,
		r.branch_key,
		avg(r.store_lat),
		avg(r.store_lng),
		(array_agg(r.store_address order by r.branch_guess, r.purchased_on desc nulls last) filter (where r.store_address is not null))[1],
		count(*),
		max(r.purchased_on),
		bool_and(r.branch_guess)
	from public.receipts r
	join public.stores s on s.id = r.store_id
	where r.user_id = (select auth.uid()) and r.status = 'saved' and r.branch_key is not null
	group by r.store_id, s.name, r.branch_key
$$;

revoke all on function public.my_branches() from public, anon;
grant execute on function public.my_branches() to authenticated;
