-- A short-lived link that lets one phone add receipt photos to a signed-in account.
-- Only hashes are stored, so a leaked table cannot be turned back into working links.
-- Only the server's service role can touch it.
create table public.phone_links (
	token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
	user_id uuid not null unique references auth.users (id) on delete cascade,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null,
	claim_hash text check (claim_hash ~ '^[0-9a-f]{64}$'),
	uploads integer not null default 0 check (uploads between 0 and 20)
);

alter table public.phone_links enable row level security;
revoke all on public.phone_links from anon, authenticated;
grant select, insert, update, delete on public.phone_links to service_role;

-- counts one upload and returns whose account it goes to, or nothing when the link is
-- expired, used up, or held by a different phone; one statement, so two uploads cannot race
create function public.use_phone_link(p_token_hash text, p_claim_hash text) returns uuid
language sql
security definer
set search_path = ''
as $$
	update public.phone_links
	set uploads = uploads + 1
	where token_hash = p_token_hash
		and claim_hash = p_claim_hash
		and expires_at > now()
		and uploads < 20
	returning user_id;
$$;

revoke execute on function public.use_phone_link(text, text) from public, anon, authenticated;
grant execute on function public.use_phone_link(text, text) to service_role;
