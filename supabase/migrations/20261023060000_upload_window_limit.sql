-- the window also says how many receipts this account gets a day, fewer on its first day
drop function public.my_upload_window();

create function public.my_upload_window() returns table (used integer, frees_at timestamptz, daily_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
	select count(*)::integer, min(created_at) + interval '1 day', coalesce(public.daily_receipt_limit((select auth.uid())), 10)
	from public.upload_log
	where user_id = (select auth.uid())
		and created_at > now() - interval '1 day'
		and not given_back;
$$;

revoke all on function public.my_upload_window() from public, anon;
grant execute on function public.my_upload_window() to authenticated;
