// The US Census geocoder: free, no key, run by the government. It is sent the store's printed
// address only, never anything about the shopper. An address it can't place gives no point.
const CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

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

export async function placeStore(address: string): Promise<Point | null> {
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
