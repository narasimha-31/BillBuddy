import { describe, expect, it } from 'vitest';
import { spendBars } from './spend';

const rows = [
	{ purchased_on: '2026-10-18', total_cents: 500 },
	{ purchased_on: '2026-10-17', total_cents: 300 },
	{ purchased_on: '2026-09-30', total_cents: 1000 },
	{ purchased_on: '2026-04-30', total_cents: 9999 },
	{ purchased_on: '2026-05-01', total_cents: null }
];

describe('spendBars', () => {
	it('gives six months ending this month', () => {
		const bars = spendBars(rows, 'month', '2026-10-20');
		expect(bars.map((b) => b.label)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
		expect(bars[0]).toMatchObject({ from: '2026-05-01', to: '2026-05-31', cents: 0, receipts: 1 });
		expect(bars[4]).toMatchObject({ to: '2026-09-30', cents: 1000 });
		expect(bars[5].cents).toBe(800);
	});

	it('gives eight Sunday to Saturday weeks ending this week', () => {
		const bars = spendBars(rows, 'week', '2026-10-20');
		expect(bars).toHaveLength(8);
		expect(bars[7]).toMatchObject({ from: '2026-10-18', to: '2026-10-24', label: '10/18', cents: 500 });
		expect(bars[6]).toMatchObject({ from: '2026-10-11', to: '2026-10-17', cents: 300 });
		expect(bars[0].from).toBe('2026-08-30');
	});

	it('crosses a year in months', () => {
		expect(spendBars([], 'month', '2027-02-10')[0]).toMatchObject({ from: '2026-09-01', label: 'Sep' });
	});
});
