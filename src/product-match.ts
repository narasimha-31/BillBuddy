// Spelling rule for one word: "tomatoes" -> "tomato", "berries" -> "berry", "cookie" -> "cooky"
// (so "cookies" lands on the same key), "bananas" -> "banana". Words ending in ss or us keep theirs.
function singular(word: string) {
	if (/\d/.test(word) || word.length < 4) return word;
	if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
	if (word.endsWith('ie')) return word.slice(0, -2) + 'y';
	if (/(sses|xes|zzes|ches|shes|oes)$/.test(word)) return word.slice(0, -2);
	if (word.endsWith('s') && !/(ss|us)$/.test(word)) return word.slice(0, -1);
	return word;
}

// A pack size ("12 ct", "64OZ", "2 lb", "200GM") says how much, not what: 12 and 18 eggs are one
// product. Sizes are kept apart on each line, so they come out of the name before comparing.
const PACK_SIZE = /\b\d+(?:\.\d+)?\s*(?:ct|count|pc|pcs|pk|pack|oz|fl oz|lb|lbs|g|gm|kg|gal|l|ml|pint|pt|qt)\b/gi;
const withoutSizes = (name: string) => name.replace(PACK_SIZE, ' ');

const words = (name: string) => withoutSizes(name).toLowerCase().match(/[a-z0-9]+/g) ?? [];

// One key per product name, the same whatever the word order, capitals, punctuation, plural or
// pack size: "Milk, whole" and "Whole milk" both become "milk whole". Sorting the words is
// O(k log k) for k words, and the key is looked up through a unique index: one index probe.
export const matchKey = (name: string) => words(name).map(singular).sort().join(' ');

const numbers = (name: string) => (withoutSizes(name).match(/\d+(?:[./]\d+)?/g) ?? []).sort().join(' ');

// Numbers left once pack sizes are gone describe the product itself: "2%" and "1%" milk, "80/20"
// and "93/7" beef. Names whose such numbers differ are never one product, however close they read.
export const numbersConflict = (a: string, b: string) => numbers(a) !== numbers(b);

export type Candidate = { slot: number; id: string; name: string; similarity: number };
export type Pick = { same: string | null; maybe: string | null };

// For each new name: the most similar candidate the judge called the same product, and otherwise
// the most similar one it was unsure about, to offer as "Same as ...?". Unsure never merges.
export function pickProducts(slots: number, candidates: Candidate[], verdicts: ('same' | 'different' | 'unsure')[]): Pick[] {
	const picks: Pick[] = Array.from({ length: slots }, () => ({ same: null, maybe: null }));
	const best = new Map<string, number>();
	candidates.forEach((c, i) => {
		const pick = picks[c.slot];
		if (!pick) return;
		const field = verdicts[i] === 'same' ? 'same' : verdicts[i] === 'unsure' ? 'maybe' : null;
		if (!field) return;
		const key = `${c.slot}:${field}`;
		if (c.similarity > (best.get(key) ?? -Infinity)) {
			best.set(key, c.similarity);
			pick[field] = c.id;
		}
	});
	for (const pick of picks) if (pick.same) pick.maybe = null;
	return picks;
}
