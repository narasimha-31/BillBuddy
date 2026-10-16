import { nearestOf, shortMiles, type Point } from './distance';

export type Place = { name: string; visits: number; lat: number | null; lng: number | null };

// the store shopped at most, once there is more than one store and a clear favourite
export function usualStore(places: Place[]): string | null {
	if (places.length < 2) return null;
	const [top, next] = [...places].sort((a, b) => b.visits - a.visits);
	return top.visits >= 2 && top.visits > next.visits ? top.name : null;
}

// the facts shown next to each store's price: which one is usual, and which one is nearest
export function storeTags(places: Place[], usual: string | null, here: Point | null): Record<string, string[]> {
	const tags: Record<string, string[]> = {};
	const add = (name: string, fact: string) => (tags[name] ??= []).push(fact);
	if (here) {
		const nearest = nearestOf(here, places);
		if (nearest) add(nearest.name, `Nearest · ${shortMiles(nearest.miles)}`);
	}
	if (usual) add(usual, 'Your usual');
	return tags;
}
