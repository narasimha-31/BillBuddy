-- Tighter limits for a small AI budget: 5 receipts a minute, 10 a day, 100 in 30 days per person,
-- 10 photos per phone code and 12 photos a day.
create or replace function public.enforce_receipt_limits() returns trigger
language plpgsql
security definer
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
	from public.upload_log
	where user_id = new.user_id;

	if last_minute >= 5 then
		raise exception 'receipt limit: too many at once' using errcode = 'P0001';
	elsif last_day >= 10 then
		raise exception 'receipt limit: daily' using errcode = 'P0001';
	elsif last_month >= 100 then
		raise exception 'receipt limit: monthly' using errcode = 'P0001';
	end if;

	insert into public.upload_log (user_id, created_at) values (new.user_id, new.created_at);
	return new;
end;
$$;

create or replace function public.use_phone_link(p_token_hash text, p_claim_hash text) returns uuid
language sql
security definer
set search_path = ''
as $$
	update public.phone_links
	set uploads = uploads + 1
	where token_hash = p_token_hash
		and claim_hash = p_claim_hash
		and expires_at > now()
		and uploads < 10
	returning user_id;
$$;

drop policy "upload own receipt photos" on storage.objects;

create policy "upload own receipt photos" on storage.objects
	for insert to authenticated
	with check (
		bucket_id = 'receipts'
		and (storage.foldername(name))[1] = (select auth.uid())::text
		and (select public.receipt_awaits_photo(name))
		and (select public.receipt_photos_today()) < 12
	);
