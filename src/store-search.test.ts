import { describe, expect, it } from 'vitest';
import { storeMatches } from './store-search';

describe('storeMatches', () => {
	it('ignores capitals, hyphens, dots and spaces', () => {
		expect(storeMatches('H-E-B', 'heb')).toBe(true);
		expect(storeMatches('WALMART SUPERCENTER', 'walmart')).toBe(true);
		expect(storeMatches("Trader Joe's", 'trader joes')).toBe(true);
	});

	it('matches any part of the name', () => {
		expect(storeMatches('PARIVAR GROCERS', 'grocer')).toBe(true);
		expect(storeMatches('Fiesta Mart', 'kroger')).toBe(false);
	});

	it('keeps everything while nothing is typed, and leaves out receipts with no store', () => {
		expect(storeMatches('Aldi', '  ')).toBe(true);
		expect(storeMatches(null, '')).toBe(true);
		expect(storeMatches(null, 'aldi')).toBe(false);
	});
});
