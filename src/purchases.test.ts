import { describe, expect, it } from 'vitest';
import { toPurchases, type ItemRow } from './purchases';

const row = (over: Partial<ItemRow>): ItemRow => ({
	name: 'Bananas',
	category: 'Produce',
	quantity: 2.1,
	unit: 'lb',
	unit_price_cents: 56,
	total_cents: 118,
	receipts: { purchased_on: '2026-10-09', channel: 'in_store', stores: { name: 'Walmart' } },
	...over
});

describe('toPurchases', () => {
	it('flattens a line and its receipt into one purchase', () => {
		expect(toPurchases([row({})])).toEqual([
			{ name: 'Bananas', category: 'Produce', store: 'Walmart', date: '2026-10-09', channel: 'in_store', quantity: 2.1, unit: 'lb', unitPriceCents: 56, totalCents: 118 }
		]);
	});

	it('reads joined rows whether they come back as an object or a list', () => {
		const listed = toPurchases([row({ receipts: [{ purchased_on: '2026-10-01', channel: 'delivery', stores: [{ name: 'Kroger' }] }] })]);
		expect(listed[0]).toMatchObject({ store: 'Kroger', date: '2026-10-01', channel: 'delivery' });
	});

	it('keeps a purchase whose store name was not kept', () => {
		expect(toPurchases([row({ receipts: { purchased_on: null, channel: null, stores: null } })])[0].store).toBeNull();
	});

	it('drops unnamed lines and lines with no receipt', () => {
		expect(toPurchases([row({ name: null }), row({ receipts: null }), row({ receipts: [] })])).toEqual([]);
	});

	it('turns a numeric quantity sent as text into a number', () => {
		expect(toPurchases([row({ quantity: '1.25' as unknown as number })])[0].quantity).toBe(1.25);
	});
});
