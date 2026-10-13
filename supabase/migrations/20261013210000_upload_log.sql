-- Upload limits counted receipts that still existed, so deleting a receipt handed its slot
-- back and upload, delete, repeat had no ceiling. Every new receipt now leaves a row here that
-- no user can read, change or delete, and the limits count these rows instead.
create table public.upload_log (
	user_id uuid not null references auth.users (id) on delete cascade,
	created_at timestamptz not null default now()
);

create index upload_log_user_created on public.upload_log (user_id, created_at desc);

alter table public.upload_log enable row level security;
revoke all on public.upload_log from anon, authenticated;
grant select, insert, delete on public.upload_log to service_role;

-- security definer so it can read and write the log for the person adding a receipt.
-- created_at is stamped by the server for everyone but the service role (seeds and tests),
-- and the log entry carries the same time.
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

	if last_minute >= 10 then
		raise exception 'receipt limit: too many at once' using errcode = 'P0001';
	elsif last_day >= 20 then
		raise exception 'receipt limit: daily' using errcode = 'P0001';
	elsif last_month >= 200 then
		raise exception 'receipt limit: monthly' using errcode = 'P0001';
	end if;

	insert into public.upload_log (user_id, created_at) values (new.user_id, new.created_at);
	return new;
end;
$$;

-- receipts already added in the last 30 days keep counting
insert into public.upload_log (user_id, created_at)
select user_id, created_at from public.receipts where created_at > now() - interval '30 days';

-- A photo is only accepted for one of the caller's own receipts that is still waiting for it
-- and was made in the last ten minutes, so every photo costs a receipt slot and an old receipt
-- cannot be used to swap photos in and out forever.
create function public.receipt_awaits_photo(p_path text) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1 from public.receipts
		where user_id = (select auth.uid())
			and image_path = p_path
			and status = 'pending'
			and created_at > now() - interval '10 minutes'
	);
$$;

revoke all on function public.receipt_awaits_photo(text) from public, anon;
grant execute on function public.receipt_awaits_photo(text) to authenticated;

drop policy "upload own receipt photos" on storage.objects;

create policy "upload own receipt photos" on storage.objects
	for insert to authenticated
	with check (
		bucket_id = 'receipts'
		and (storage.foldername(name))[1] = (select auth.uid())::text
		and (select public.receipt_awaits_photo(name))
		and (select public.receipt_photos_today()) < 25
	);
