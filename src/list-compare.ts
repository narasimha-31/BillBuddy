export type ListPrice = { name: string; store: string; per: string; cents: number; bought_on: string | null };

export type ListItem = { name: string; per: string | null; prices: { store: string; cents: number }[]; lowest: number | null };
export type StoreTotal = { store: string; cents: number; has: number; cheapest: number; missing: string[] };

const key = (name: string) => name.trim().toLowerCase();

// For each item, its last price at every store; for each store, what the list costs there, how many
// items are cheapest there, and which items it never had. Prices are per unit, so a weighed item
// counts as one pound. Ties for cheapest count for every store in the tie.
export function compareStores(list: string[], rows: ListPrice[]) {
	const items: ListItem[] = list.map((name) => {
		let mine = rows.filter((row) => key(row.name) === key(name));
		// compare like with like when a store sold it by the pound and another by the piece
		const pounds = mine.filter((row) => row.per === 'lb').length;
		const per = mine.length ? (pounds * 2 > mine.length ? 'lb' : 'ea') : null;
		mine = mine.filter((row) => row.per === per);
		const prices = mine.map(({ store, cents }) => ({ store, cents })).sort((a, b) => a.cents - b.cents);
		return { name, per, prices, lowest: prices[0]?.cents ?? null };
	});

	const priced = items.filter((item) => item.prices.length);
	const stores: StoreTotal[] = [...new Set(priced.flatMap((item) => item.prices.map((p) => p.store)))].map((store) => {
		const total: StoreTotal = { store, cents: 0, has: 0, cheapest: 0, missing: [] };
		for (const item of priced) {
			const here = item.prices.find((p) => p.store === store);
			if (!here) {
				total.missing.push(item.name);
				continue;
			}
			total.cents += here.cents;
			total.has++;
			if (here.cents === item.lowest) total.cheapest++;
		}
		return total;
	});
	// the store that has the most of the list first, then the cheaper one
	stores.sort((a, b) => b.has - a.has || a.cents - b.cents || a.store.localeCompare(b.store));

	const split = priced.reduce((sum, item) => sum + (item.lowest ?? 0), 0);
	const splitStores = new Set(priced.map((item) => item.prices[0].store)).size;
	return { items, stores, split: { cents: split, stores: splitStores }, unpriced: items.filter((item) => !item.prices.length).map((item) => item.name) };
}

// a typed item, tidied; null when it is not worth keeping
export function listName(typed: unknown): string | null {
	const name = String(typed ?? '').replace(/\s+/g, ' ').trim();
	return name && name.length <= 60 ? name : null;
}
