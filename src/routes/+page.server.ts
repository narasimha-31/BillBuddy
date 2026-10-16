import { redirect } from '@sveltejs/kit';
import { DISPLAY_COOKIE, DISPLAY_COOKIE_OPTIONS, displayCookie, fromRow } from '../display';
import { signInWithCode } from '../session.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals, cookies }) => {
	const code = url.searchParams.get('code');
	if (code) {
		const ok = await signInWithCode(locals.supabase, code);
		// a new device picks up the display the shopper chose on another
		if (ok) {
			const { data } = await locals.supabase.from('user_settings').select('text_size, more_contrast, palette').maybeSingle();
			cookies.set(DISPLAY_COOKIE, displayCookie(fromRow(data)), DISPLAY_COOKIE_OPTIONS);
		}
		redirect(303, ok ? '/home' : '/?signin=failed');
	}

	if (await locals.getUser()) redirect(303, '/home');
	return { signInFailed: url.searchParams.get('signin') === 'failed' };
};

export const actions: Actions = {
	google: async ({ url, locals }) => {
		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: url.origin }
		});
		if (error) throw error;
		redirect(303, data.url);
	},

	// Supabase's default signs every device out; this device only is what people expect
	signout: async ({ locals, cookies }) => {
		const { error } = await locals.supabase.auth.signOut({ scope: 'local' });
		if (error) throw error;
		cookies.delete(DISPLAY_COOKIE, { path: '/' });
		redirect(303, '/');
	},

	signout_everywhere: async ({ locals, cookies }) => {
		const { error } = await locals.supabase.auth.signOut({ scope: 'global' });
		if (error) throw error;
		cookies.delete(DISPLAY_COOKIE, { path: '/' });
		redirect(303, '/');
	}
};
