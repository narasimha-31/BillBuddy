import type { CheckedLine } from './receipt-check';
import type { Named } from './item-names';

export type ItemRow = {
	position: number;
	kind: 'item' | 'discount';
	raw_text: string;
	name: string | null;
	brand: string | null;
	category: string | null;
	size_amount: number | null;
	size_unit: string | null;
	quantity: number;
	unit: string;
	unit_price_cents: number | null;
	total_cents: number;
	computed: boolean;
	issue: 'line_math' | 'unreadable' | null;
};

// Pairs checked lines with their names (names cover item lines only, in order). Offensive and
// non-grocery lines are counted and dropped, so their text is never stored.
export function itemRows(lines: CheckedLine[], names: Named[]): { rows: ItemRow[]; skipped: number } {
	const rows: ItemRow[] = [];
	let skipped = 0;
	let next = 0;

	for (const line of lines) {
		if (line.kind === 'discount') {
			rows.push({ ...base(line, rows.length), name: 'Savings', brand: null, category: null, size_amount: null, size_unit: null, issue: line.issue });
			continue;
		}

		const named = names[next++];
		if (!named || named.flag === 'offensive' || named.flag === 'not_grocery') {
			skipped++;
			continue;
		}
		const unreadable = named.flag === 'unreadable';
		rows.push({
			...base(line, rows.length),
			name: unreadable ? null : named.name,
			brand: unreadable ? null : named.brand,
			category: unreadable ? null : named.category,
			size_amount: unreadable ? null : named.sizeAmount,
			size_unit: unreadable ? null : named.sizeUnit,
			issue: line.issue ?? (unreadable ? 'unreadable' : null)
		});
	}
	return { rows, skipped };
}

function base(line: CheckedLine, position: number) {
	return {
		position,
		kind: line.kind,
		raw_text: line.raw,
		quantity: line.quantity,
		unit: line.unit,
		unit_price_cents: line.unitPriceCents,
		total_cents: line.totalCents,
		computed: line.computed
	};
}
