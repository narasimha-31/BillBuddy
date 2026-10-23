const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export type Rhythm = { everyDays: number; lastOn: string; sinceDays: number; lastAmount: number; per: 'lb' | 'ea' };
export type Bought = { on: string | null; quantity: number; unit: string };

// Habits change, so only the latest buys count.
const RECENT_BUYS = 9;
const TO_LB: Record<string, number> = { lb: 1, kg: 2.2046, oz: 1 / 16, g: 1 / 453.6 };

const middle = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};

// How long a lot lasts, from how fast each earlier lot ran out: 3 lb of tomatoes lasts longer than 1 lb.
// Needs three buys with fairly steady use between them. Two buys say nothing yet: the first lot may
// simply have gone bad. Lines on the same day add up. Weights and counts mixed for one thing can't be
// compared, so then every buy counts as one.
export function rhythm(lines: Bought[], today: string): Rhythm | null {
	const dated = lines.filter((l) => !!l.on);
	const weighed = dated.filter((l) => l.unit.toLowerCase() in TO_LB).length;
	const per = weighed === dated.length && weighed > 0 ? 'lb' : 'ea';
	const mixed = weighed > 0 && weighed < dated.length;
	const amountOf = (l: Bought) => (mixed ? 1 : per === 'lb' ? l.quantity * TO_LB[l.unit.toLowerCase()] : Math.max(1, Math.round(l.quantity)));
	const byDay = new Map<string, number>();
	for (const line of dated) byDay.set(line.on!, (byDay.get(line.on!) ?? 0) + Math.max(0, amountOf(line)));
	const days = [...byDay.keys()].sort().slice(-RECENT_BUYS);
	if (days.length < 3) return null;
	const gaps = days.slice(1).map((day, i) => daysBetween(days[i], day));
	if (middle(gaps) < 2) return null;
	const rates = gaps.map((gap, i) => byDay.get(days[i])! / gap);
	const rate = middle(rates);
	if (!(rate > 0)) return null;
	const steady = rates.filter((r) => r >= rate / 2 && r <= rate * 2).length;
	if (steady / rates.length < 0.75) return null;
	const lastOn = days.at(-1)!;
	const lastAmount = byDay.get(lastOn)!;
	return { everyDays: Math.max(1, Math.round(lastAmount / rate)), lastOn, sinceDays: daysBetween(lastOn, today), lastAmount, per: mixed ? 'ea' : per };
}

// "3 lb", "6", or nothing when it was the usual single item
export function amountText(r: Rhythm) {
	if (r.per === 'lb') return `${Math.round(r.lastAmount * 10) / 10} lb`;
	return r.lastAmount > 1 ? `${r.lastAmount}` : '';
}

export function everyText(days: number) {
	if (days >= 6 && days <= 8) return 'every week';
	if (days >= 13 && days <= 15) return 'every 2 weeks';
	if (days >= 27 && days <= 33) return 'every month';
	return `every ${days} days`;
}

// a lot bought in a usual single says how often; a bigger lot says how long it lasts
export function habitText(r: Rhythm) {
	const amount = amountText(r);
	if (!amount) return `${everyText(r.everyDays).replace(/^e/, 'E')} · last ${agoText(r.sinceDays)}`;
	const lasts = everyText(r.everyDays).replace('every ', '').replace(/^(week|month)$/, 'a $1');
	return `${amount} lasts about ${lasts} · bought ${agoText(r.sinceDays)}`;
}

export function agoText(days: number) {
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	return `${days} days ago`;
}

// about time to buy again; long past it means the habit stopped, not that it is due
export const dueSoon = (r: Rhythm) => r.sinceDays >= r.everyDays - 1 && r.sinceDays <= r.everyDays * 2;
