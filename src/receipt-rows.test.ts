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
const named = (name: string, flag: Named['flag'] = 'ok'): Named => ({ name, brand: null, category: 'Other', flag, from: 'ai' });

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
			[line('SHITTY AVOCADO', 199), line('BILLBUDDY SUCKS', 1), line('PASTA', 114)],
			[named('Hidden line', 'offensive'), named('Not a grocery item', 'not_grocery'), named('Pasta')]
		);
		expect(skipped).toBe(2);
		expect(rows.map((r) => r.raw_text)).toEqual(['PASTA']);
		expect(rows[0].position).toBe(0);
		expect(JSON.stringify(rows)).not.toMatch(/SHITTY|BILLBUDDY/);
	});

	it('keeps unreadable lines for review without a made-up name', () => {
		const { rows } = itemRows([line('XQZ 4/', 250)], [named('XQZ 4/', 'unreadable')]);
		expect(rows[0]).toMatchObject({ name: null, brand: null, category: null, issue: 'unreadable' });
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
});
