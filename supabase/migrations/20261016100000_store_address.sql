-- which branch the receipt came from, copied from the receipt. Location data, so it is only
-- written when the shopper turned on keep_store_location (off by default).
alter table public.receipts
	add column store_address text check (char_length(store_address) between 1 and 160);
