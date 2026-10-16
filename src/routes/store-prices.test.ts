import { describe, expect, it } from 'vitest';
import { LINES_PER_RECEIPT, cartTotals, comparisons, priceOf, receiptFor, rotation } from './store-prices';

const store = (name: string) => rotation.find((s) => s.name === name)!;
const everyLine = (name: string) => [0, 1, 2, 3, 4].flatMap((visit) => receiptFor(store(name), visit));
const line = (name: string, label: string) => everyLine(name).find((l) => l.label === label);

describe('store receipts', () => {
	it('rotates only stores that can fill a whole receipt', () => {
		expect(rotation.map((s) => s.name)).toEqual(['H-E-B', 'Walmart', 'Kroger', 'Aldi', 'Target']);
	});

	it('always prints the same number of lines so the receipt never changes size', () => {
		for (const s of rotation) {
			for (const visit of [0, 1, 2, 3]) expect(receiptFor(s, visit)).toHaveLength(LINES_PER_RECEIPT);
		}
	});

	it('shows different products on the next visit to a big store', () => {
		const first = receiptFor(store('Walmart'), 0).map((l) => l.label);
		const second = receiptFor(store('Walmart'), 1).map((l) => l.label);
		expect(second).not.toEqual(first);
	});

	it('marks the lowest price as cheapest across every store that lists it, rotating or not', () => {
		expect(line('Aldi', 'BANANAS')?.versus).toEqual({ kind: 'cheapest', of: 6 });
	});

	it('compares a higher price against the cheapest store, including ones that do not rotate', () => {
		expect(line('Target', 'LARGE EGGS 12CT')?.versus).toEqual({ kind: 'more', percent: 66, store: 'H-E-B' });
		expect(line('Walmart', 'WHOLE MILK GAL')?.versus).toEqual({ kind: 'more', percent: 29, store: 'Wegmans' });
	});

	it('prices weighed items by the pound and keeps totals in whole cents', () => {
		const chicken = line('Walmart', 'CHICKEN BREAST');
		expect(chicken).toMatchObject({ qty: '1.62 LB', unitPrice: '$3.61/LB', totalCents: 585 });
	});
});

describe('comparisons', () => {
	const eggs = comparisons().find((c) => c.key === 'eggs')!;

	it('lists every store price for a product, cheapest first', () => {
		expect(eggs.prices[0]).toEqual({ store: 'H-E-B', price: 1.47 });
		expect(eggs.prices.map((p) => p.price)).toEqual([...eggs.prices.map((p) => p.price)].sort((a, b) => a - b));
		expect(eggs.prices).toHaveLength(7);
	});

	it('includes the US average only where the government series matches the product', () => {
		expect(eggs.usAverage).toBe(2.27);
		expect(comparisons().find((c) => c.key === 'cereal')!.usAverage).toBeNull();
	});

	it('marks weighed products as priced by the pound', () => {
		expect(comparisons().find((c) => c.key === 'chicken')!.unit).toBe('LB');
	});
});

describe('cartTotals', () => {
	it('adds the same seven staples in whole cents at every store that prices all of them', () => {
		expect(cartTotals()).toEqual([
			{ store: 'Aldi', cents: 1639 },
			{ store: 'Walmart', cents: 1858 },
			{ store: 'Kroger', cents: 1943 },
			{ store: 'Target', cents: 2066 }
		]);
	});

	it('leaves out a store that is missing any item in the cart', () => {
		expect(cartTotals(['milk', 'chicken']).map((t) => t.store)).not.toContain('Publix');
	});
});

describe('priceOf', () => {
	it('gives the sourced price, or nothing when the store has none', () => {
		expect(priceOf('Wegmans', 'chicken')).toBe(2.29);
		expect(priceOf('Publix', 'chicken')).toBeNull();
	});
});
