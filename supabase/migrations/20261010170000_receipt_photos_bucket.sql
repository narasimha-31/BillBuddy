-- private bucket for receipt photos; the app converts every photo to a small jpeg before upload
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg']);

-- each user can only touch files under a folder named after their own id; photos are never replaced
create policy "read own receipt photos" on storage.objects
	for select to authenticated
	using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "upload own receipt photos" on storage.objects
	for insert to authenticated
	with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "delete own receipt photos" on storage.objects
	for delete to authenticated
	using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
