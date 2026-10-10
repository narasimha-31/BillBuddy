import { redirect } from '@sveltejs/kit';
import { signInWithCode } from '../session.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	if (code) {
		const ok = await signInWithCode(locals.supabase, code);
		redirect(303, ok ? '/' : '/?signin=failed');
	}

	const user = await locals.getUser();
	return {
		email: user?.email ?? null,
		signInFailed: url.searchParams.get('signin') === 'failed'
	};
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

	signout: async ({ locals }) => {
		const { error } = await locals.supabase.auth.signOut();
		if (error) throw error;
		redirect(303, '/');
	}
};
