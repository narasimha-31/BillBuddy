// The US Census geocoder: free, no key, run by the government. It is sent the store's address only,
// never anything about the shopper. An address it misses (new buildings, odd spellings) gets a second
// try on OpenStreetMap's Nominatim; one neither can place gives no point.
const CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export type Point = { lat: number; lng: number };

export function pointFrom(answer: unknown): Point | null {
	const match = (answer as { result?: { addressMatches?: { coordinates?: { x?: unknown; y?: unknown } }[] } })?.result?.addressMatches?.[0];
	const lng = match?.coordinates?.x;
	const lat = match?.coordinates?.y;
	if (typeof lat !== 'number' || typeof lng !== 'number') return null;
	// the fifty states and DC
	if (lat < 18 || lat > 72 || lng < -180 || lng > -64) return null;
	return { lat, lng };
}

// a Nominatim answer: the first match, inside the US box
export function pointFromNominatim(answer: unknown): Point | null {
	const first = (answer as { lat?: string; lon?: string }[] | null)?.[0];
	const lat = Number(first?.lat);
	const lng = Number(first?.lon);
	if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 18 || lat > 72 || lng < -180 || lng > -64) return null;
	return { lat, lng };
}

async function placeOnOpenStreetMap(address: string): Promise<Point | null> {
	const url = new URL(NOMINATIM);
	for (const [key, value] of Object.entries({ q: address, format: 'jsonv2', limit: '1', countrycodes: 'us' })) url.searchParams.set(key, value);
	try {
		const response = await fetch(url, { headers: { 'user-agent': 'Billi/1.0 (+https://bill-buddy-green.vercel.app)' }, signal: AbortSignal.timeout(5000) });
		if (!response.ok) throw new Error(`nominatim returned ${response.status}`);
		return pointFromNominatim(await response.json());
	} catch (error) {
		console.warn('store address not placed on OpenStreetMap:', error instanceof Error ? error.message : error);
		return null;
	}
}

export async function placeStore(address: string): Promise<Point | null> {
	return (await placeWithCensus(address)) ?? (await placeOnOpenStreetMap(address));
}

async function placeWithCensus(address: string): Promise<Point | null> {
	const url = new URL(CENSUS);
	url.searchParams.set('address', address);
	url.searchParams.set('benchmark', 'Public_AR_Current');
	url.searchParams.set('format', 'json');
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
		if (!response.ok) throw new Error(`census geocoder returned ${response.status}`);
		return pointFrom(await response.json());
	} catch (error) {
		// a missing map point only hides the distance tag; the receipt itself is saved either way
		console.warn('store address not placed:', error instanceof Error ? error.message : error);
		return null;
	}
}
