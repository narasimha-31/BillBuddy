import { describe, expect, it } from 'vitest';
import { directionsTo, isOld, itemPins, placed, streetOf, townOf, type Branch } from './branches';

const you = { lat: 29.7, lng: -95.5 };
const branch = (over: Partial<Branch>): Branch => ({ storeId: 's1', name: 'Walmart', key: '29.700,-95.500', lat: 29.7, lng: -95.5, address: null, visits: 1, lastVisit: null, guess: false, ...over });

describe('placed', () => {
	it('sorts by distance from the ZIP and marks branches over 40 miles away', () => {
		const [near, far] = placed([branch({ key: 'far', lat: 39.96, lng: -83.0 }), branch({ key: 'near', lat: 29.71 })], you);
		expect(near.key).toBe('near');
		expect(near.away).toBe(false);
		expect(far.away).toBe(true);
		expect(far.miles).toBeGreaterThan(900);
	});
});

describe('streetOf and townOf', () => {
	it('reads the street and the town from printed or map addresses', () => {
		expect(streetOf('8710 BELLAIRE BLVD, HOUSTON, TX 77036')).toBe('Bellaire Blvd');
		expect(streetOf('9460 West Sam Houston Parkway South, Houston, TX 77099')).toBe('West Sam Houston Parkway South');
		expect(streetOf(null)).toBeNull();
		expect(townOf('1375 W 5TH AVE, COLUMBUS, OH 43212')).toBe('Columbus, OH');
		expect(townOf('Koehler Street, Houston, TX 77007')).toBe('Houston, TX');
		expect(townOf('somewhere')).toBeNull();
	});
});

describe('itemPins', () => {
	const home = placed(
		[
			branch({ storeId: 'w', key: 'a', lat: 29.71, visits: 7 }),
			branch({ storeId: 'w', key: 'b', lat: 29.68, visits: 3 }),
			branch({ storeId: 'f', name: 'Fiesta', key: 'c', lat: 29.75 }),
			branch({ storeId: 'k', name: 'Kroger', key: 'd', lat: 39.96, lng: -83.0 })
		],
		you
	);

	it('gives each home branch its latest price there, a plain pin where it was never bought, and no away pins', () => {
		const pins = itemPins(home, [
			{ storeId: 'w', branchKey: 'a', unitCents: 210, date: '2026-09-01' },
			{ storeId: 'w', branchKey: 'a', unitCents: 230, date: '2026-10-01' },
			{ storeId: 'f', branchKey: 'c', unitCents: 199, date: '2026-10-02' },
			{ storeId: 'k', branchKey: 'd', unitCents: 150, date: '2026-10-03' },
			{ storeId: null, branchKey: null, unitCents: 99, date: '2026-10-04' }
		]);
		expect(pins.map((p) => [p.key, p.cents, p.cheapest, p.nearest])).toEqual([
			['a', 230, false, true],
			['b', null, false, false],
			['c', 199, true, false]
		]);
	});

	it('adds away branches on request, priced but never cheapest or nearest', () => {
		const pins = itemPins(home, [{ storeId: 'k', branchKey: 'd', unitCents: 150, date: null }, { storeId: 'f', branchKey: 'c', unitCents: 199, date: null }, { storeId: 'w', branchKey: 'a', unitCents: 230, date: null }], true);
		const away = pins.find((p) => p.key === 'd')!;
		expect([away.cents, away.cheapest, away.nearest]).toEqual([150, false, false]);
		expect(pins.find((p) => p.key === 'c')!.cheapest).toBe(true);
	});

	it('calls nothing cheapest with only one branch selling it', () => {
		expect(itemPins(home, [{ storeId: 'f', branchKey: 'c', unitCents: 199, date: null }]).some((p) => p.cheapest)).toBe(false);
	});
});

describe('directionsTo and isOld', () => {
	it('heads Google Maps to the store and calls a purchase over six months back old', () => {
		expect(directionsTo({ lat: 29.705731, lng: -95.539541 })).toBe('https://www.google.com/maps/dir/?api=1&destination=29.70573,-95.53954');
		const today = new Date('2026-10-17T12:00:00');
		expect(isOld('2026-04-30', today)).toBe(false);
		expect(isOld('2026-03-31', today)).toBe(true);
		expect(isOld(null, today)).toBe(true);
	});
});
