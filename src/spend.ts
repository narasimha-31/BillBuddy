export type Spend = { purchased_on: string; total_cents: number | null };
export type Bar = { from: string; to: string; label: string; cents: number; receipts: number };

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
		return { from, to, label: short(start, by === 'month'), cents: inside.reduce((sum, r) => sum + (r.total_cents ?? 0), 0), receipts: inside.length };
	});
}
