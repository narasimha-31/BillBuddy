-- Lines group by their shared product, so "Tomatoes" from one store and "Roma tomatoes" from another
-- are one price history; a line with no product yet keeps its own name. maybe_same is the product a
-- line might be, for the "Same as ...?" question. Both run as the caller, so row level security
-- keeps them to the caller's own lines.
drop function public.my_products();

create function public.my_products()
returns table (name text, times bigint, last_bought date, stores bigint, category text, maybe_same text)
language sql
stable
security invoker
set search_path = ''
as $$
	select
		coalesce(p.name, i.name),
		count(*),
		max(r.purchased_on),
		count(distinct r.store_id),
		mode() within group (order by i.category),
		min(m.name) filter (where m.name <> coalesce(p.name, i.name))
	from public.receipt_items i
	join public.receipts r on r.id = i.receipt_id
	left join public.products p on p.id = i.product_id
	left join public.products m on m.id = i.maybe_product_id
	where i.kind = 'item' and i.name is not null
	group by 1
	order by 2 desc, 3 desc nulls last, 1;
$$;

revoke all on function public.my_products() from public, anon;
grant execute on function public.my_products() to authenticated;

create or replace function public.my_price_changes(how_many int default 5)
returns table (name text, per text, now_cents int, before_cents int, store text, before_store text, bought_on date)
language sql
stable
security invoker
set search_path = ''
as $$
	with paid as (
		select
			coalesce(p.name, i.name) as name,
			case when i.unit = 'lb' then 'lb' else 'ea' end as per,
			coalesce(i.unit_price_cents, round(i.total_cents / nullif(i.quantity, 0)))::int as cents,
			r.purchased_on,
			s.name as store,
			row_number() over (partition by coalesce(p.name, i.name) order by r.purchased_on desc, i.id) as n
		from public.receipt_items i
		join public.receipts r on r.id = i.receipt_id
		left join public.stores s on s.id = r.store_id
		left join public.products p on p.id = i.product_id
		where i.kind = 'item' and i.name is not null and r.purchased_on is not null
	)
	select a.name, a.per, a.cents, b.cents, a.store, b.store, a.purchased_on
	from paid a
	join paid b on b.name = a.name and b.n = 2 and b.per = a.per
	where a.n = 1 and a.cents > 0 and b.cents > 0 and a.cents <> b.cents
	order by abs(a.cents - b.cents)::numeric / b.cents desc, a.purchased_on desc, a.name
	limit least(greatest(how_many, 1), 20);
$$;
