-- The products whose price moved the most between the caller's last two purchases, compared
-- per pound for weighed items and each for the rest. Runs as the caller, so row level security
-- keeps it to their own items.
create function public.my_price_changes(how_many int default 5)
returns table (name text, per text, now_cents int, before_cents int, store text, before_store text, bought_on date)
language sql
stable
security invoker
set search_path = ''
as $$
	with paid as (
		select
			i.name,
			case when i.unit = 'lb' then 'lb' else 'ea' end as per,
			coalesce(i.unit_price_cents, round(i.total_cents / nullif(i.quantity, 0)))::int as cents,
			r.purchased_on,
			s.name as store,
			row_number() over (partition by i.name order by r.purchased_on desc, i.id) as n
		from public.receipt_items i
		join public.receipts r on r.id = i.receipt_id
		left join public.stores s on s.id = r.store_id
		where i.kind = 'item' and i.name is not null and r.purchased_on is not null
	)
	select a.name, a.per, a.cents, b.cents, a.store, b.store, a.purchased_on
	from paid a
	join paid b on b.name = a.name and b.n = 2 and b.per = a.per
	where a.n = 1 and a.cents > 0 and b.cents > 0 and a.cents <> b.cents
	order by abs(a.cents - b.cents)::numeric / b.cents desc, a.purchased_on desc, a.name
	limit least(greatest(how_many, 1), 20);
$$;

revoke all on function public.my_price_changes(int) from public, anon;
grant execute on function public.my_price_changes(int) to authenticated;
