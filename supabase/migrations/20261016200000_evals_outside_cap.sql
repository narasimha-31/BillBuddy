-- Model tests we run on purpose (purpose "eval_...") are still logged for the balance, but do not
-- use up the day's cap that protects the app from its users.
create or replace function public.ai_spent_today(p_user_id uuid) returns table (all_micros bigint, user_micros bigint)
language sql
stable
security definer
set search_path = ''
as $$
	select
		coalesce(sum(cost_micros), 0)::bigint,
		coalesce(sum(cost_micros) filter (where user_id = p_user_id), 0)::bigint
	from public.ai_calls
	where created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'
		and purpose not like 'eval\_%';
$$;
