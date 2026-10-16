import { describe, expect, it } from 'vitest';
import { matchKey, numbersConflict } from './product-match';

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
		expect(matchKey('Large eggs, 12 ct')).not.toBe(matchKey('Large eggs, 18 ct'));
	});
});

describe('numbers conflict', () => {
	it('when the numbers differ or only one name has them', () => {
		expect(numbersConflict('2% milk', '1% milk')).toBe(true);
		expect(numbersConflict('Ground beef 80/20', 'Ground beef 93/7')).toBe(true);
		expect(numbersConflict('Large eggs, 12 ct', 'Large eggs, 18 ct')).toBe(true);
		expect(numbersConflict('2% milk', 'Milk')).toBe(true);
	});

	it('not when the numbers match, in any order', () => {
		expect(numbersConflict('Whole milk', 'Milk, whole')).toBe(false);
		expect(numbersConflict('80/20 ground beef', 'Ground beef 80/20')).toBe(false);
		expect(numbersConflict('1.5 lb chicken', 'Chicken 1.5 lb')).toBe(false);
	});
});
