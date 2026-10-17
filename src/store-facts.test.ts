import { describe, expect, it } from 'vitest';
import { storeTags, usualStore } from './store-facts';

const store = (name: string, visits: number) => ({ name, visits });

describe('usualStore', () => {
	it('names the store shopped at most', () => {
		expect(usualStore([store('H-E-B', 2), store('Fiesta Mart', 5), store('Parivar', 1)])).toBe('Fiesta Mart');
	});

	it('names none with one store, one visit, or a tie at the top', () => {
		expect(usualStore([store('H-E-B', 9)])).toBeNull();
		expect(usualStore([store('H-E-B', 1), store('Fiesta Mart', 1)])).toBeNull();
		expect(usualStore([store('H-E-B', 3), store('Fiesta Mart', 3)])).toBeNull();
	});
});

describe('storeTags', () => {
	it('marks the usual store, and the nearest one with its distance once the map is on', () => {
		expect(storeTags('Fiesta Mart', null)).toEqual({ 'Fiesta Mart': ['Your usual'] });
		expect(storeTags('Fiesta Mart', { name: 'H-E-B', miles: 0.94 })).toEqual({ 'H-E-B': ['Nearest · 0.9 mi'], 'Fiesta Mart': ['Your usual'] });
	});
});
