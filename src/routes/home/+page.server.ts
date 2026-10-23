import { fail, redirect } from '@sveltejs/kit';
import { uploadWindow } from '../../save-photo.server';
import { firstNameOf } from '../../session.server';
import type { Actions, PageServerLoad } from './$types';
import { readingPaused } from '../../receipt-reader.server';
import type { Paid } from '../../price-change';
import { byAisle } from '../../spend';
import { dueSoon, rhythm } from '../../rhythm';

type Change = {
	name: string;
	per: 'lb' | 'ea';
	now_cents: number;
	before_cents: number;
	store: string | null;
	before_store: string | null;
	bought_on: string;
	before_on: string;
	now_receipt: string;
	now_item: string;
	before_receipt: string;
	before_item: string;
	history: Paid[];
};
type One<T> = T | T[] | null;

const storeOf = (stores: One<{ name: string }>) => (Array.isArray(stores) ? stores[0]?.name : stores?.name) ?? null;

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');
	const paused = readingPaused();

	const today = new Date().toISOString().slice(0, 10);
	const monthStart = `${today.slice(0, 7)}-01`;
	const now = new Date();
	// six whole months back covers both the month bars and the eight week bars
	const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)).toISOString().slice(0, 10);
	const [recent, spend, undated, unread, changes, uploaded, settings] = await Promise.all([
		locals.supabase
			.from('receipts')
			.select('id, purchased_on, total_cents, channel, stores(name)')
			.eq('status', 'saved')
			.order('purchased_on', { ascending: false, nullsFirst: false })
			.order('created_at', { ascending: false })
			.limit(5),
		locals.supabase.from('receipts').select('id, purchased_on, total_cents, store_id, receipt_items(category, total_cents, name, products!product_id(name))').eq('status', 'saved').eq('receipt_items.kind', 'item').gte('purchased_on', since),
		locals.supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('status', 'saved').is('purchased_on', null),
		locals.supabase.from('receipts').select('id, status, problem, processing_at').in('status', ['pending', 'processing', 'failed']),
		locals.supabase.rpc('my_price_changes', { how_many: 10 }),
		locals.supabase.rpc('my_upload_window'),
		locals.supabase.from('user_settings').select('tour_seen, monthly_budget_cents').maybeSingle()
	]);
	for (const answer of [recent, spend, undated, unread, changes, uploaded, settings]) if (answer.error) throw answer.error;
	// a read cut off mid-way frees up after two minutes, the same window the database uses
	const stuck = (r: { status: string; problem: string | null; processing_at: string | null }) =>
		r.status === 'pending' || (r.status === 'failed' && r.problem === 'error') || (r.status === 'processing' && (!r.processing_at || Date.now() - Date.parse(r.processing_at) > 120_000));

	type SpendLine = { category: string | null; total_cents: number; name: string | null; products: { name: string } | null };
	const spendRows = (spend.data ?? []) as unknown as { id: string; purchased_on: string; total_cents: number | null; store_id: string | null; receipt_items: SpendLine[] }[];
	const monthRows = spendRows.filter((r) => r.purchased_on >= monthStart);
	return {
		firstName: firstNameOf(user),
		uploads: uploadWindow(uploaded.data),
		dailyLimit: uploadWindow(uploaded.data).limit,
		paused: await paused,
		tour: !settings.data?.tour_seen,
		budgetCents: (settings.data?.monthly_budget_cents as number | null) ?? null,
		month: {
			start: monthStart,
			spentCents: monthRows.reduce((sum, r) => sum + (r.total_cents ?? 0), 0),
			receipts: monthRows.length,
			stores: new Set(monthRows.map((r) => r.store_id).filter(Boolean)).size
		},
		unread: (unread.data ?? []).filter(stuck).map((r) => r.id),
		spend: { today, rows: spendRows.map(({ id, purchased_on, total_cents, receipt_items }) => ({ id, purchased_on, total_cents, aisles: byAisle(receipt_items) })), undated: undated.count ?? 0 },
		changes: (changes.data ?? []) as Change[],
		due: runningLow(spendRows, today),
		recent: (recent.data ?? []).map(({ stores, ...r }) => ({ ...r, store: storeOf(stores as One<{ name: string }>) }))
	};
};

const SHOWN_DUE = 5;

// items bought on a steady rhythm whose usual gap is up, the most overdue first
function runningLow(rows: { purchased_on: string; receipt_items: { name: string | null; products: { name: string } | null }[] }[], today: string) {
	const datesOf = new Map<string, string[]>();
	for (const row of rows) {
		for (const line of row.receipt_items) {
			const name = line.products?.name ?? line.name;
			if (name) datesOf.set(name, [...(datesOf.get(name) ?? []), row.purchased_on]);
		}
	}
	return [...datesOf]
		.flatMap(([name, dates]) => {
			const found = rhythm(dates, today);
			return found && dueSoon(found) ? [{ name, everyDays: found.everyDays, sinceDays: found.sinceDays }] : [];
		})
		.sort((a, b) => b.sinceDays / b.everyDays - a.sinceDays / a.everyDays)
		.slice(0, SHOWN_DUE);
}

export const actions: Actions = {
	// finished or skipped, the tour stays away on every device
	tour_seen: async ({ locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401);
		const { error } = await locals.supabase.from('user_settings').upsert({ user_id: user.id, tour_seen: true, updated_at: new Date().toISOString() });
		if (error) throw error;
	}
};
