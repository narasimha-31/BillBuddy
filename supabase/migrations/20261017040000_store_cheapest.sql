-- What a store is cheapest for, among things the shopper bought at more than one store: the latest
-- price there beats the latest price at every other store. Like with like: per pound with per pound.
-- Runs as the caller, so row level security keeps it to their own lines.
create function public.store_cheapest(p_store uuid, how_many int default 5)
returns table (name text, per text, cents int, next_cents int)
language sql
stable
security invoker
set search_path = ''
as $$
	with latest as (
		select distinct on (coalesce(p.name, i.name), r.store_id, case when i.unit = 'lb' then 'lb' else 'ea' end)
			coalesce(p.name, i.name) as name,
			r.store_id,
			case when i.unit = 'lb' then 'lb' else 'ea' end as per,
			coalesce(i.unit_price_cents, round(i.total_cents / nullif(i.quantity, 0)))::int as cents
		from public.receipt_items i
		join public.receipts r on r.id = i.receipt_id
		left join public.products p on p.id = i.product_id
		where i.kind = 'item' and i.name is not null and r.store_id is not null and r.status = 'saved'
		order by coalesce(p.name, i.name), r.store_id, case when i.unit = 'lb' then 'lb' else 'ea' end, r.purchased_on desc nulls last, i.id desc
	)
	select here.name, here.per, here.cents, min(other.cents)::int
	from latest here
	join latest other on other.name = here.name and other.per = here.per and other.store_id <> here.store_id
	where here.store_id = p_store and here.cents > 0 and other.cents > 0
	group by here.name, here.per, here.cents
	having here.cents < min(other.cents)
	order by (min(other.cents) - here.cents)::numeric / min(other.cents) desc, here.name
	limit least(greatest(how_many, 1), 20);
$$;

revoke all on function public.store_cheapest(uuid, int) from public, anon;
grant execute on function public.store_cheapest(uuid, int) to authenticated;
