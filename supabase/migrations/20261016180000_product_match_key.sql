-- One canonical key per product name (words sorted, lower case, plurals dropped), made in code
-- on insert. The unique index turns "is this product already known?" into one index probe.
alter table public.products add column match_key text not null check (length(match_key) between 1 and 120);

create unique index products_match_key on public.products (match_key);
