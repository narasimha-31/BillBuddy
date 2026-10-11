-- the model the provider says actually answered, next to the one we asked for, so silent rerouting shows up
alter table public.ai_calls add column served_model text check (char_length(served_model) <= 100);
