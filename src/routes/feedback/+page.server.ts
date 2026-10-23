import { fail } from '@sveltejs/kit';
import { FEEDBACK_PER_DAY, feedbackFromForm } from '../../feedback';
import { firstNameOf } from '../../session.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await locals.getUser();
	return { firstName: user ? firstNameOf(user) : null, signedIn: user !== null, from: url.searchParams.get('from') ?? '' };
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		if (!(await locals.getUser())) return fail(401, { problem: 'Sign in to send feedback.' });
		const feedback = feedbackFromForm(await request.formData());
		if ('problem' in feedback) return fail(400, feedback);

		const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const sent = await locals.supabase.from('feedback').select('id', { count: 'exact', head: true }).gte('created_at', since);
		if (sent.error) throw sent.error;
		if ((sent.count ?? 0) >= FEEDBACK_PER_DAY) return fail(429, { problem: `That's ${FEEDBACK_PER_DAY} today. Thank you, send more tomorrow.` });

		const saved = await locals.supabase.from('feedback').insert(feedback);
		if (saved.error) throw saved.error;
		return { sent: true };
	}
};
