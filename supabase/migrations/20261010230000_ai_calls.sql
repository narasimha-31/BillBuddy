-- one row per model call, for the daily spending cap and for cost and speed tracking.
-- Holds token counts and cost only, never prompts, receipt text or images. Server only.
create table public.ai_calls (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	user_id uuid,
	model text not null check (char_length(model) <= 100),
	purpose text not null check (char_length(purpose) <= 40),
	input_tokens integer not null default 0 check (input_tokens >= 0),
	output_tokens integer not null default 0 check (output_tokens >= 0),
	cost_micros integer not null default 0 check (cost_micros >= 0),
	duration_ms integer not null default 0 check (duration_ms >= 0),
	ok boolean not null
);

create index ai_calls_created on public.ai_calls (created_at desc);

alter table public.ai_calls enable row level security;
revoke all on public.ai_calls from anon, authenticated;
grant select, insert on public.ai_calls to service_role;
