export type Point = { lat: number; lng: number };

// straight-line miles over the earth's surface (haversine); close enough to pick the nearer store
export function milesBetween(a: Point, b: Point) {
	const rad = (degrees: number) => (degrees * Math.PI) / 180;
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

export function shortMiles(miles: number) {
	if (miles < 0.1) return 'under 0.1 mi';
	return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

// the store with a known point closest to here, and how far it is
export function nearestOf(here: Point, places: { name: string; lat: number | null; lng: number | null }[]) {
	let best: { name: string; miles: number } | null = null;
	for (const place of places) {
		if (place.lat === null || place.lng === null) continue;
		const miles = milesBetween(here, { lat: place.lat, lng: place.lng });
		if (!best || miles < best.miles) best = { name: place.name, miles };
	}
	return best;
}
