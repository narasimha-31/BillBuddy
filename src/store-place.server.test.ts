import { describe, expect, it } from 'vitest';
import { pointFrom } from './store-place.server';

// the shape the Census geocoder returned on Oct 16 for 8130 Kirby Dr, Houston, TX 77054
const census = (coordinates: object | undefined) => ({ result: { addressMatches: coordinates ? [{ coordinates, matchedAddress: '8130 KIRBY DR, HOUSTON, TX, 77054' }] : [] } });

describe('pointFrom', () => {
	it('reads the first match: x is longitude, y is latitude', () => {
		expect(pointFrom(census({ x: -95.412590868335, y: 29.689057052233 }))).toEqual({ lat: 29.689057052233, lng: -95.412590868335 });
	});

	it('gives no point when the address was not found', () => {
		expect(pointFrom(census(undefined))).toBeNull();
		expect(pointFrom({})).toBeNull();
		expect(pointFrom(null)).toBeNull();
	});

	it('refuses a point outside the United States or a malformed one', () => {
		expect(pointFrom(census({ x: 2.35, y: 48.85 }))).toBeNull();
		expect(pointFrom(census({ x: '-95.4', y: '29.6' }))).toBeNull();
	});
});
