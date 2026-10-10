import { fail, redirect } from '@sveltejs/kit';
import { photoProblem } from './photo-rules';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const { data: receipts, error } = await locals.supabase
		.from('receipts')
		.select('id, status, purchased_on, total_cents, created_at, stores(name)')
		.order('created_at', { ascending: false })
		.limit(100);
	if (error) throw error;

	const meta = user.user_metadata ?? {};
	const firstName: string | null = meta.given_name ?? meta.full_name?.split(' ')[0] ?? meta.name?.split(' ')[0] ?? null;

	return {
		firstName,
		receipts: receipts.map(({ stores, ...receipt }) => ({
			...receipt,
			store: (Array.isArray(stores) ? stores[0]?.name : (stores as { name: string } | null)?.name) ?? null
		}))
	};
};

export const actions: Actions = {
	// one photo per request: keeps every request far below the hosting body limit
	upload: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const form = await request.formData();
		const photo = form.get('photo');
		const hash = String(form.get('hash') ?? '');
		if (!(photo instanceof File)) return fail(400, { problem: 'no photo' });

		const bytes = new Uint8Array(await photo.arrayBuffer());
		const problem = photoProblem(bytes, hash);
		if (problem) return fail(400, { problem });

		const path = `${user.id}/${crypto.randomUUID()}.jpg`;
		const stored = await locals.supabase.storage.from('receipts').upload(path, bytes, { contentType: 'image/jpeg' });
		if (stored.error) throw stored.error;

		const { error } = await locals.supabase.from('receipts').insert({ image_hash: hash, image_path: path });
		if (error) {
			await locals.supabase.storage.from('receipts').remove([path]);
			if (error.code === '23505') return fail(409, { problem: 'already added' });
			throw error;
		}
		return { added: true };
	}
};
