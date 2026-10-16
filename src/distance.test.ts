import { describe, expect, it } from 'vitest';
import { milesBetween, nearestOf, shortMiles } from './distance';

// the two Houston stores the Census geocoder placed on Oct 16
const kirby = { lat: 29.689057, lng: -95.412591 };
const buffalo = { lat: 29.727271, lng: -95.427766 };

describe('milesBetween', () => {
	it('measures the miles between two stores', () => {
		expect(milesBetween(kirby, buffalo)).toBeCloseTo(2.8, 1);
		expect(milesBetween(kirby, kirby)).toBe(0);
	});
});

describe('shortMiles', () => {
	it('keeps one decimal close by and whole miles further out', () => {
		expect(shortMiles(0.84)).toBe('0.8 mi');
		expect(shortMiles(12.6)).toBe('13 mi');
		// standing in the parking lot never reads as 0.0 mi
		expect(shortMiles(0.04)).toBe('under 0.1 mi');
	});
});

describe('nearestOf', () => {
	it('picks the closest store that has a known point', () => {
		const here = { lat: 29.69, lng: -95.41 };
		const places = [
			{ name: 'H-E-B', lat: buffalo.lat, lng: buffalo.lng },
			{ name: 'Fiesta Mart', lat: kirby.lat, lng: kirby.lng },
			{ name: 'Parivar', lat: null, lng: null }
		];
		expect(nearestOf(here, places)).toMatchObject({ name: 'Fiesta Mart' });
	});

	it('gives nothing when no store has a point yet', () => {
		expect(nearestOf(kirby, [{ name: 'Parivar', lat: null, lng: null }])).toBeNull();
	});
});
