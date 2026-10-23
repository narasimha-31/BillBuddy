-- A photo that turns out not to be a readable receipt gives its daily slot back. The minute and
-- 30-day ceilings still count it, and so does the per-person AI money cap, so junk photos stay bounded.
alter table public.upload_log
	add column receipt_id uuid,
	add column given_back boolean not null default false;

grant update (given_back) on public.upload_log to service_role;

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
		count(*) filter (where created_at > now() - interval '1 day' and not given_back),
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

	insert into public.upload_log (user_id, created_at, receipt_id) values (new.user_id, new.created_at, new.id);
	return new;
end;
$$;

create or replace function public.my_upload_window() returns table (used integer, frees_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
	select count(*)::integer, min(created_at) + interval '1 day'
	from public.upload_log
	where user_id = (select auth.uid())
		and created_at > now() - interval '1 day'
		and not given_back;
$$;
