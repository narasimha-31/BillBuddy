-- Accounts under three days old share their own part of the day's AI budget, so a swarm of fresh
-- accounts runs out of that part while shoppers who were here before keep reading receipts.
drop function public.ai_spent_today(uuid);

create function public.ai_spent_today(p_user_id uuid) returns table (all_micros bigint, user_micros bigint, new_micros bigint, user_is_new boolean)
language sql
stable
security definer
set search_path = ''
as $$
	select
		coalesce(sum(c.cost_micros), 0)::bigint,
		coalesce(sum(c.cost_micros) filter (where c.user_id = p_user_id), 0)::bigint,
		coalesce(sum(c.cost_micros) filter (where u.created_at > now() - interval '3 days'), 0)::bigint,
		coalesce((select created_at > now() - interval '3 days' from auth.users where id = p_user_id), false)
	from public.ai_calls c
	left join auth.users u on u.id = c.user_id
	where c.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
		and c.purpose not like 'eval\_%';
$$;

revoke execute on function public.ai_spent_today(uuid) from public, anon, authenticated;
grant execute on function public.ai_spent_today(uuid) to service_role;
