-- Bugs and ideas sent from the app, read by the team in the dashboard
create table public.feedback (
	id bigint generated always as identity primary key,
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	kind text not null check (kind in ('bug', 'idea')),
	message text not null check (char_length(message) between 1 and 2000),
	page text check (char_length(page) <= 200),
	created_at timestamptz not null default now()
);

create index feedback_user_time on public.feedback (user_id, created_at);

alter table public.feedback enable row level security;

-- shoppers can send and count their own, never read anyone else's
create policy "send own feedback" on public.feedback
	for insert to authenticated
	with check (user_id = (select auth.uid()));

create policy "see own feedback" on public.feedback
	for select to authenticated
	using (user_id = (select auth.uid()));

revoke all on public.feedback from anon;
grant select, insert on public.feedback to authenticated;
grant all on public.feedback to service_role;
