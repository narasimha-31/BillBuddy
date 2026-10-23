-- What the daily web lookups find. Public notices and headlines, shared by everyone: no shopper is in
-- these rows, and each shopper's matches are worked out from their own receipts when a page loads.
create table public.recalls (
	url text primary key,
	title text not null check (char_length(title) <= 300),
	published_on date,
	found_on date not null default current_date
);

create table public.price_news (
	product text not null,
	url text not null,
	title text not null check (char_length(title) <= 300),
	source text,
	published_on date,
	found_on date not null default current_date,
	primary key (product, url)
);

create index recalls_found on public.recalls (found_on);
create index price_news_found on public.price_news (product, found_on);

alter table public.recalls enable row level security;
alter table public.price_news enable row level security;

create policy "anyone signed in reads recalls" on public.recalls for select to authenticated using (true);
create policy "anyone signed in reads price news" on public.price_news for select to authenticated using (true);

grant select on public.recalls, public.price_news to authenticated;
grant select, insert, update, delete on public.recalls, public.price_news to service_role;

-- Products whose latest price is well above the one before, across every shopper, for the daily news
-- search. Names only, never who bought them.
create function public.products_gone_up(p_since date, p_rise numeric) returns table (product text, shoppers bigint)
language sql
stable
security definer
set search_path = ''
as $$
	with paid as (
		select r.user_id, p.name as product, r.purchased_on, lower(i.unit) as unit,
			coalesce(i.unit_price_cents, i.total_cents / nullif(i.quantity, 0)) as cents,
			row_number() over (partition by r.user_id, p.id order by r.purchased_on desc, i.id desc) as n
		from public.receipt_items i
		join public.receipts r on r.id = i.receipt_id
		join public.products p on p.id = i.product_id
		where r.status = 'saved' and i.kind = 'item' and r.purchased_on is not null
	)
	select now_paid.product, count(distinct now_paid.user_id)
	from paid now_paid
	join paid before_paid on before_paid.user_id = now_paid.user_id and before_paid.product = now_paid.product and before_paid.n = 2
		and before_paid.unit = now_paid.unit
	where now_paid.n = 1 and now_paid.purchased_on >= p_since and before_paid.cents > 0
		and now_paid.cents >= before_paid.cents * (1 + p_rise)
	group by now_paid.product
	order by 2 desc, 1
	limit 50;
$$;

revoke execute on function public.products_gone_up(date, numeric) from public, anon, authenticated;
grant execute on function public.products_gone_up(date, numeric) to service_role;
