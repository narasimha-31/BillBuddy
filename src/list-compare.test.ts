import { describe, expect, it } from 'vitest';
import { compareStores, listName, type ListPrice } from './list-compare';

const row = (name: string, store: string, cents: number, per = 'ea'): ListPrice => ({ name, store, per, cents, bought_on: '2026-10-01' });

describe('compareStores', () => {
	const rows = [
		row('Whole milk', 'Fiesta', 349),
		row('Whole milk', 'H-E-B', 299),
		row('Okra', 'Fiesta', 199, 'lb'),
		row('Okra', 'Parivar', 149, 'lb'),
		row('Bananas', 'H-E-B', 25),
		row('Bananas', 'Fiesta', 25)
	];

	it('totals each store, counts where items are cheapest and lists what a store never had', () => {
		const { stores, split, unpriced } = compareStores(['whole milk', 'Okra', 'Bananas', 'Saffron'], rows);
		expect(stores).toEqual([
			{ store: 'Fiesta', cents: 349 + 199 + 25, has: 3, cheapest: 1, missing: [] },
			{ store: 'H-E-B', cents: 299 + 25, has: 2, cheapest: 2, missing: ['Okra'] },
			{ store: 'Parivar', cents: 149, has: 1, cheapest: 1, missing: ['whole milk', 'Bananas'] }
		]);
		expect(split).toEqual({ cents: 299 + 149 + 25, stores: 2 });
		expect(unpriced).toEqual(['Saffron']);
	});

	it('compares a weighed item only with the same unit', () => {
		const { items } = compareStores(['Okra'], [...rows, row('Okra', 'H-E-B', 99, 'ea')]);
		expect(items[0]).toMatchObject({ per: 'lb', lowest: 149, prices: [{ store: 'Parivar', cents: 149 }, { store: 'Fiesta', cents: 199 }] });
	});

	it('handles an empty list', () => {
		expect(compareStores([], rows)).toEqual({ items: [], stores: [], split: { cents: 0, stores: 0 }, unpriced: [] });
	});
});

describe('listName', () => {
	it('tidies spaces and refuses blank or very long names', () => {
		expect(listName('  whole   milk ')).toBe('whole milk');
		expect(listName('   ')).toBeNull();
		expect(listName('x'.repeat(61))).toBeNull();
		expect(listName(null)).toBeNull();
	});
});
