-- my_products also says which aisle each product belongs to, the category it was given most often
drop function public.my_products();

create function public.my_products() returns table (name text, times bigint, last_bought date, stores bigint, category text)
language sql
stable
security invoker
set search_path = ''
as $$
	select i.name, count(*), max(r.purchased_on), count(distinct r.store_id), mode() within group (order by i.category)
	from public.receipt_items i
	join public.receipts r on r.id = i.receipt_id
	where i.kind = 'item' and i.name is not null
	group by i.name
	order by count(*) desc, max(r.purchased_on) desc nulls last, i.name;
$$;

revoke all on function public.my_products() from public, anon;
grant execute on function public.my_products() to authenticated;
