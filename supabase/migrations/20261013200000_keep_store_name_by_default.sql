-- The store name is the heart of "where was it cheaper", so it is kept unless someone turns it
-- off. The store's address stays off by default: that is location data. No one could have
-- chosen "off" yet (there was no settings page), so existing rows follow the new default.
alter table public.user_settings alter column keep_store_name set default true;
update public.user_settings set keep_store_name = true where keep_store_name = false;
