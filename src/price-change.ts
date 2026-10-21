import { money, storeName } from './format';

export type Paid = { on: string; store: string | null; cents: number; receipt: string; item: string };

const step = (cents: number) => (cents < 100 ? `${cents}¢` : money(cents));

// Two purchases at one store are a price that moved; at two stores they say where it is cheaper.
export function changeLine(c: { now_cents: number; before_cents: number; store: string | null; before_store: string | null }, per = '') {
	const diff = c.now_cents - c.before_cents;
	if (c.store === c.before_store)
		return { tone: diff > 0 ? 'up' : 'down', text: `${diff > 0 ? 'Up' : 'Down'} ${step(Math.abs(diff))} at ${storeName(c.store) ?? 'the same store'}` } as const;
	// the row already shows the latest price and store, so a cheaper latest buy is told against the other store
	if (diff < 0) return { tone: 'down', text: `${step(-diff)} less than ${storeName(c.before_store) ?? 'the other store'}` } as const;
	return { tone: 'down', text: `Cheaper at ${storeName(c.before_store) ?? 'another store'} · ${money(c.before_cents)}${per}` } as const;
}

// in the short history only the lowest price stands out; red stays for a price that went up
export function isLowest(history: Paid[], cents: number) {
	const prices = history.map((h) => h.cents);
	return Math.min(...prices) !== Math.max(...prices) && cents === Math.min(...prices);
}
