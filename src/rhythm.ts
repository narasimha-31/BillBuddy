const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export type Rhythm = { everyDays: number; lastOn: string; sinceDays: number };

// Habits change, so only the latest buys count.
const RECENT_BUYS = 9;

// How often something is bought, once there are three buys with fairly steady gaps between them.
// Two buys say nothing yet: the first lot may simply have gone bad. Same-day buys count once.
export function rhythm(dates: (string | null)[], today: string): Rhythm | null {
	const days = [...new Set(dates.filter((d): d is string => !!d))].sort().slice(-RECENT_BUYS);
	if (days.length < 3) return null;
	const gaps = days.slice(1).map((day, i) => daysBetween(days[i], day));
	const sorted = [...gaps].sort((a, b) => a - b);
	const median = Math.round((sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2);
	if (median < 2) return null;
	const steady = gaps.filter((gap) => Math.abs(gap - median) <= Math.max(2, median / 2)).length;
	if (steady / gaps.length < 0.75) return null;
	const lastOn = days.at(-1)!;
	return { everyDays: median, lastOn, sinceDays: daysBetween(lastOn, today) };
}

export function everyText(days: number) {
	if (days >= 6 && days <= 8) return 'every week';
	if (days >= 13 && days <= 15) return 'every 2 weeks';
	if (days >= 27 && days <= 33) return 'every month';
	return `every ${days} days`;
}

export function agoText(days: number) {
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	return `${days} days ago`;
}

// about time to buy again; long past it means the habit stopped, not that it is due
export const dueSoon = (r: Rhythm) => r.sinceDays >= r.everyDays - 1 && r.sinceDays <= r.everyDays * 2;
