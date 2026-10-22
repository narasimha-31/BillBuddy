import { fail, redirect } from '@sveltejs/kit';
import { confirmsDelete, deleteAccount, removePhotos } from '../../delete-account.server';
import { DISPLAY_COLUMNS, DISPLAY_COOKIE, DISPLAY_COOKIE_OPTIONS, displayCookie, displayFromForm, fromRow, readDisplay, toRow } from '../../display';
import { firstNameOf } from '../../session.server';
import { mapState, turnMapOff, turnMapOn } from '../../store-map.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const [settings, map] = await Promise.all([
		locals.supabase.from('user_settings').select(`keep_photos, ${DISPLAY_COLUMNS}`).maybeSingle(),
		mapState(locals.supabase)
	]);
	if (settings.error) throw settings.error;

	return {
		firstName: firstNameOf(user),
		email: user.email ?? null,
		map,
		keepPhotos: settings.data?.keep_photos ?? false,
		display: fromRow(settings.data)
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const form = await request.formData();
		const keepPhotos = form.get('keep_photos') === 'on';
		const saved = await locals.supabase.from('user_settings').upsert({ user_id: user.id, keep_photos: keepPhotos, updated_at: new Date().toISOString() });
		if (saved.error) throw saved.error;

		// switching it off deletes what was kept; photos still waiting to be read stay until they are
		if (!keepPhotos) {
			const waiting = await locals.supabase.from('receipts').select('image_path').in('status', ['pending', 'processing']).not('image_path', 'is', null);
			if (waiting.error) throw waiting.error;
			await removePhotos(user.id, waiting.data.map((row) => row.image_path!));
			const cleared = await locals.supabase.from('receipts').update({ image_path: null }).not('status', 'in', '(pending,processing)').not('image_path', 'is', null);
			if (cleared.error) throw cleared.error;
		}
	},

	// The store map: on needs a ZIP code, and looks up the stores that have no place yet; off deletes
	// the ZIP and every store place. Also sent from the locked map on Prices.
	location: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });
		const form = await request.formData();
		if (form.get('map') !== 'on') {
			await turnMapOff(locals.supabase, user.id);
			return { map: 'off' };
		}
		const zip = String(form.get('zip') ?? '').trim();
		if (!/^\d{5}$/.test(zip)) return fail(400, { mapProblem: 'Enter a 5-digit ZIP code.' });
		if ((await turnMapOn(locals.supabase, user.id, zip)) === 'unknown_zip') return fail(400, { mapProblem: 'That ZIP code isn’t one we know. Check it and try again.' });
		return { map: 'on' };
	},

	// how the app is drawn; also from the laptop's Aa panel, so it answers wherever it was sent from
	display: async ({ request, locals, cookies }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const chosen = displayFromForm(await request.formData(), readDisplay(cookies.get(DISPLAY_COOKIE)));
		const saved = await locals.supabase.from('user_settings').upsert({ user_id: user.id, ...toRow(chosen), updated_at: new Date().toISOString() });
		if (saved.error) throw saved.error;
		cookies.set(DISPLAY_COOKIE, displayCookie(chosen), DISPLAY_COOKIE_OPTIONS);
		return { display: chosen };
	},

	tour_again: async ({ locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });
		const { error } = await locals.supabase.from('user_settings').upsert({ user_id: user.id, tour_seen: false, updated_at: new Date().toISOString() });
		if (error) throw error;
		redirect(303, '/home');
	},

	delete_account: async ({ request, locals, cookies }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const form = await request.formData();
		if (!confirmsDelete(form.get('confirm'))) return fail(400, { problem: 'type DELETE to confirm' });

		await deleteAccount(user.id);
		await locals.supabase.auth.signOut({ scope: 'local' });
		cookies.delete(DISPLAY_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
