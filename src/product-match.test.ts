import { describe, expect, it } from 'vitest';
import { matchKey, numbersConflict, pickProducts, chunks } from './product-match';

describe('match key', () => {
	it('is the same for plurals, word order, capitals and punctuation', () => {
		expect(matchKey('Bananas')).toBe(matchKey('Banana'));
		expect(matchKey('Tomatoes')).toBe(matchKey('tomato'));
		expect(matchKey('Strawberries')).toBe(matchKey('Strawberry'));
		expect(matchKey('Cookies')).toBe(matchKey('Cookie'));
		expect(matchKey('Peaches')).toBe(matchKey('Peach'));
		expect(matchKey('Milk, whole')).toBe(matchKey('Whole milk'));
		expect(matchKey('Peanut butter, creamy')).toBe(matchKey('Creamy peanut butter'));
		expect(matchKey('Ground beef 80/20')).toBe(matchKey('80/20 ground beef'));
	});

	it('leaves out pack sizes, which are kept apart on each line', () => {
		expect(matchKey('Large eggs, 12 ct')).toBe(matchKey('Large eggs, 18 ct'));
		expect(matchKey('Whole milk 64OZ')).toBe(matchKey('Whole milk'));
		expect(matchKey('Mustard seed 200GM')).toBe(matchKey('Mustard seed'));
	});

	it('keeps words that end in ss or us, and words of three letters', () => {
		expect(matchKey('Swiss cheese')).toBe('cheese swiss');
		expect(matchKey('Hummus')).toBe('hummus');
		expect(matchKey('Gas')).toBe('gas');
		expect(matchKey('Peas')).toBe(matchKey('Pea'));
	});

	it('keeps different products apart', () => {
		expect(matchKey('Whole milk')).not.toBe(matchKey('2% milk'));
		expect(matchKey('Organic bananas')).not.toBe(matchKey('Bananas'));
		expect(matchKey('Sweet potatoes')).not.toBe(matchKey('Potatoes'));
	});
});

describe('numbers conflict', () => {
	it('when the numbers differ or only one name has them', () => {
		expect(numbersConflict('2% milk', '1% milk')).toBe(true);
		expect(numbersConflict('Ground beef 80/20', 'Ground beef 93/7')).toBe(true);
		expect(numbersConflict('2% milk', 'Milk')).toBe(true);
	});

	it('not when only the pack size differs', () => {
		expect(numbersConflict('Large eggs, 12 ct', 'Large eggs, 18 ct')).toBe(false);
		expect(numbersConflict('Whole milk 64OZ', 'Whole milk')).toBe(false);
		expect(numbersConflict('2% milk 1 gal', '2% milk')).toBe(false);
	});

	it('not when the numbers match, in any order', () => {
		expect(numbersConflict('Whole milk', 'Milk, whole')).toBe(false);
		expect(numbersConflict('80/20 ground beef', 'Ground beef 80/20')).toBe(false);
	});
});

describe('picking products', () => {
	const c = (slot: number, id: string, similarity: number) => ({ slot, id, name: id, similarity });

	it('takes the closest product the judge called the same', () => {
		const picks = pickProducts(1, [c(0, 'a', 0.9), c(0, 'b', 0.95)], ['same', 'same']);
		expect(picks).toEqual([{ same: 'b', maybe: null }]);
	});

	it('never merges on unsure, but offers it to the shopper', () => {
		expect(pickProducts(1, [c(0, 'a', 0.9)], ['unsure'])).toEqual([{ same: null, maybe: 'a' }]);
	});

	it('drops the offer once a product is the same', () => {
		expect(pickProducts(1, [c(0, 'a', 0.97), c(0, 'b', 0.9)], ['unsure', 'same'])).toEqual([{ same: 'b', maybe: null }]);
	});

	it('leaves a name new when every candidate is different, a verdict is missing, or nothing was close', () => {
		expect(pickProducts(3, [c(0, 'a', 0.9), c(1, 'b', 0.9)], ['different'])).toEqual([
			{ same: null, maybe: null },
			{ same: null, maybe: null },
			{ same: null, maybe: null }
		]);
	});
});

describe('chunks', () => {
	it('cuts a list into runs, keeping the order and the last short run', () => {
		expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
		expect(chunks([], 12)).toEqual([]);
		expect(chunks([1, 2], 12)).toEqual([[1, 2]]);
	});
});
