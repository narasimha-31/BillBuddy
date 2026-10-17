import { fail, redirect } from '@sveltejs/kit';
import { chooseAisle, chooseAisleByName } from '../../aisle-choice.server';
import { CATEGORIES, type Category } from '../../item-names';
import { historyOf } from '../../price-history';
import { toPurchases, type ItemRow } from '../../purchases';
import { firstNameOf } from '../../session.server';
import { usualStore, type Place } from '../../store-facts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';

type Product = { name: string; times: number; last_bought: string | null; stores: number; category: string | null; maybe_same: string | null };

// enough lines for years of one product; the list itself is grouped in SQL
const MOST_LINES = 1000;
const LINE_FIELDS = 'id, receipt_id, name, raw_text, brand, category, quantity, unit, unit_price_cents, total_cents, maybe_product_id, receipts!inner(store_id, purchased_on, channel, stores(name))';

// Every line of one product as the shopper sees it: lines joined to the shared product of that
// name, and lines with no product yet that carry the name themselves. Two indexed queries, run
// together, instead of one filter string that would have to escape any name.
async function linesOf(supabase: SupabaseClient, name: string) {
	const product = await supabase.from('products').select('id').eq('name', name).maybeSingle();
	if (product.error) throw product.error;
	const [joined, loose] = await Promise.all([
		product.data
			? supabase.from('receipt_items').select(LINE_FIELDS).eq('kind', 'item').eq('product_id', product.data.id).order('id', { ascending: false }).limit(MOST_LINES)
			: Promise.resolve({ data: [], error: null }),
		supabase.from('receipt_items').select(LINE_FIELDS).eq('kind', 'item').eq('name', name).is('product_id', null).order('id', { ascending: false }).limit(MOST_LINES)
	]);
	if (joined.error) throw joined.error;
	if (loose.error) throw loose.error;
	return [...joined.data, ...loose.data];
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');

	const [listed, placed] = await Promise.all([locals.supabase.rpc('my_products'), locals.supabase.rpc('my_store_places')]);
	if (listed.error) throw listed.error;
	if (placed.error) throw placed.error;
	const products = (listed.data as Product[]).map((p) => ({ name: p.name, times: Number(p.times), category: p.category, maybeSame: p.maybe_same }));
	const places = (placed.data as Place[]).map((p) => ({ ...p, visits: Number(p.visits) }));
	const usual = usualStore(places);

	const asked = url.searchParams.get('item');
	const chosen = products.find((p) => p.name === asked) ?? products[0] ?? null;
	const selected = chosen?.name ?? null;
	if (!selected) return { firstName: firstNameOf(user), products, places, usual, selected, aisle: null, categories: [...CATEGORIES], maybeSame: null, history: null };

	// every line of the product counts under its one shared name, whatever each receipt called it
	const lines = (await linesOf(locals.supabase, selected)).map((line) => ({ ...line, name: selected }));
	return {
		firstName: firstNameOf(user),
		products,
		places,
		usual,
		selected,
		aisle: chosen?.category ?? 'Other',
		categories: [...CATEGORIES],
		maybeSame: chosen?.maybeSame ?? null,
		history: historyOf(toPurchases(lines as unknown as ItemRow[]), selected)
	};
};

type Line = { id: number; raw_text: string; brand: string | null; category: string | null; maybe_product_id: string | null; receipts: { store_id: string | null } | { store_id: string | null }[] };

export const actions: Actions = {
	// The shopper moves a product to another aisle: all their lines of it, and every later receipt
	aisle: async ({ locals, request }) => {
		const user = await locals.getUser();
		if (!user) redirect(303, '/');
		const form = await request.formData();
		const item = String(form.get('item') ?? '');
		const aisle = String(form.get('aisle') ?? '');
		if (!item || !(CATEGORIES as readonly string[]).includes(aisle)) return fail(400, { problem: 'Pick an aisle from the list.' });

		const product = await locals.supabase.from('products').select('id').eq('name', item).maybeSingle();
		if (product.error) throw product.error;
		await Promise.all([
			product.data ? chooseAisle(locals.supabase, product.data.id, aisle as Category) : null,
			chooseAisleByName(locals.supabase, item, aisle as Category)
		]);
		return { aisle };
	},

	// The shopper's answer to "Same as ...?". It changes only their own lines (row level security),
	// never the shared product, and a yes is remembered so the next receipt lands there by itself.
	same: async ({ locals, request }) => {
		const user = await locals.getUser();
		if (!user) redirect(303, '/');
		const form = await request.formData();
		const item = String(form.get('item') ?? '');
		const answer = form.get('answer');
		if (!item || (answer !== 'yes' && answer !== 'no')) return fail(400, { problem: 'That answer did not come through. Try again.' });

		const lines = ((await linesOf(locals.supabase, item)) as unknown as Line[]).filter((l) => l.maybe_product_id);
		if (!lines.length) return { answered: answer };
		const ids = lines.map((l) => l.id);

		if (answer === 'no') {
			const { error } = await locals.supabase.from('receipt_items').update({ maybe_product_id: null }).in('id', ids);
			if (error) throw error;
			return { answered: answer };
		}

		const target = lines[0].maybe_product_id!;
		const product = await locals.supabase.from('products').select('name').eq('id', target).single();
		if (product.error) throw product.error;
		const moved = await locals.supabase.from('receipt_items').update({ product_id: target, maybe_product_id: null }).in('id', ids).eq('maybe_product_id', target);
		if (moved.error) throw moved.error;
		// one memory per printed line and store: an upsert may not touch the same row twice
		const memory = new Map<string, { store_id: string | null; raw_text: string; name: string; brand: string | null; category: string | null }>();
		for (const l of lines.filter((l) => l.maybe_product_id === target)) {
			const receipt = Array.isArray(l.receipts) ? l.receipts[0] : l.receipts;
			const storeId = receipt?.store_id ?? null;
			memory.set(`${storeId}|${l.raw_text}`, { store_id: storeId, raw_text: l.raw_text, name: product.data.name, brand: l.brand, category: l.category });
		}
		const remembered = await locals.supabase.from('name_memory').upsert([...memory.values()], { onConflict: 'user_id,store_id,raw_text' });
		if (remembered.error) throw remembered.error;
		return { answered: answer, now: product.data.name };
	}
};
