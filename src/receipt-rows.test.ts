import { describe, expect, it } from 'vitest';
import type { CheckedLine } from './receipt-check';
import type { Named } from './item-names';
import { itemRows } from './receipt-rows';

const line = (raw: string, totalCents: number, extra: Partial<CheckedLine> = {}): CheckedLine => ({
	raw,
	quantity: 1,
	unit: 'ea',
	unitPriceCents: null,
	totalCents,
	kind: 'item',
	computed: false,
	issue: null,
	...extra
});
const named = (name: string, flag: Named['flag'] = 'ok', extra: Partial<Named> = {}): Named => ({ name, brand: null, category: 'Other', sizeAmount: null, sizeUnit: null, flag, from: 'ai', ...extra });

describe('itemRows', () => {
	it('pairs each item line with its name and keeps the line numbers tight', () => {
		const { rows, skipped } = itemRows([line('GV WHL MLK GAL', 321), line('BANANAS', 118)], [named('Whole milk, 1 gal'), named('Bananas')]);
		expect(skipped).toBe(0);
		expect(rows.map((r) => [r.position, r.raw_text, r.name, r.total_cents])).toEqual([
			[0, 'GV WHL MLK GAL', 'Whole milk, 1 gal', 321],
			[1, 'BANANAS', 'Bananas', 118]
		]);
	});

	it('names discount lines itself, without using up an item name', () => {
		const { rows } = itemRows(
			[line('MILK', 321), line('ROLLBACK SAVINGS', -50, { kind: 'discount' }), line('EGGS', 210)],
			[named('Whole milk'), named('Eggs')]
		);
		expect(rows.map((r) => [r.kind, r.name, r.total_cents])).toEqual([
			['item', 'Whole milk', 321],
			['discount', 'Savings', -50],
			['item', 'Eggs', 210]
		]);
	});

	it('drops offensive and non-grocery lines, counts them, and never stores their text', () => {
		const { rows, skipped } = itemRows(
			[line('SHITTY AVOCADO', 199), line('PRICETRAIL SUCKS', 1), line('PASTA', 114)],
			[named('Hidden line', 'offensive'), named('Not a grocery item', 'not_grocery'), named('Pasta')]
		);
		expect(skipped).toBe(2);
		expect(rows.map((r) => r.raw_text)).toEqual(['PASTA']);
		expect(rows[0].position).toBe(0);
		expect(JSON.stringify(rows)).not.toMatch(/SHITTY|PRICETRAIL/);
	});

	it('keeps a line the model could not name under its receipt text, marked for the shopper to check', () => {
		const { rows } = itemRows([line('XQZ 4/', 250)], [named('XQZ 4/', 'unreadable')]);
		expect(rows[0]).toMatchObject({ raw_text: 'XQZ 4/', name: null, brand: null, category: null, issue: 'unsure' });
	});

	it('keeps the best guess for a name the model was unsure of, marked for the shopper to check', () => {
		const { rows } = itemRows([line('CF ORGT SAUCE', 399)], [named('CF ORGT SAUCE', 'unsure')]);
		expect(rows[0]).toMatchObject({ raw_text: 'CF ORGT SAUCE', issue: 'unsure' });
		expect(rows[0].name).not.toBeNull();
	});

	it('keeps a math issue found by the checks, over an unreadable name', () => {
		const { rows } = itemRows([line('BANANAS', 181, { issue: 'line_math' })], [named('BANANAS', 'unreadable')]);
		expect(rows[0].issue).toBe('line_math');
	});

	it('treats a missing name as skipped rather than shifting names onto the wrong lines', () => {
		const { rows, skipped } = itemRows([line('A', 100), line('B', 200)], [named('Apple')]);
		expect(rows.map((r) => [r.raw_text, r.name])).toEqual([['A', 'Apple']]);
		expect(skipped).toBe(1);
	});

	it('keeps the pack size apart from the product name', () => {
		const { rows } = itemRows([line('HEB WHOLE MILK 640Z', 185)], [named('Whole milk', 'ok', { brand: 'H-E-B', sizeAmount: 64, sizeUnit: 'oz' })]);
		expect(rows[0]).toMatchObject({ name: 'Whole milk', brand: 'H-E-B', size_amount: 64, size_unit: 'oz' });
	});
});
