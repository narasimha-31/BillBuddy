import { describe, expect, it } from 'vitest';
import { tileAllowed } from './map-tiles';

// tile numbers for a point: the standard slippy-map formula
const tileOf = (lat: number, lng: number, z: number) => {
	const rad = (lat * Math.PI) / 180;
	return [z, Math.floor(((lng + 180) / 360) * 2 ** z), Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z)] as const;
};

describe('tileAllowed', () => {
	it('serves US tiles from city to street level', () => {
		expect(tileAllowed(...tileOf(29.76, -95.36, 13))).toBe(true);
		expect(tileAllowed(...tileOf(61.2, -149.9, 12))).toBe(true);
		expect(tileAllowed(...tileOf(21.3, -157.8, 16))).toBe(true);
	});

	it('refuses tiles outside the US, too far out, or not numbers', () => {
		expect(tileAllowed(...tileOf(51.5, -0.12, 13))).toBe(false);
		expect(tileAllowed(...tileOf(29.76, -95.36, 5))).toBe(false);
		expect(tileAllowed(...tileOf(29.76, -95.36, 19))).toBe(false);
		expect(tileAllowed(13, -1, 3000)).toBe(false);
		expect(tileAllowed(13, 1.5, 3000)).toBe(false);
		expect(tileAllowed(NaN, 1, 1)).toBe(false);
	});
});
