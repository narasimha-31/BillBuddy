import { describe, expect, it } from 'vitest';
import type { Branch } from './branches';
import { guessSpot } from './store-map.server';

const you = { lat: 29.76, lng: -95.36 };
const branch = (over: Partial<Branch>): Branch => ({ storeId: 's1', name: 'Parivar Grocers', key: 'k1', lat: 29.7, lng: -95.4, address: '1 Main St', visits: 2, lastVisit: null, guess: false, ...over });

describe('guessSpot', () => {
	it('uses the shopper’s own branch of that store', () => {
		expect(guessSpot({ id: 's1' }, you, [branch({})])).toEqual({ lat: 29.7, lng: -95.4, address: '1 Main St' });
	});

	// a map search by name once pinned a different shop with a similar name
	it('leaves a store with no branch of its own off the map', () => {
		expect(guessSpot({ id: 's2' }, you, [branch({})])).toBeNull();
		expect(guessSpot({ id: 's1' }, you, [branch({ guess: true })])).toBeNull();
	});
});
