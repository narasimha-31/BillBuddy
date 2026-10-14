-- table rights for the shared products: people read them, the server reads and writes them
grant select on public.products to authenticated;
grant select, insert, update, delete on public.products to service_role;
