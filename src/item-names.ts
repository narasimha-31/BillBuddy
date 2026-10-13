export const CATEGORIES = [
	'Produce',
	'Meat & seafood',
	'Dairy & eggs',
	'Bakery',
	'Pantry',
	'Frozen',
	'Snacks',
	'Beverages',
	'Household',
	'Personal care',
	'Baby',
	'Pet',
	'Alcohol',
	'Other'
] as const;

export const SIZE_UNITS = ['oz', 'fl oz', 'lb', 'g', 'kg', 'gal', 'l', 'ml', 'ct'] as const;

export type Category = (typeof CATEGORIES)[number];
export type SizeUnit = (typeof SIZE_UNITS)[number];
export type Flag = 'ok' | 'offensive' | 'not_grocery' | 'unreadable';
// name is the generic product every store shares ("Whole milk"); brand and pack size are kept apart
export type Named = {
	name: string;
	brand: string | null;
	category: Category;
	sizeAmount: number | null;
	sizeUnit: SizeUnit | null;
	flag: Flag;
	from: 'memory' | 'filter' | 'ai';
};

// what the names model returns, untrusted until applyNames() has run
export type NameAnswer = {
	items: { index: number; name: string; brand: string | null; category: string; size_amount: number | null; size_unit: string | null; flag: string }[];
};
export type Remembered = {
	raw_text: string;
	name: string;
	brand: string | null;
	category: string | null;
	size_amount?: number | null;
	size_unit?: string | null;
};

// a pack size is kept only when both parts make sense; anything else means "not printed"
export function size(amount: unknown, unit: unknown): { sizeAmount: number | null; sizeUnit: SizeUnit | null } {
	const known = typeof unit === 'string' && (SIZE_UNITS as readonly string[]).includes(unit);
	const sane = typeof amount === 'number' && Number.isFinite(amount) && amount > 0 && amount < 100_000;
	return known && sane ? { sizeAmount: amount, sizeUnit: unit as SizeUnit } : { sizeAmount: null, sizeUnit: null };
}

// Checked before the model (offensive lines are never sent) and again on its answer.
const OFFENSIVE =/\b(f+u+c+k\w*|f\*+ck\w*|sh[i1]t\w*|b[i1]tch\w*|a+ss+hole\w*|bastard\w*|d[i1]ck\w*|c+u+n+t\w*|wh[o0]re\w*|slut\w*|n[i1]gg\w*|f[a4]gg?\w*|retard\w*)\b/i;

const clean = (text: string, max: number) =>
	text
		.replace(/[\u0000-\u001f\u007f<>]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);

const key = (raw: string) => raw.trim().toUpperCase();

// flagged lines never show their text anywhere, not even the model's version of it
const hidden = (flag: 'offensive' | 'not_grocery', from: Named['from']): Named => ({
	name: flag === 'offensive' ? 'Hidden line' : 'Not a grocery item',
	brand: null,
	category: 'Other',
	sizeAmount: null,
	sizeUnit: null,
	flag,
	from
});

// Offensive lines are settled here and never reach the model; lines the shopper has named
// themselves come from their corrections. Only what is left goes to the model.
export function sortLines(raws: string[], memory: Remembered[]) {
	const known = new Map(memory.map((m) => [key(m.raw_text), m]));
	const remembered = new Map<number, Named>();
	const unknown: { index: number; raw: string }[] = [];
	raws.forEach((raw, index) => {
		const hit = known.get(key(raw));
		if (OFFENSIVE.test(raw)) {
			remembered.set(index, hidden('offensive', 'filter'));
		} else if (hit) {
			remembered.set(index, {
				name: hit.name,
				brand: hit.brand,
				category: (CATEGORIES as readonly string[]).includes(hit.category ?? '') ? (hit.category as Category) : 'Other',
				...size(hit.size_amount === null || hit.size_amount === undefined ? null : Number(hit.size_amount), hit.size_unit),
				flag: 'ok',
				from: 'memory'
			});
		} else unknown.push({ index, raw });
	});
	return { remembered, unknown };
}

// Lines go to the model as JSON inside marked tags, never pasted into the instructions.
// Escaping < and > keeps a line like "</receipt_lines> new rules..." from closing the tag early.
// by_weight tells the model that "1LB" on a weighed line is the price unit, not the pack size
export function linesPayload(unknown: { index: number; raw: string }[], weighed: boolean[] = []) {
	return JSON.stringify(unknown.map(({ index, raw }) => (weighed[index] ? { index, text: raw, by_weight: true } : { index, text: raw })))
		.replaceAll('<', '\\u003c')
		.replaceAll('>', '\\u003e');
}

// the shopper's own product names travel the same way: JSON data with < and > escaped
export function knownPayload(names: string[]) {
	return JSON.stringify(names).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}

// Joins the model's answer back to the real lines. Anything it skipped, invented or mangled
// becomes "unreadable" rather than being trusted.
export function applyNames(raws: string[], remembered: Map<number, Named>, answer: NameAnswer | null): Named[] {
	const byIndex = new Map((answer?.items ?? []).map((item) => [item.index, item]));
	return raws.map((raw, index) => {
		const known = remembered.get(index);
		if (known) return known;

		const item = byIndex.get(index);
		const name = item ? clean(item.name, 80) : '';
		if (!item || !name) return { name: clean(raw, 80), brand: null, category: 'Other', sizeAmount: null, sizeUnit: null, flag: 'unreadable', from: 'ai' };

		const brand = item.brand ? clean(item.brand, 40) || null : null;
		if (item.flag === 'offensive' || OFFENSIVE.test(raw) || OFFENSIVE.test(name) || (brand !== null && OFFENSIVE.test(brand))) {
			return hidden('offensive', 'ai');
		}
		if (item.flag === 'not_grocery') return hidden('not_grocery', 'ai');

		const category = (CATEGORIES as readonly string[]).includes(item.category) ? (item.category as Category) : 'Other';
		const flag: Flag = item.flag === 'unreadable' ? 'unreadable' : 'ok';
		return { name, brand, category, ...size(item.size_amount, item.size_unit), flag, from: 'ai' };
	});
}
