import { money, storeName } from './format';

export type Paid = { on: string; store: string | null; cents: number; receipt: string; item: string };

const step = (cents: number) => (cents < 100 ? `${cents}¢` : money(cents));

// Two purchases at one store are a price that moved; at two stores they say where it is cheaper.
export function changeLine(c: { now_cents: number; before_cents: number; store: string | null; before_store: string | null }, per = '') {
	const diff = c.now_cents - c.before_cents;
	if (c.store === c.before_store)
		return { tone: diff > 0 ? 'up' : 'down', text: `${diff > 0 ? 'Up' : 'Down'} ${step(Math.abs(diff))} at ${storeName(c.store) ?? 'the same store'}` } as const;
	const [cheapStore, cheapCents] = diff < 0 ? [c.store, c.now_cents] : [c.before_store, c.before_cents];
	return { tone: 'down', text: `Cheaper at ${storeName(cheapStore) ?? 'another store'} · ${money(cheapCents)}${per}` } as const;
}

// in the short history the lowest price reads green and the highest red, when they differ
export function toneOf(history: Paid[], cents: number) {
	const prices = history.map((h) => h.cents);
	const [low, high] = [Math.min(...prices), Math.max(...prices)];
	if (low === high) return null;
	return cents === low ? 'down' : cents === high ? 'up' : null;
}
