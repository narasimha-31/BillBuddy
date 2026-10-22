-- The shopper's own shopping list, kept on the account so it is the same on every device
alter table public.user_settings
	add column shopping_list text[] not null default '{}' check (cardinality(shopping_list) <= 60);

-- The last price paid for each listed item at each store, matched to the shared product name and
-- ignoring case. Runs as the caller, so row level security keeps it to the caller's own lines.
create function public.my_list_prices(names text[])
returns table (name text, store text, per text, cents int, bought_on date)
language sql
stable
security invoker
set search_path = ''
as $$
	select distinct on (lower(coalesce(p.name, i.name)), s.name)
		coalesce(p.name, i.name),
		s.name,
		case when i.unit = 'lb' then 'lb' else 'ea' end,
		coalesce(i.unit_price_cents, round(i.total_cents / nullif(i.quantity, 0)))::int,
		r.purchased_on
	from public.receipt_items i
	join public.receipts r on r.id = i.receipt_id
	join public.stores s on s.id = r.store_id
	left join public.products p on p.id = i.product_id
	where i.kind = 'item'
		and lower(coalesce(p.name, i.name)) = any (select lower(n) from unnest(names) n)
		and coalesce(i.unit_price_cents, round(i.total_cents / nullif(i.quantity, 0))) > 0
	order by lower(coalesce(p.name, i.name)), s.name, r.purchased_on desc nulls last, i.id desc;
$$;

revoke all on function public.my_list_prices(text[]) from public, anon;
grant execute on function public.my_list_prices(text[]) to authenticated;
