-- what processing needs to record about a receipt and its lines
alter table public.receipts
	add column channel text check (channel in ('in_store', 'delivery', 'pickup', 'unknown')),
	-- when the current read was claimed; a claim older than a couple of minutes is a crashed read
	add column processing_at timestamptz,
	-- why a receipt could not be read, in our own words (never model output)
	add column problem text check (problem in ('not_a_receipt', 'handwritten', 'no_lines', 'bad_photo', 'error')),
	-- offensive or non-grocery lines that were dropped instead of saved
	add column skipped_lines smallint not null default 0 check (skipped_lines >= 0);

alter table public.receipt_items
	-- the amount was not printed and we worked it out from quantity x unit price
	add column computed boolean not null default false,
	add column issue text check (issue in ('line_math', 'unreadable'));
