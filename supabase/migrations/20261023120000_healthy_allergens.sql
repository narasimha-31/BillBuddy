-- The major US food allergens each healthy food has, so the card can say so.
alter table public.healthy_foods
	add column allergens text[] not null default '{}'
	check (allergens <@ array['milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soy', 'sesame']);
