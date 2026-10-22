export type Spend = { id?: string; purchased_on: string; total_cents: number | null; aisles?: Record<string, number> };
export type Bar = { from: string; to: string; label: string; cents: number; receipts: number; ids: string[] };

const DAY = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const short = (d: Date, month: boolean) =>
	d.toLocaleDateString('en-US', month ? { month: 'short', timeZone: 'UTC' } : { month: 'numeric', day: 'numeric', timeZone: 'UTC' });

// the last 6 calendar months, or the last 8 Sunday-to-Saturday weeks, oldest first
export function spendBars(rows: Spend[], by: 'week' | 'month', today: string): Bar[] {
	const t = new Date(`${today}T00:00:00Z`);
	const [y, m, d] = [t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()];
	const count = by === 'month' ? 6 : 8;
	return Array.from({ length: count }, (_, i) => {
		const back = count - 1 - i;
		const start = by === 'month' ? new Date(Date.UTC(y, m - back, 1)) : new Date(Date.UTC(y, m, d - t.getUTCDay() - 7 * back));
		const end = by === 'month' ? new Date(Date.UTC(y, m - back + 1, 0)) : new Date(start.getTime() + 6 * DAY);
		const [from, to] = [iso(start), iso(end)];
		const inside = rows.filter((r) => r.purchased_on >= from && r.purchased_on <= to);
		return { from, to, label: short(start, by === 'month'), cents: inside.reduce((sum, r) => sum + (r.total_cents ?? 0), 0), receipts: inside.length, ids: inside.flatMap((r) => (r.id ? [r.id] : [])) };
	});
}

// what the items of these receipts cost per aisle, biggest first; savings lines are left out
export function aisleSpend(rows: Spend[], ids: string[]): { aisle: string; cents: number }[] {
	const wanted = new Set(ids);
	const sums = new Map<string, number>();
	for (const row of rows) {
		if (!row.id || !wanted.has(row.id)) continue;
		for (const [aisle, cents] of Object.entries(row.aisles ?? {})) sums.set(aisle, (sums.get(aisle) ?? 0) + cents);
	}
	return [...sums].map(([aisle, cents]) => ({ aisle, cents })).filter((a) => a.cents > 0).sort((a, b) => b.cents - a.cents || a.aisle.localeCompare(b.aisle));
}

// one receipt's item lines summed by aisle
export function byAisle(lines: { category: string | null; total_cents: number }[]): Record<string, number> {
	const sums: Record<string, number> = {};
	for (const line of lines) sums[line.category ?? 'Other'] = (sums[line.category ?? 'Other'] ?? 0) + line.total_cents;
	return sums;
}
