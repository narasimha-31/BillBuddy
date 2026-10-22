-- what the shopper means to spend on groceries in a month, in cents; null means no budget
alter table public.user_settings
	add column monthly_budget_cents integer check (monthly_budget_cents between 100 and 10000000);
