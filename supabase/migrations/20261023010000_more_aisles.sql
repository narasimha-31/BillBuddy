alter table public.my_aisles drop constraint my_aisles_aisle_check;
alter table public.my_aisles add constraint my_aisles_aisle_check check (aisle in ('Produce', 'Meat & seafood', 'Dairy & eggs', 'Bakery', 'Pantry', 'Frozen', 'Snacks', 'Beverages', 'Household', 'Home & kitchen', 'Personal care', 'Baby', 'Pet', 'Alcohol', 'Clothing', 'Electronics', 'Other'));
