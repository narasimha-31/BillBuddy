import { error as httpError, fail, redirect } from '@sveltejs/kit';
import { renderSVG } from 'uqr';
import { createPhoneLink } from '../../phone-link.server';
import { processReceipt } from '../../process-receipt.server';
import { DAILY_RECEIPTS, savePhoto } from '../../save-photo.server';
import { firstNameOf } from '../../session.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const [list, today] = await Promise.all([
		locals.supabase
			.from('receipts')
			.select('id, status, problem, purchased_on, total_cents, skipped_lines, created_at, processing_at, stores(name)')
			.order('created_at', { ascending: false })
			.limit(100),
		// counted from the upload log, so deleted receipts still count, exactly like the limit itself
		locals.supabase.rpc('uploads_today')
	]);
	if (list.error) throw list.error;
	if (today.error) throw today.error;

	return {
		firstName: firstNameOf(user),
		today: (today.data as number | null) ?? 0,
		dailyLimit: DAILY_RECEIPTS,
		receipts: list.data.map(({ stores, ...receipt }) => ({
			...receipt,
			store: (Array.isArray(stores) ? stores[0]?.name : (stores as { name: string } | null)?.name) ?? null
		}))
	};
};

export const actions: Actions = {
	// one photo per request keeps every request far below the hosting body limit
	upload: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const form = await request.formData();
		const saved = await savePhoto(locals.supabase, user.id, form.get('photo'), String(form.get('hash') ?? ''));
		if ('problem' in saved) return fail(saved.status, { problem: saved.problem });
		return { added: true, id: saved.id };
	},

	process: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const id = String((await request.formData()).get('id') ?? '');
		if (!/^[0-9a-f-]{36}$/.test(id)) httpError(400, 'bad receipt id');
		return await processReceipt(locals.supabase, user.id, id);
	},

	// a code the phone camera opens; making a new one cancels the last
	phone: async ({ locals, url }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const { token, expiresAt } = await createPhoneLink(user.id);
		const qr = renderSVG(`${url.origin}/phone/${token}`, { border: 2, whiteColor: '#f7f4eb', blackColor: '#2b2620' });
		return { qr, expiresAt };
	}
};
