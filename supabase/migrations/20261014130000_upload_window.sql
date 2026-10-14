-- The upload limit counts the last 24 hours, not the calendar day. This tells the caller how many
-- of those they have used and when the oldest one drops out, so the page can say when a slot opens.
create function public.my_upload_window() returns table (used integer, frees_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
	select count(*)::integer, min(created_at) + interval '1 day'
	from public.upload_log
	where user_id = (select auth.uid())
		and created_at > now() - interval '1 day';
$$;

revoke all on function public.my_upload_window() from public, anon;
grant execute on function public.my_upload_window() to authenticated;
