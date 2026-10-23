-- An account's first day allows 3 receipts instead of 10, so a pile of fresh accounts can't spend the
-- day's AI budget before real shoppers get to it.
create or replace function public.daily_receipt_limit(p_user_id uuid) returns integer
language sql
stable
security definer
set search_path = ''
as $$
	select case when created_at > now() - interval '1 day' then 3 else 10 end
	from auth.users
	where id = p_user_id;
$$;

revoke execute on function public.daily_receipt_limit(uuid) from public, anon, authenticated;

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
	elsif last_day >= coalesce(public.daily_receipt_limit(new.user_id), 10) then
		raise exception 'receipt limit: daily' using errcode = 'P0001';
	elsif last_month >= 100 then
		raise exception 'receipt limit: monthly' using errcode = 'P0001';
	end if;

	insert into public.upload_log (user_id, created_at, receipt_id) values (new.user_id, new.created_at, new.id);
	return new;
end;
$$;
