import { redirect } from '@sveltejs/kit';
import { DAILY_RECEIPTS, uploadWindow } from '../../save-photo.server';
import { firstNameOf } from '../../session.server';
import type { PageServerLoad } from './$types';

type Change = { name: string; per: 'lb' | 'ea'; now_cents: number; before_cents: number; store: string | null; before_store: string | null; bought_on: string };
type One<T> = T | T[] | null;

const storeOf = (stores: One<{ name: string }>) => (Array.isArray(stores) ? stores[0]?.name : stores?.name) ?? null;

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
	const [recent, month, changes, uploaded] = await Promise.all([
		locals.supabase
			.from('receipts')
			.select('id, purchased_on, total_cents, channel, stores(name)')
			.eq('status', 'saved')
			.order('purchased_on', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false })
			.limit(20),
		locals.supabase.from('receipts').select('total_cents, store_id').eq('status', 'saved').gte('purchased_on', monthStart),
		locals.supabase.rpc('my_price_changes', { how_many: 10 }),
		locals.supabase.rpc('my_upload_window')
	]);
	for (const answer of [recent, month, changes, uploaded]) if (answer.error) throw answer.error;

	const monthRows = month.data ?? [];
	return {
		firstName: firstNameOf(user),
		uploads: uploadWindow(uploaded.data),
		dailyLimit: DAILY_RECEIPTS,
		month: {
			start: monthStart,
			spentCents: monthRows.reduce((sum, r) => sum + (r.total_cents ?? 0), 0),
			receipts: monthRows.length,
			stores: new Set(monthRows.map((r) => r.store_id).filter(Boolean)).size
		},
		changes: (changes.data ?? []) as Change[],
		recent: (recent.data ?? []).map(({ stores, ...r }) => ({ ...r, store: storeOf(stores as One<{ name: string }>) }))
	};
};
