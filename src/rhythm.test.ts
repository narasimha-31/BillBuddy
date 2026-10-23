import { describe, expect, it } from 'vitest';
import { agoText, dueSoon, everyText, rhythm } from './rhythm';

describe('rhythm', () => {
	it('finds tomatoes every 4 days', () => {
		expect(rhythm(['2026-10-01', '2026-10-05', '2026-10-09', '2026-10-13'], '2026-10-16')).toEqual({ everyDays: 4, lastOn: '2026-10-13', sinceDays: 3 });
	});

	it('needs three buys', () => {
		expect(rhythm(['2026-10-01', '2026-10-05'], '2026-10-06')).toBeNull();
	});

	it('counts a day once and skips undated buys', () => {
		expect(rhythm(['2026-10-01', '2026-10-01', null, '2026-10-08', '2026-10-15'], '2026-10-15')).toMatchObject({ everyDays: 7, sinceDays: 0 });
	});

	it('allows a little wobble but not chaos', () => {
		expect(rhythm(['2026-09-01', '2026-09-08', '2026-09-14', '2026-09-22', '2026-09-29'], '2026-10-01')).toMatchObject({ everyDays: 7 });
		expect(rhythm(['2026-06-01', '2026-06-03', '2026-08-20', '2026-08-22', '2026-10-30'], '2026-11-01')).toBeNull();
	});

	it('ignores buying the same thing on back to back days', () => {
		expect(rhythm(['2026-10-01', '2026-10-02', '2026-10-03'], '2026-10-04')).toBeNull();
	});

	it('looks at the latest buys only', () => {
		const old = ['2026-01-01', '2026-01-20', '2026-02-15', '2026-03-01'];
		const weekly = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27'];
		expect(rhythm([...old, ...weekly], '2026-10-28')).toMatchObject({ everyDays: 7 });
	});
});

describe('wording', () => {
	it('says weeks and months when close', () => {
		expect([4, 7, 14, 30, 10].map(everyText)).toEqual(['every 4 days', 'every week', 'every 2 weeks', 'every month', 'every 10 days']);
		expect([0, 1, 5].map(agoText)).toEqual(['today', 'yesterday', '5 days ago']);
	});

	it('is due near the usual gap, not long after it stopped', () => {
		const base = { everyDays: 4, lastOn: '2026-10-01' };
		expect(dueSoon({ ...base, sinceDays: 2 })).toBe(false);
		expect(dueSoon({ ...base, sinceDays: 3 })).toBe(true);
		expect(dueSoon({ ...base, sinceDays: 8 })).toBe(true);
		expect(dueSoon({ ...base, sinceDays: 9 })).toBe(false);
	});
});
