import { shortMiles } from './distance';

// the store shopped at most, once there is more than one store and a clear favourite
export function usualStore(stores: { name: string; visits: number }[]): string | null {
	if (stores.length < 2) return null;
	const [top, next] = [...stores].sort((a, b) => b.visits - a.visits);
	return top.visits >= 2 && top.visits > next.visits ? top.name : null;
}

// the facts shown next to each store's name: which one is usual, and which one is nearest
export function storeTags(usual: string | null, nearest: { name: string; miles: number } | null): Record<string, string[]> {
	const tags: Record<string, string[]> = {};
	const add = (name: string, fact: string) => (tags[name] ??= []).push(fact);
	if (nearest) add(nearest.name, `Nearest · ${shortMiles(nearest.miles)}`);
	if (usual) add(usual, 'Your usual');
	return tags;
}
