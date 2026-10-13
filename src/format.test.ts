import { describe, expect, it } from 'vitest';
import { storeName } from './format';

describe('storeName', () => {
	it('turns a printed all-caps name into title case', () => {
		expect(storeName('PARIVAR GROCERS')).toBe('Parivar Grocers');
		expect(storeName("SAM'S CLUB")).toBe("Sam's Club");
	});

	it('keeps initials and names someone already typed', () => {
		expect(storeName('H-E-B')).toBe('H-E-B');
		expect(storeName('IGA')).toBe('IGA');
		expect(storeName('Trader Joe’s')).toBe('Trader Joe’s');
		expect(storeName('McAllen HEB')).toBe('McAllen HEB');
		expect(storeName(null)).toBeNull();
	});
});
