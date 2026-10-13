import { fail } from '@sveltejs/kit';
import { admin } from '../../../admin.server';
import { claimPhoneLink, heldBy, LINK_MINUTES, usePhoneLink } from '../../../phone-link.server';
import { savePhoto } from '../../../save-photo.server';
import type { Actions, PageServerLoad } from './$types';

const CLAIM = 'phone_claim';

export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
	// the token is in the address, so it must never leak to another site, a cache or a search engine
	setHeaders({ 'referrer-policy': 'no-referrer', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });

	let expiresAt = await heldBy(params.token, cookies.get(CLAIM));
	if (!expiresAt) {
		const claimed = await claimPhoneLink(params.token);
		if (claimed) {
			cookies.set(CLAIM, claimed.claim, { path: '/phone', httpOnly: true, sameSite: 'lax', maxAge: LINK_MINUTES * 60 });
			expiresAt = claimed.expiresAt;
		}
	}
	return { expiresAt };
};

export const actions: Actions = {
	upload: async ({ params, cookies, request }) => {
		const userId = await usePhoneLink(params.token, cookies.get(CLAIM));
		if (!userId) return fail(403, { problem: 'this code has expired, make a new one on your computer' });

		const form = await request.formData();
		const saved = await savePhoto(admin, userId, form.get('photo'), String(form.get('hash') ?? ''));
		if ('problem' in saved) return fail(saved.status, { problem: saved.problem });
		return { added: true };
	}
};
