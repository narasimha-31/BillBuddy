import type { SupabaseClient } from '@supabase/supabase-js';
import type { Sheet } from './spreadsheet';

const PAGE = 1000;
const WHERE: Record<string, string> = { in_store: 'In store', delivery: 'Delivery', pickup: 'Pickup' };
const dollars = (cents: number | null) => (cents === null ? null : cents / 100);

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

// the database hands back at most a thousand rows per ask
async function every<T>(ask: (from: number, to: number) => Page<T>) {
	const rows: T[] = [];
	for (let from = 0; ; from += PAGE) {
		const { data, error } = await ask(from, from + PAGE - 1);
		if (error) throw error;
		rows.push(...(data ?? []));
		if ((data ?? []).length < PAGE) return rows;
	}
}

type Receipt = {
	id: string;
	purchased_on: string | null;
	channel: string | null;
	subtotal_cents: number | null;
	tax_cents: number | null;
	total_cents: number | null;
	store_address: string | null;
	image_path: string | null;
	stores: { name: string } | null;
};

type Line = {
	receipt_id: string;
	raw_text: string | null;
	name: string | null;
	category: string | null;
	quantity: number | null;
	unit: string | null;
	unit_price_cents: number | null;
	total_cents: number | null;
	products: { name: string } | null;
};

// Everything a shopper put in, as they would read it: no ids, match keys, logs or AI usage.
// Row level security keeps every ask to their own rows.
export async function exportSheets(supabase: SupabaseClient) {
	const [receipts, lines, settings] = await Promise.all([
		every<Receipt>((from, to) =>
			supabase
				.from('receipts')
				.select('id, purchased_on, channel, subtotal_cents, tax_cents, total_cents, store_address, image_path, stores(name)')
				.in('status', ['saved', 'review'])
				.order('purchased_on', { ascending: false, nullsFirst: false })
				.order('id')
				.range(from, to)
				.overrideTypes<Receipt[], { merge: false }>()
		),
		every<Line>((from, to) =>
			supabase
				.from('receipt_items')
				.select('receipt_id, raw_text, name, category, quantity, unit, unit_price_cents, total_cents, products!product_id(name)')
				.eq('kind', 'item')
				.order('receipt_id')
				.order('position')
				.range(from, to)
				.overrideTypes<Line[], { merge: false }>()
		),
		supabase.from('user_settings').select('shopping_list').maybeSingle()
	]);
	if (settings.error) throw settings.error;

	const byId = new Map(receipts.map((r) => [r.id, r]));
	const store = (r: Receipt | undefined) => r?.stores?.name ?? null;
	const sheets: Sheet[] = [
		{
			name: 'Receipts',
			money: [4, 5, 6],
			rows: [
				['Date', 'Store', 'Address', 'Where', 'Subtotal', 'Tax', 'Total'],
				...receipts.map((r) => [r.purchased_on, store(r), r.store_address, WHERE[r.channel ?? ''] ?? null, dollars(r.subtotal_cents), dollars(r.tax_cents), dollars(r.total_cents)])
			]
		},
		{
			name: 'Items',
			money: [6, 7],
			rows: [
				['Date', 'Store', 'As printed', 'Item', 'Aisle', 'Quantity', 'Unit price', 'Paid'],
				...lines
					.filter((line) => byId.has(line.receipt_id))
					.map((line) => {
						const r = byId.get(line.receipt_id);
						const quantity = line.quantity === null ? null : line.unit && line.unit !== 'ea' ? `${line.quantity} ${line.unit}` : line.quantity;
						return [r?.purchased_on ?? null, store(r), line.raw_text, line.products?.name ?? line.name, line.category, quantity, dollars(line.unit_price_cents), dollars(line.total_cents)];
					})
			]
		},
		{ name: 'My list', rows: [['Item'], ...((settings.data?.shopping_list as string[] | undefined) ?? []).map((item) => [item])] }
	];
	return { sheets, photos: receipts.filter((r) => r.image_path).map((r) => ({ path: r.image_path!, date: r.purchased_on, store: store(r) })) };
}

const fileSafe = (text: string) => text.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'receipt';

// Kept photos as short-lived links the browser fetches and zips itself: a server answer is capped at
// 4.5 MB, far under a year of receipt photos.
export async function photoLinks(supabase: SupabaseClient, photos: { path: string; date: string | null; store: string | null }[]) {
	if (!photos.length) return [];
	const { data, error } = await supabase.storage.from('receipts').createSignedUrls(photos.map((p) => p.path), 600);
	if (error) throw error;
	const taken = new Set<string>();
	return photos.flatMap((photo, i) => {
		const url = data[i]?.signedUrl;
		if (!url) return [];
		const base = `${photo.date ?? 'undated'}-${fileSafe(photo.store ?? 'receipt')}`;
		let name = base;
		for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
		taken.add(name);
		return [{ name: `${name}.jpg`, url }];
	});
}
