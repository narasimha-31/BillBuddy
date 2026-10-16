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

const words = (name: string) => name.toLowerCase().match(/[a-z0-9]+/g) ?? [];

// One key per product name, the same whatever the word order, capitals, punctuation or plural:
// "Milk, whole" and "Whole milk" both become "milk whole". Sorting the words is O(k log k) for
// k words, and the key is looked up through a unique index, so a match costs one index probe.
export const matchKey = (name: string) => words(name).map(singular).sort().join(' ');

const numbers = (name: string) => (name.match(/\d+(?:[./]\d+)?/g) ?? []).sort().join(' ');

// Names whose numbers differ are never one product, however close they read: "2% milk" and
// "1% milk", "80/20" and "93/7", "12 ct" and "18 ct", or "2% milk" and plain "Milk".
export const numbersConflict = (a: string, b: string) => numbers(a) !== numbers(b);
