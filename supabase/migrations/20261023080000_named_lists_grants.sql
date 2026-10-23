-- new tables here get no default privileges; the app reads and writes lists as the shopper
grant select, insert, update, delete on public.shopping_lists to authenticated, service_role;
