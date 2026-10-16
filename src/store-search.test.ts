import { describe, expect, it } from 'vitest';
import { keyMatches, storeKey } from './store-search';

const matches = (name: string | null, typed: string) => keyMatches(storeKey(name), storeKey(typed));

describe('store search', () => {
	it('ignores capitals, hyphens, dots and spaces', () => {
		expect(matches('H-E-B', 'heb')).toBe(true);
		expect(matches('WALMART SUPERCENTER', 'walmart')).toBe(true);
		expect(matches("Trader Joe's", 'trader joes')).toBe(true);
	});

	it('matches any part of the name', () => {
		expect(matches('PARIVAR GROCERS', 'grocer')).toBe(true);
		expect(matches('Fiesta Mart', 'kroger')).toBe(false);
	});

	it('keeps everything while nothing is typed, and leaves out receipts with no store', () => {
		expect(matches('Aldi', '  ')).toBe(true);
		expect(matches(null, '')).toBe(true);
		expect(matches(null, 'aldi')).toBe(false);
	});
});
