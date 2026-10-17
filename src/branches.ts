import { milesBetween, type Point } from './distance';

// One place a shopper buys from a store: receipts within about 100 m of each other (see branch_key)
export type Branch = {
	storeId: string;
	name: string;
	key: string;
	lat: number;
	lng: number;
	address: string | null;
	visits: number;
	lastVisit: string | null;
	guess: boolean;
};

// farther than this from the shopper's ZIP, a branch is somewhere they were, not where they shop
export const HOME_MILES = 40;

export type Placed = Branch & { miles: number; away: boolean };

export function placed(branches: Branch[], you: Point): Placed[] {
	return branches
		.map((b) => {
			const miles = milesBetween(you, b);
			return { ...b, miles, away: miles > HOME_MILES };
		})
		.sort((a, b) => a.miles - b.miles);
}

const titled = (text: string) => (text === text.toUpperCase() ? text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : text);

// "8710 BELLAIRE BLVD, HOUSTON, TX 77036" -> "Bellaire Blvd": the street, which tells two branches apart
export function streetOf(address: string | null) {
	const first = address?.split(',')[0]?.trim();
	if (!first) return null;
	const street = first.replace(/^\d+[A-Za-z]?\s+/, '').trim();
	return street ? titled(street) : null;
}

// "... COLUMBUS, OH 43215" -> "Columbus, OH": where an away branch was
export function townOf(address: string | null) {
	const match = address?.match(/,\s*([^,]+?),?\s+([A-Z]{2})\s+\d{5}/);
	return match ? `${titled(match[1].trim())}, ${match[2]}` : null;
}

export type Pin = Placed & { cents: number | null; date: string | null; cheapest: boolean; nearest: boolean };

// One pin per home branch for an item (away ones too once asked): the latest price paid at that branch,
// or none if it was never bought there. Cheapest and nearest only among home branches that really sold
// it, since a cheaper price a state away does not help the next trip. O(purchases + branches).
export function itemPins(branches: Placed[], purchases: { branchKey?: string | null; storeId?: string | null; unitCents: number; date: string | null }[], withAway = false): Pin[] {
	const latest = new Map<string, { cents: number; date: string }>();
	for (const p of purchases) {
		if (!p.branchKey || !p.storeId) continue;
		const id = `${p.storeId}@${p.branchKey}`;
		const seen = latest.get(id);
		if (!seen || (p.date ?? '') > seen.date) latest.set(id, { cents: p.unitCents, date: p.date ?? '' });
	}
	const pins = branches.filter((b) => withAway || !b.away).map((b) => ({ ...b, cents: latest.get(`${b.storeId}@${b.key}`)?.cents ?? null, date: latest.get(`${b.storeId}@${b.key}`)?.date || null, cheapest: false, nearest: false }));
	const sold = pins.filter((p) => p.cents !== null && !p.away);
	if (sold.length > 1) {
		const low = Math.min(...sold.map((p) => p.cents!));
		for (const p of sold) p.cheapest = p.cents === low;
	}
	if (sold.length) sold.reduce((a, b) => (b.miles < a.miles ? b : a)).nearest = true;
	return pins;
}

// Google Maps for everyone: on a phone the link opens the Maps app, already headed to the store
export const directionsTo = (point: Point) => `https://www.google.com/maps/dir/?api=1&destination=${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;

// a purchase this old may not say much about the shelf today
export function isOld(date: string | null, today = new Date()) {
	if (!date) return true;
	const months = (today.getFullYear() - Number(date.slice(0, 4))) * 12 + today.getMonth() + 1 - Number(date.slice(5, 7));
	return months > 6;
}
