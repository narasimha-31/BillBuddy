import { fail, redirect } from '@sveltejs/kit';
import { confirmsDelete, deleteAccount, removePhotos } from '../../delete-account.server';
import { firstNameOf } from '../../session.server';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const settings = await locals.supabase.from('user_settings').select('keep_store_name, keep_photos').maybeSingle();
	if (settings.error) throw settings.error;

	return {
		firstName: firstNameOf(user),
		email: user.email ?? null,
		keepStoreName: settings.data?.keep_store_name ?? true,
		keepPhotos: settings.data?.keep_photos ?? false
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const form = await request.formData();
		const keepPhotos = form.get('keep_photos') === 'on';
		const saved = await locals.supabase.from('user_settings').upsert({
			user_id: user.id,
			keep_store_name: form.get('keep_store_name') === 'on',
			keep_photos: keepPhotos,
			updated_at: new Date().toISOString()
		});
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

	delete_account: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { problem: 'signed out' });

		const form = await request.formData();
		if (!confirmsDelete(form.get('confirm'))) return fail(400, { problem: 'type DELETE to confirm' });

		await deleteAccount(user.id);
		await locals.supabase.auth.signOut({ scope: 'local' });
		redirect(303, '/');
	}
};
