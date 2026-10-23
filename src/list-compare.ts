export type ListPrice = { name: string; store: string; per: string; cents: number; bought_on: string | null };

export type ListItem = { name: string; per: string | null; prices: { store: string; cents: number }[]; lowest: number | null; lastOn: string | null };
export type StoreTotal = { store: string; cents: number; has: number; cheapest: number; missing: string[] };

const key = (name: string) => name.trim().toLowerCase();

// For each item, its last price at every store; for each store, what the list costs there, how many
// items are cheapest there, and which items it never had. Prices are per unit, so a weighed item
// counts as one pound. Ties for cheapest count for every store in the tie.
export function compareStores(list: string[], rows: ListPrice[]) {
	const items: ListItem[] = list.map((name) => {
		let mine = rows.filter((row) => key(row.name) === key(name));
		const lastOn = mine.reduce<string | null>((last, row) => (row.bought_on && (!last || row.bought_on > last) ? row.bought_on : last), null);
		// compare like with like when a store sold it by the pound and another by the piece
		const pounds = mine.filter((row) => row.per === 'lb').length;
		const per = mine.length ? (pounds * 2 > mine.length ? 'lb' : 'ea') : null;
		mine = mine.filter((row) => row.per === per);
		const prices = mine.map(({ store, cents }) => ({ store, cents })).sort((a, b) => a.cents - b.cents);
		return { name, per, prices, lowest: prices[0]?.cents ?? null, lastOn };
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

// a list's own name, tidied; null when empty or too long
export function listTitle(typed: unknown): string | null {
	const name = String(typed ?? '').replace(/\s+/g, ' ').trim();
	return name && name.length <= 30 ? name : null;
}

// what this month's receipts spent on the things on a list
export function spentOn(list: string[], lines: { name: string; cents: number }[]) {
	const wanted = new Set(list.map(key));
	return lines.reduce((sum, line) => sum + (wanted.has(key(line.name)) ? line.cents : 0), 0);
}

// a typed item, tidied; null when it is not worth keeping
export function listName(typed: unknown): string | null {
	const name = String(typed ?? '').replace(/\s+/g, ' ').trim();
	return name && name.length <= 60 ? name : null;
}

export type ListPin = { store: string; lat: number; lng: number; items: string[]; cents: number };

// One pin per store that has something on the list at its lowest, at the shopper's nearest home branch
// of it: which items and what they add up to there. Places come nearest first. O(items x stores).
export function listPins(items: ListItem[], places: { name: string; lat: number; lng: number; away: boolean }[]): ListPin[] {
	const pins = new Map<string, ListPin>();
	for (const item of items) {
		for (const price of item.prices.filter((p) => p.cents === item.lowest)) {
			let pin = pins.get(price.store);
			if (!pin) {
				const place = places.find((p) => p.name === price.store && !p.away);
				if (!place) continue;
				pin = { store: price.store, lat: place.lat, lng: place.lng, items: [], cents: 0 };
				pins.set(price.store, pin);
			}
			pin.items.push(item.name);
			pin.cents += price.cents;
		}
	}
	return [...pins.values()];
}
