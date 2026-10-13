import { redirect } from '@sveltejs/kit';
import { toPurchases, type ItemRow } from '../../purchases';
import { firstNameOf } from '../../session.server';
import type { PageServerLoad } from './$types';

const PAGE = 1000;
const MOST_LINES = 10_000;

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	// the API returns at most 1000 rows a request, so read the lines in pages
	const rows: ItemRow[] = [];
	for (let from = 0; from < MOST_LINES; from += PAGE) {
		const { data, error } = await locals.supabase
			.from('receipt_items')
			.select('name, category, quantity, unit, unit_price_cents, total_cents, receipts!inner(purchased_on, channel, stores(name))')
			.eq('kind', 'item')
			.not('name', 'is', null)
			.order('id')
			.range(from, from + PAGE - 1);
		if (error) throw error;
		rows.push(...(data as unknown as ItemRow[]));
		if (data.length < PAGE) break;
	}

	return { firstName: firstNameOf(user), purchases: toPurchases(rows) };
};
