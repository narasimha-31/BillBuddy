-- each change also carries its last six purchases (newest first) for the short history under the row
drop function public.my_price_changes(int);

create function public.my_price_changes(how_many int default 5)
returns table (
	name text, per text, now_cents int, before_cents int, store text, before_store text, bought_on date,
	before_on date, now_receipt uuid, now_item uuid, before_receipt uuid, before_item uuid, history jsonb
)
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
			r.id as receipt_id,
			i.id as item_id,
			row_number() over (partition by coalesce(p.name, i.name) order by r.purchased_on desc, i.id) as n
		from public.receipt_items i
		join public.receipts r on r.id = i.receipt_id
		left join public.stores s on s.id = r.store_id
		left join public.products p on p.id = i.product_id
		where i.kind = 'item' and i.name is not null and r.purchased_on is not null
	),
	recent as (
		select name, per, jsonb_agg(jsonb_build_object('on', purchased_on, 'store', store, 'cents', cents, 'receipt', receipt_id, 'item', item_id) order by n) as history
		from paid
		where n <= 6 and cents > 0
		group by name, per
	)
	select a.name, a.per, a.cents, b.cents, a.store, b.store, a.purchased_on,
		b.purchased_on, a.receipt_id, a.item_id, b.receipt_id, b.item_id, h.history
	from paid a
	join paid b on b.name = a.name and b.n = 2 and b.per = a.per
	join recent h on h.name = a.name and h.per = a.per
	where a.n = 1 and a.cents > 0 and b.cents > 0 and a.cents <> b.cents
	order by abs(a.cents - b.cents)::numeric / b.cents desc, a.purchased_on desc, a.name
	limit least(greatest(how_many, 1), 20);
$$;

revoke all on function public.my_price_changes(int) from public, anon;
grant execute on function public.my_price_changes(int) to authenticated;
