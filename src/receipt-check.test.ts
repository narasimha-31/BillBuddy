import { describe, expect, it } from 'vitest';
import { checkReading, type Reading } from './receipt-check';

const line = (raw: string, total: number | null, extra: Partial<Reading['lines'][number]> = {}) => ({
	raw,
	total,
	quantity: null,
	unit: null,
	unit_price: null,
	discount: false,
	...extra
});

const reading = (overrides: Partial<Reading> = {}): Reading => ({
	kind: 'store_receipt',
	handwritten: false,
	store: 'Walmart',
	purchase_date: '2026-10-09',
	channel: 'in_store',
	lines: [line('GV WHL MLK GAL', 3.21), line('BANANAS', 1.18, { quantity: 2.1, unit: 'lb', unit_price: 0.56 })],
	subtotal: 4.39,
	tax: 0,
	total: 4.39,
	...overrides
});
const today = new Date('2026-10-11T12:00:00Z');

describe('checkReading', () => {
	it('keeps a normal receipt and finds nothing to review', () => {
		const result = checkReading(reading(), today);
		expect(result).toMatchObject({ ok: true, store: 'Walmart', purchasedOn: '2026-10-09', lines_match_subtotal: true, totals_match: true, needs_review: false });
		if (result.ok) {
			expect(result.lines[1]).toEqual({ raw: 'BANANAS', quantity: 2.1, unit: 'lb', unitPriceCents: 56, totalCents: 118, kind: 'item', computed: false, issue: null });
		}
	});

	it('refuses images that are not receipts, and handwritten bills', () => {
		expect(checkReading(reading({ kind: 'not_a_receipt' }), today)).toEqual({ ok: false, reason: 'not_a_receipt' });
		expect(checkReading(reading({ handwritten: true }), today)).toEqual({ ok: false, reason: 'handwritten' });
	});

	it('drops payment and identity lines even if the model transcribed them', () => {
		const payment = ['VISA ************4821', 'AUTH CODE: 08832A', 'CARD # XXXXXXXX1234', '4111111111111111', 'CHANGE DUE 5.61', 'CASHIER MARIA', 'MEMBER # 993021'];
		const result = checkReading(reading({ lines: [line('EGGS 12CT', 2.1), ...payment.map((p) => line(p, 1))] }), today);
		expect(result.ok && result.lines.map((l) => l.raw)).toEqual(['EGGS 12CT']);
	});

	it('keeps common grocery names, while credit and debit always count as payment words', () => {
		const groceries = ["MEMBER'S MARK EGGS", 'BIRTHDAY CARD', 'VISALIA ORANGES', 'CREDIT UNION CHOC BAR'];
		const result = checkReading(reading({ lines: groceries.map((g) => line(g, 2)) }), today);
		expect(result.ok && result.lines.map((l) => l.raw)).toEqual(["MEMBER'S MARK EGGS", 'BIRTHDAY CARD', 'VISALIA ORANGES']);
	});

	it('flags receipts whose lines do not add up to the subtotal', () => {
		const padded = reading({ lines: [line('GV WHL MLK GAL', 3.21), line('BILLBUDDY IS A SCAM', 0.5)], subtotal: 3.21, total: 3.21 });
		expect(checkReading(padded, today)).toMatchObject({ ok: true, lines_match_subtotal: false, needs_review: true });
	});

	it('tolerates a few cents of rounding against the subtotal', () => {
		expect(checkReading(reading({ subtotal: 4.42, total: 4.42 }), today)).toMatchObject({ lines_match_subtotal: true });
	});

	it('flags a line whose weight times price disagrees with its printed amount', () => {
		const misread = reading({ lines: [line('GV WHL MLK GAL', 3.21), line('BANANAS', 1.81, { quantity: 2.1, unit: 'lb', unit_price: 0.56 })], subtotal: 5.02, total: 5.02 });
		const result = checkReading(misread, today);
		expect(result).toMatchObject({ ok: true, needs_review: true });
		expect(result.ok && result.lines.map((l) => l.issue)).toEqual([null, 'line_math']);
	});

	it('works out a missing line amount itself instead of trusting the model', () => {
		const result = checkReading(reading({ lines: [line('GV WHL MLK GAL', 3.21), line('BANANAS', null, { quantity: 2.1, unit: 'lb', unit_price: 0.56 })] }), today);
		expect(result.ok && result.lines[1]).toMatchObject({ totalCents: 118, computed: true, issue: null });
	});

	it('skips a line with no printed amount and nothing to work it out from', () => {
		const result = checkReading(reading({ lines: [line('GV WHL MLK GAL', 3.21), line('MYSTERY', null)], subtotal: 3.21, total: 3.21 }), today);
		expect(result.ok && result.lines.map((l) => l.raw)).toEqual(['GV WHL MLK GAL']);
	});

	it('checks subtotal plus tax against the total', () => {
		expect(checkReading(reading({ tax: 0.36, total: 4.75 }), today)).toMatchObject({ totals_match: true, needs_review: false });
		expect(checkReading(reading({ tax: 0.36, total: 9.75 }), today)).toMatchObject({ totals_match: false, needs_review: true });
	});

	it('leaves the totals check open when the photo cut off a total', () => {
		expect(checkReading(reading({ total: null }), today)).toMatchObject({ totals_match: null });
		expect(checkReading(reading({ subtotal: null }), today)).toMatchObject({ lines_match_subtotal: false, totals_match: null, needs_review: true });
	});

	it('keeps discounts negative and rejects negative prices on normal items', () => {
		const result = checkReading(reading({ lines: [line('MILK', 3.21), line('SAVINGS', 0.5, { discount: true }), line('EGGS', -2)] }), today);
		expect(result.ok && result.lines.map((l) => [l.raw, l.totalCents, l.kind])).toEqual([
			['MILK', 321, 'item'],
			['SAVINGS', -50, 'discount']
		]);
	});

	it('ignores absurd prices, unknown units and silly quantities', () => {
		const result = checkReading(reading({ lines: [line('GOLD BAR', 50_000), line('APPLES', 4.88, { unit: 'bushel', quantity: -3 })] }), today);
		expect(result.ok && result.lines).toEqual([
			{ raw: 'APPLES', quantity: 1, unit: 'ea', unitPriceCents: null, totalCents: 488, kind: 'item', computed: false, issue: null }
		]);
	});

	it('drops impossible dates instead of storing them', () => {
		expect(checkReading(reading({ purchase_date: '2031-01-01' }), today)).toMatchObject({ purchasedOn: null });
		expect(checkReading(reading({ purchase_date: '1999-05-05' }), today)).toMatchObject({ purchasedOn: null });
		expect(checkReading(reading({ purchase_date: '10/09/2026' }), today)).toMatchObject({ purchasedOn: null });
	});

	it('refuses a reading with no real item lines', () => {
		expect(checkReading(reading({ lines: [line('VISA ****1234', 5)] }), today)).toEqual({ ok: false, reason: 'no_lines' });
	});

	it('caps the number of lines kept', () => {
		const many = Array.from({ length: 200 }, (_, i) => line(`ITEM ${i}`, 1));
		const result = checkReading(reading({ lines: many }), today);
		expect(result.ok && result.lines).toHaveLength(80);
	});
});
