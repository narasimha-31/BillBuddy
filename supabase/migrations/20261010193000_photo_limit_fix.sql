-- The upload policy counted rows in storage.objects from inside a storage.objects policy,
-- which the storage service rejects, so every upload failed. The count now runs in a
-- security definer function. It takes no arguments and only counts the caller's own
-- uploads, so it cannot be used to look at anyone else's.
create function public.receipt_photos_today() returns integer
language sql
stable
security definer
set search_path = ''
as $$
	select count(*)::integer
	from storage.objects
	where bucket_id = 'receipts'
		and owner_id = (select auth.uid())::text
		and created_at > now() - interval '1 day';
$$;

revoke all on function public.receipt_photos_today() from public, anon;
grant execute on function public.receipt_photos_today() to authenticated;

drop policy "upload own receipt photos" on storage.objects;

create policy "upload own receipt photos" on storage.objects
	for insert to authenticated
	with check (
		bucket_id = 'receipts'
		and (storage.foldername(name))[1] = (select auth.uid())::text
		and (select public.receipt_photos_today()) < 25
	);
