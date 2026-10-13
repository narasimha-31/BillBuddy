-- The receipts page showed "0 of 20" after receipts were deleted, while the real limit counts the
-- upload log. This tells the caller their own count from the log, and nothing else.
create function public.uploads_today() returns integer
language sql
stable
security definer
set search_path = ''
as $$
	select count(*)::integer
	from public.upload_log
	where user_id = (select auth.uid())
		and created_at > now() - interval '1 day';
$$;

revoke all on function public.uploads_today() from public, anon;
grant execute on function public.uploads_today() to authenticated;
