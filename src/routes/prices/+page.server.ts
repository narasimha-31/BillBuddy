import { redirect } from '@sveltejs/kit';
import { historyOf } from '../../price-history';
import { toPurchases, type ItemRow } from '../../purchases';
import { firstNameOf } from '../../session.server';
import type { PageServerLoad } from './$types';

type Product = { name: string; times: number; last_bought: string | null; stores: number; category: string | null };

// enough lines for years of one product; the list itself is grouped in SQL
const MOST_LINES = 1000;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const listed = await locals.supabase.rpc('my_products');
	if (listed.error) throw listed.error;
	const products = (listed.data as Product[]).map((p) => ({ name: p.name, times: Number(p.times), category: p.category }));

	const asked = url.searchParams.get('item');
	const selected = products.find((p) => p.name === asked)?.name ?? products[0]?.name ?? null;
	if (!selected) return { firstName: firstNameOf(user), products, selected, history: null };

	const { data, error } = await locals.supabase
		.from('receipt_items')
		.select('name, category, quantity, unit, unit_price_cents, total_cents, receipts!inner(purchased_on, channel, stores(name))')
		.eq('kind', 'item')
		.eq('name', selected)
		.order('id', { ascending: false })
		.limit(MOST_LINES);
	if (error) throw error;

	return {
		firstName: firstNameOf(user),
		products,
		selected,
		history: historyOf(toPurchases(data as unknown as ItemRow[]), selected)
	};
};
