-- unexpected server errors, for fixing bugs. Never holds request bodies, receipt contents or photos.
-- Only the server's service role can touch it; users and visitors have no access at all.
create table public.error_log (
	id uuid primary key,
	created_at timestamptz not null default now(),
	route text check (char_length(route) <= 200),
	status smallint,
	message text check (char_length(message) <= 500),
	code text check (char_length(code) <= 80),
	user_id uuid
);

create index error_log_created on public.error_log (created_at desc);

alter table public.error_log enable row level security;
revoke all on public.error_log from anon, authenticated;
grant select, insert, delete on public.error_log to service_role;
