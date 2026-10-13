import { describe, expect, it } from 'vitest';
import { historyOf, itemsBought, type Purchase } from './price-history';

const buy = (over: Partial<Purchase>): Purchase => ({
	name: 'Large eggs, 12 ct',
	category: 'Dairy & eggs',
	store: 'Walmart',
	date: '2026-10-01',
	channel: 'in_store',
	quantity: 1,
	unit: 'ea',
	unitPriceCents: null,
	totalCents: 210,
	...over
});

describe('historyOf', () => {
	it('finds the last price paid and how much it moved since the time before', () => {
		const h = historyOf(
			[buy({ date: '2026-09-01', totalCents: 250 }), buy({ date: '2026-10-01', totalCents: 210 }), buy({ date: '2026-08-01', totalCents: 300 })],
			'large eggs, 12 CT '
		)!;
		expect(h.last.date).toBe('2026-10-01');
		expect(h.last.unitCents).toBe(210);
		expect(h.change).toEqual({ cents: -40, percent: -16 });
		expect(h.visits.map((v) => v.date)).toEqual(['2026-10-01', '2026-09-01', '2026-08-01']);
	});

	it('uses the price per pound for weighed items, worked out when only the total was printed', () => {
		const h = historyOf(
			[
				buy({ name: 'Bananas', unit: 'lb', quantity: 2.1, unitPriceCents: 56, totalCents: 118 }),
				buy({ name: 'Bananas', unit: 'lb', quantity: 2, unitPriceCents: null, totalCents: 125, date: '2026-09-01' })
			],
			'Bananas'
		)!;
		expect(h.per).toBe('lb');
		expect(h.visits.map((v) => v.unitCents)).toEqual([56, 63]);
	});

	it('only compares a per pound price with other per pound prices', () => {
		const h = historyOf(
			[buy({ name: 'Bananas', unit: 'lb', quantity: 2, unitPriceCents: 56, totalCents: 112 }), buy({ name: 'Bananas', unit: 'ea', totalCents: 25, date: '2026-09-01' })],
			'Bananas'
		)!;
		expect(h.visits).toHaveLength(1);
		expect(h.change).toBeNull();
	});

	it('ranks stores by the last price paid there and keeps the lowest seen', () => {
		const h = historyOf(
			[
				buy({ store: 'Target', totalCents: 244, date: '2026-10-05' }),
				buy({ store: 'Walmart', totalCents: 210, date: '2026-10-01' }),
				buy({ store: 'Walmart', totalCents: 190, date: '2026-07-01' }),
				buy({ store: null, totalCents: 260, date: '2026-06-01' })
			],
			'Large eggs, 12 ct'
		)!;
		expect(h.stores).toEqual([
			{ store: 'Walmart', lastCents: 210, lowestCents: 190, times: 2 },
			{ store: 'Target', lastCents: 244, lowestCents: 244, times: 1 },
			{ store: 'Unknown store', lastCents: 260, lowestCents: 260, times: 1 }
		]);
	});

	it('skips lines with no usable price and returns nothing for an item never bought', () => {
		expect(historyOf([buy({ quantity: 0, totalCents: 0 })], 'Large eggs, 12 ct')).toBeNull();
		expect(historyOf([buy({ totalCents: -50 })], 'Large eggs, 12 ct')).toBeNull();
		expect(historyOf([buy({})], 'Caviar')).toBeNull();
	});

	it('puts undated purchases after dated ones', () => {
		const h = historyOf([buy({ date: null, totalCents: 999 }), buy({ date: '2026-01-01' })], 'Large eggs, 12 ct')!;
		expect(h.last.totalCents).toBe(210);
	});
});

describe('itemsBought', () => {
	it('lists each item once, most often bought first, ties broken by the most recent', () => {
		const list = itemsBought([
			buy({ name: 'Milk', date: '2026-10-01' }),
			buy({ name: 'milk', date: '2026-09-01' }),
			buy({ name: 'Bread', date: '2026-10-03' }),
			buy({ name: 'Eggs', date: '2026-10-05' })
		]);
		expect(list).toEqual([
			{ name: 'Milk', times: 2, lastDate: '2026-10-01' },
			{ name: 'Eggs', times: 1, lastDate: '2026-10-05' },
			{ name: 'Bread', times: 1, lastDate: '2026-10-03' }
		]);
	});
});
