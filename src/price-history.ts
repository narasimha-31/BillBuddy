export type Purchase = {
	name: string;
	category: string | null;
	store: string | null;
	date: string | null;
	channel: string | null;
	quantity: number;
	unit: string;
	unitPriceCents: number | null;
	totalCents: number;
};

export type Paid = Purchase & { per: 'lb' | 'ea'; unitCents: number };

export type History = {
	name: string;
	per: 'lb' | 'ea';
	last: Paid;
	change: { cents: number; percent: number } | null;
	visits: Paid[];
	stores: { store: string; lastCents: number; lowestCents: number; times: number }[];
};

const key = (name: string) => name.trim().toLowerCase();

// price per pound for weighed items, price each for everything else
function paid(p: Purchase): Paid | null {
	const per = p.unit.toLowerCase() === 'lb' ? 'lb' : 'ea';
	const unitCents = p.unitPriceCents ?? (p.quantity > 0 ? Math.round(p.totalCents / p.quantity) : null);
	if (unitCents === null || unitCents <= 0) return null;
	return { ...p, per, unitCents };
}

// newest first; undated purchases go last
const byDate = (a: Purchase, b: Purchase) => (b.date ?? '').localeCompare(a.date ?? '');

export function itemsBought(purchases: Purchase[]): { name: string; times: number; lastDate: string | null }[] {
	const seen = new Map<string, { name: string; times: number; lastDate: string | null }>();
	for (const p of [...purchases].sort(byDate)) {
		const found = seen.get(key(p.name));
		if (found) found.times++;
		else seen.set(key(p.name), { name: p.name, times: 1, lastDate: p.date });
	}
	return [...seen.values()].sort((a, b) => b.times - a.times || (b.lastDate ?? '').localeCompare(a.lastDate ?? ''));
}

export function historyOf(purchases: Purchase[], name: string): History | null {
	const all = purchases
		.filter((p) => key(p.name) === key(name))
		.map(paid)
		.filter((p) => p !== null)
		.sort(byDate);
	if (!all.length) return null;

	// compare like with like: per pound with per pound, each with each
	const per = all[0].per;
	const visits = all.filter((p) => p.per === per);
	const [last, previous] = visits;

	const stores = new Map<string, History['stores'][number]>();
	for (const v of visits) {
		const store = v.store ?? 'Unknown store';
		const found = stores.get(store);
		if (found) {
			found.times++;
			found.lowestCents = Math.min(found.lowestCents, v.unitCents);
		} else stores.set(store, { store, lastCents: v.unitCents, lowestCents: v.unitCents, times: 1 });
	}

	return {
		name: last.name,
		per,
		last,
		change: previous
			? {
					cents: last.unitCents - previous.unitCents,
					percent: Math.round(((last.unitCents - previous.unitCents) / previous.unitCents) * 100)
				}
			: null,
		visits,
		stores: [...stores.values()].sort((a, b) => a.lastCents - b.lastCents)
	};
}
