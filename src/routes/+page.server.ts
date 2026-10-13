import { redirect } from '@sveltejs/kit';
import { signInWithCode } from '../session.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	if (code) {
		const ok = await signInWithCode(locals.supabase, code);
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
	signout: async ({ locals }) => {
		const { error } = await locals.supabase.auth.signOut({ scope: 'local' });
		if (error) throw error;
		redirect(303, '/');
	},

	signout_everywhere: async ({ locals }) => {
		const { error } = await locals.supabase.auth.signOut({ scope: 'global' });
		if (error) throw error;
		redirect(303, '/');
	}
};
