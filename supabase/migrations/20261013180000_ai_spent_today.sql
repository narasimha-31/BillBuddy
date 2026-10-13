-- Today's AI spend for everyone and for one person, summed in the database. Reading the rows
-- through the API would stop at its 1000-row page and quietly undercount on a busy day.
create function public.ai_spent_today(p_user_id uuid) returns table (all_micros bigint, user_micros bigint)
language sql
stable
security definer
set search_path = ''
as $$
	select
		coalesce(sum(cost_micros), 0)::bigint,
		coalesce(sum(cost_micros) filter (where user_id = p_user_id), 0)::bigint
	from public.ai_calls
	where created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

revoke execute on function public.ai_spent_today(uuid) from public, anon, authenticated;
grant execute on function public.ai_spent_today(uuid) to service_role;
