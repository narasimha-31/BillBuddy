import { describe, expect, it } from 'vitest';
import { compareStores, listName, listPins, listTitle, spentOn, type ListPrice } from './list-compare';

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

	it('keeps the latest day each item was bought, at any store', () => {
		const { items } = compareStores(['Whole milk', 'Saffron'], [...rows, { ...row('Whole milk', 'Target', 399), bought_on: '2026-10-20' }]);
		expect(items.map((i) => i.lastOn)).toEqual(['2026-10-20', null]);
	});

	it('handles an empty list', () => {
		expect(compareStores([], rows)).toEqual({ items: [], stores: [], split: { cents: 0, stores: 0 }, unpriced: [] });
	});
});

describe('listTitle', () => {
	it('keeps a short name and refuses blank or long ones', () => {
		expect(listTitle('  Keto   week ')).toBe('Keto week');
		expect(listTitle('')).toBeNull();
		expect(listTitle('x'.repeat(31))).toBeNull();
	});
});

describe('spentOn', () => {
	it('adds up only the lines on the list, whatever the case', () => {
		const lines = [
			{ name: 'Whole milk', cents: 349 },
			{ name: 'whole milk', cents: 299 },
			{ name: 'Okra', cents: 150 }
		];
		expect(spentOn(['Whole Milk', 'Paneer'], lines)).toBe(648);
		expect(spentOn([], lines)).toBe(0);
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

describe('listPins', () => {
	const rows: ListPrice[] = [
		{ name: 'Okra', store: 'H-E-B', per: 'lb', cents: 199, bought_on: null },
		{ name: 'Okra', store: 'Kroger', per: 'lb', cents: 249, bought_on: null },
		{ name: 'Milk', store: 'Kroger', per: 'ea', cents: 350, bought_on: null },
		{ name: 'Milk', store: 'H-E-B', per: 'ea', cents: 350, bought_on: null },
		{ name: 'Eggs', store: 'Aldi', per: 'ea', cents: 300, bought_on: null }
	];
	const { items } = compareStores(['Okra', 'Milk', 'Eggs', 'Saffron'], rows);
	const near = { name: 'H-E-B', lat: 29.7, lng: -95.4, away: false };

	it('adds up what is cheapest at each store, ties at both', () => {
		const pins = listPins(items, [near, { name: 'H-E-B', lat: 30, lng: -95, away: false }, { name: 'Kroger', lat: 29.8, lng: -95.3, away: false }]);
		expect(pins).toEqual([
			{ store: 'H-E-B', lat: 29.7, lng: -95.4, items: ['Okra', 'Milk'], cents: 549 },
			{ store: 'Kroger', lat: 29.8, lng: -95.3, items: ['Milk'], cents: 350 }
		]);
	});

	it('skips a store with no home branch on the map', () => {
		const pins = listPins(items, [near, { name: 'Aldi', lat: 41, lng: -87, away: true }]);
		expect(pins.map((p) => p.store)).toEqual(['H-E-B']);
	});
});
