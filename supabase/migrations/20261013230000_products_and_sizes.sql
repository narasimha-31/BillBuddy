-- An item's name is now the generic product every store shares ("Whole milk"), with brand and
-- pack size kept apart, so the same product groups together across stores.
alter table public.receipt_items
	add column size_amount numeric(10, 3) check (size_amount > 0 and size_amount < 100000),
	add column size_unit text check (size_unit in ('oz', 'fl oz', 'lb', 'g', 'kg', 'gal', 'l', 'ml', 'ct'));

alter table public.name_memory
	add column size_amount numeric(10, 3) check (size_amount > 0 and size_amount < 100000),
	add column size_unit text check (size_unit in ('oz', 'fl oz', 'lb', 'g', 'kg', 'gal', 'l', 'ml', 'ct'));

-- Each product the caller has bought, once, most bought first. Runs as the caller, so row level
-- security limits it to their own items; it never needs to see anyone else's.
create function public.my_products() returns table (name text, times bigint, last_bought date, stores bigint)
language sql
stable
security invoker
set search_path = ''
as $$
	select i.name, count(*), max(r.purchased_on), count(distinct r.store_id)
	from public.receipt_items i
	join public.receipts r on r.id = i.receipt_id
	where i.kind = 'item' and i.name is not null
	group by i.name
	order by count(*) desc, max(r.purchased_on) desc nulls last, i.name;
$$;

revoke all on function public.my_products() from public, anon;
grant execute on function public.my_products() to authenticated;
