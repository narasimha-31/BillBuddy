import { describe, expect, it } from 'vitest';
import { readEdits } from './review-edits';

const form = (entries: Record<string, string>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.set(key, value);
	return data;
};

describe('readEdits', () => {
	it('reads the edited name and category for each line of the receipt', () => {
		const result = readEdits(form({ name_a: '  Green chillies,   hot ', category_a: 'Produce' }), ['a']);
		expect(result).toEqual({ ok: true, edits: [{ id: 'a', name: 'Green chillies, hot', category: 'Produce' }] });
	});

	it('ignores lines that are not on this receipt, even if the form sends them', () => {
		const result = readEdits(form({ name_a: 'Milk', category_a: 'Dairy & eggs', name_other: 'Hijack', category_other: 'Other' }), ['a']);
		expect(result.ok && result.edits.map((e) => e.id)).toEqual(['a']);
	});

	it('leaves a line with a blank name as printed instead of asking for one', () => {
		expect(readEdits(form({ name_a: '   ', category_a: 'Produce', name_b: 'Milk', category_b: 'Dairy & eggs' }), ['a', 'b'])).toEqual({
			ok: true,
			edits: [{ id: 'b', name: 'Milk', category: 'Dairy & eggs' }]
		});
	});

	it('refuses an overlong name and an unknown category', () => {
		expect(readEdits(form({ name_a: 'x'.repeat(121), category_a: 'Produce' }), ['a'])).toEqual({ ok: false, problem: 'a name is too long' });
		expect(readEdits(form({ name_a: 'Milk', category_a: 'Weapons' }), ['a'])).toEqual({ ok: false, problem: 'pick a category from the list' });
	});

	it('strips markup and control characters from names', () => {
		const result = readEdits(form({ name_a: '<img src=x onerror=alert(1)>Milk\u0000', category_a: 'Dairy & eggs' }), ['a']);
		expect(result.ok && result.edits[0].name).toBe('img src=x onerror=alert(1)Milk');
	});

	it('skips lines the form did not include', () => {
		expect(readEdits(form({}), ['a', 'b'])).toEqual({ ok: true, edits: [] });
	});
});
