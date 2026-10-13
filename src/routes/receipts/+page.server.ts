import { error as httpError, fail, redirect } from '@sveltejs/kit';
import { processReceipt } from '../../process-receipt.server';
import { firstNameOf } from '../../session.server';
import { photoProblem } from './photo-rules';
import type { Actions, PageServerLoad } from './$types';

const DAILY_RECEIPTS = 20;

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
	const [list, today] = await Promise.all([
		locals.supabase
			.from('receipts')
			.select('id, status, problem, purchased_on, total_cents, skipped_lines, created_at, stores(name)')
			.order('created_at', { ascending: false })
			.limit(100),
		locals.supabase.from('receipts').select('id', { count: 'exact', head: true }).gt('created_at', dayAgo)
	]);
	if (list.error) throw list.error;
	if (today.error) throw today.error;

	return {
		firstName: firstNameOf(user),
		today: today.count ?? 0,
		dailyLimit: DAILY_RECEIPTS,
		receipts: list.data.map(({ stores, ...receipt }) => ({
			...receipt,
			store: (Array.isArray(stores) ? stores[0]?.name : (stores as { name: string } | null)?.name) ?? null
		}))
	};
};

// database limit messages, turned into something a person can act on
const limitMessages: Record<string, string> = {
	'receipt limit: too many at once': 'slow down a little and try again in a minute',
	'receipt limit: daily': `you've added ${DAILY_RECEIPTS} receipts today, the limit resets tomorrow`,
	'receipt limit: monthly': "you've reached 200 receipts this month",
	photos: "you've reached today's photo limit, try again tomorrow"
};

export const actions: Actions = {
	// One photo per request keeps every request far below the hosting body limit. The row is
	// created before the upload, so a failed upload never leaves a photo nobody points to.
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
		const row = await locals.supabase.from('receipts').insert({ image_hash: hash, image_path: path }).select('id').single();
		if (row.error) {
			if (row.error.code === '23505') return fail(409, { problem: 'already added' });
			if (row.error.code === 'P0001' && row.error.message in limitMessages) {
				return fail(429, { problem: limitMessages[row.error.message] });
			}
			throw row.error;
		}

		const stored = await locals.supabase.storage.from('receipts').upload(path, bytes, { contentType: 'image/jpeg' });
		if (stored.error) {
			await locals.supabase.from('receipts').delete().eq('id', row.data.id);
			// the only upload the storage policy refuses for a signed-in owner is the daily photo cap
			if ('statusCode' in stored.error && stored.error.statusCode === '403') {
				return fail(429, { problem: limitMessages.photos });
			}
			throw stored.error;
		}
		return { added: true, id: row.data.id as string };
	},

	process: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const id = String((await request.formData()).get('id') ?? '');
		if (!/^[0-9a-f-]{36}$/.test(id)) httpError(400, 'bad receipt id');
		return await processReceipt(locals.supabase, user.id, id);
	}
};
