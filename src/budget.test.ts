import { describe, expect, it } from 'vitest';
import { budgetFromForm, budgetLine } from './budget';

describe('budgetFromForm', () => {
	it('reads dollars the way people type them', () => {
		expect(budgetFromForm('400')).toBe(40000);
		expect(budgetFromForm(' $1,250 ')).toBe(125000);
		expect(budgetFromForm('99.5')).toBe(9950);
	});

	it('clears on blank and refuses anything else', () => {
		expect(budgetFromForm('')).toBeNull();
		expect(budgetFromForm(null)).toBeNull();
		for (const typo of ['abc', '-5', '0.50', '12.345', '1e3', '200000', '0']) expect(budgetFromForm(typo)).toBeUndefined();
	});
});

describe('budgetLine', () => {
	it('says what is left, or how far over', () => {
		expect(budgetLine(40000, 16000)).toEqual({ text: '$240 left of your $400 budget', over: false });
		expect(budgetLine(40000, 40000)).toEqual({ text: '$0 left of your $400 budget', over: false });
		expect(budgetLine(40000, 45049)).toEqual({ text: '$50 over your $400 budget', over: true });
	});
});
