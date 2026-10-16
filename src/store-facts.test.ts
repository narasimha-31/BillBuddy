import { describe, expect, it } from 'vitest';
import { storeTags, usualStore, type Place } from './store-facts';

const place = (name: string, visits: number, lat: number | null = null, lng: number | null = null): Place => ({ name, visits, lat, lng });

describe('usualStore', () => {
	it('names the store shopped at most', () => {
		expect(usualStore([place('H-E-B', 2), place('Fiesta Mart', 5), place('Parivar', 1)])).toBe('Fiesta Mart');
	});

	it('names none with one store, one visit, or a tie at the top', () => {
		expect(usualStore([place('H-E-B', 9)])).toBeNull();
		expect(usualStore([place('H-E-B', 1), place('Fiesta Mart', 1)])).toBeNull();
		expect(usualStore([place('H-E-B', 3), place('Fiesta Mart', 3)])).toBeNull();
	});
});

describe('storeTags', () => {
	const places = [place('Fiesta Mart', 5, 29.689, -95.4126), place('H-E-B', 2, 29.7273, -95.4278), place('Parivar', 1)];

	it('marks the usual store without a location', () => {
		expect(storeTags(places, 'Fiesta Mart', null)).toEqual({ 'Fiesta Mart': ['Your usual'] });
	});

	it('adds the nearest store and its distance once the shopper shares where they are', () => {
		expect(storeTags(places, 'Fiesta Mart', { lat: 29.74, lng: -95.43 })).toEqual({
			'H-E-B': ['Nearest · 0.9 mi'],
			'Fiesta Mart': ['Your usual']
		});
	});
});
