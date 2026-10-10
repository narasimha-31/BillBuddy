-- Limits live in the database so they also hold for anyone calling the API directly,
-- not just through the app. created_at is stamped here so receipts cannot be backdated
-- to slip under the counts; only the server's service role may set it (seed and tests).
create function public.enforce_receipt_limits() returns trigger
language plpgsql
set search_path = ''
as $$
declare
	last_minute integer;
	last_day integer;
	last_month integer;
begin
	if auth.role() is distinct from 'service_role' then
		new.created_at := now();
	end if;

	select
		count(*) filter (where created_at > now() - interval '1 minute'),
		count(*) filter (where created_at > now() - interval '1 day'),
		count(*) filter (where created_at > now() - interval '30 days')
	into last_minute, last_day, last_month
	from public.receipts
	where user_id = new.user_id;

	if last_minute >= 10 then
		raise exception 'receipt limit: too many at once' using errcode = 'P0001';
	elsif last_day >= 20 then
		raise exception 'receipt limit: daily' using errcode = 'P0001';
	elsif last_month >= 200 then
		raise exception 'receipt limit: monthly' using errcode = 'P0001';
	end if;

	return new;
end;
$$;

create trigger receipts_limits
	before insert on public.receipts
	for each row execute function public.enforce_receipt_limits();

-- photo uploads get their own daily ceiling, a little above the receipt limit for retries
drop policy "upload own receipt photos" on storage.objects;

create policy "upload own receipt photos" on storage.objects
	for insert to authenticated
	with check (
		bucket_id = 'receipts'
		and (storage.foldername(name))[1] = (select auth.uid())::text
		and (
			select count(*) from storage.objects o
			where o.bucket_id = 'receipts'
				and o.owner_id = (select auth.uid())::text
				and o.created_at > now() - interval '1 day'
		) < 25
	);
