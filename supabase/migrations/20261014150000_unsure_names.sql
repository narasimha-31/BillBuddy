-- A line whose name the model was not sure of is kept with its best guess and marked, so the
-- shopper sees it first on the receipt. It does not hold the receipt back.
alter table public.receipt_items drop constraint receipt_items_issue_check;
alter table public.receipt_items add constraint receipt_items_issue_check check (issue in ('line_math', 'unreadable', 'unsure'));
