import { describe, expect, it } from 'vitest';
import { agoText, amountText, habitText, dueSoon, everyText, rhythm as rhythmOf, type Bought } from './rhythm';

const ones = (dates: (string | null)[]): Bought[] => dates.map((on) => ({ on, quantity: 1, unit: 'ea' }));
const rhythm = (dates: (string | null)[], today: string) => rhythmOf(ones(dates), today);

describe('rhythm', () => {
	it('finds tomatoes every 4 days', () => {
		expect(rhythm(['2026-10-01', '2026-10-05', '2026-10-09', '2026-10-13'], '2026-10-16')).toEqual({ everyDays: 4, lastOn: '2026-10-13', sinceDays: 3, lastAmount: 1, per: 'ea' });
	});

	it('needs three buys', () => {
		expect(rhythm(['2026-10-01', '2026-10-05'], '2026-10-06')).toBeNull();
	});

	it('skips undated buys', () => {
		expect(rhythm(['2026-10-01', null, '2026-10-08', '2026-10-15'], '2026-10-15')).toMatchObject({ everyDays: 7, sinceDays: 0 });
	});

	it('adds up lines from the same day', () => {
		expect(rhythm(['2026-10-01', '2026-10-01', '2026-10-15', '2026-10-22', '2026-10-22'], '2026-10-23')).toMatchObject({ everyDays: 14, lastAmount: 2 });
	});

	it('a bigger lot lasts longer', () => {
		const lb = (on: string, quantity: number): Bought => ({ on, quantity, unit: 'lb' });
		// a pound every 3 days, whatever the size of each buy
		const found = rhythmOf([lb('2026-10-01', 1), lb('2026-10-04', 2), lb('2026-10-10', 1), lb('2026-10-13', 3)], '2026-10-20')!;
		expect(found).toMatchObject({ everyDays: 9, per: 'lb', lastAmount: 3, sinceDays: 7 });
		expect(dueSoon(found)).toBe(false);
		expect(amountText(found)).toBe('3 lb');
	});

	it('counts how many were bought', () => {
		const eggs = (on: string, quantity: number): Bought => ({ on, quantity, unit: 'ea' });
		expect(rhythmOf([eggs('2026-10-01', 1), eggs('2026-10-08', 2), eggs('2026-10-22', 1), eggs('2026-10-29', 2)], '2026-11-05')).toMatchObject({ everyDays: 14, lastAmount: 2 });
	});

	it('weights in ounces and kilos turn into pounds', () => {
		const found = rhythmOf([{ on: '2026-10-01', quantity: 16, unit: 'oz' }, { on: '2026-10-05', quantity: 0.4536, unit: 'kg' }, { on: '2026-10-09', quantity: 1, unit: 'lb' }], '2026-10-10')!;
		expect(found).toMatchObject({ everyDays: 4, per: 'lb' });
	});

	it('mixed weights and counts fall back to one per buy', () => {
		const found = rhythmOf([{ on: '2026-10-01', quantity: 3, unit: 'lb' }, { on: '2026-10-05', quantity: 1, unit: 'ea' }, { on: '2026-10-09', quantity: 2, unit: 'lb' }], '2026-10-10')!;
		expect(found).toMatchObject({ everyDays: 4, per: 'ea', lastAmount: 1 });
		expect(amountText(found)).toBe('');
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

	it('says how long a bigger lot lasts', () => {
		const base = { lastOn: '2026-10-01', sinceDays: 3 };
		expect(habitText({ ...base, everyDays: 7, lastAmount: 1, per: 'ea' })).toBe('Every week · last 3 days ago');
		expect(habitText({ ...base, everyDays: 9, lastAmount: 3, per: 'lb' })).toBe('3 lb lasts about 9 days · bought 3 days ago');
		expect(habitText({ ...base, everyDays: 14, lastAmount: 2, per: 'ea' })).toBe('2 lasts about 2 weeks · bought 3 days ago');
		expect(habitText({ ...base, everyDays: 30, lastAmount: 1.5, per: 'lb' })).toBe('1.5 lb lasts about a month · bought 3 days ago');
	});

	it('is due near the usual gap, not long after it stopped', () => {
		const base = { everyDays: 4, lastOn: '2026-10-01', lastAmount: 1, per: 'ea' as const };
		expect(dueSoon({ ...base, sinceDays: 2 })).toBe(false);
		expect(dueSoon({ ...base, sinceDays: 3 })).toBe(true);
		expect(dueSoon({ ...base, sinceDays: 8 })).toBe(true);
		expect(dueSoon({ ...base, sinceDays: 9 })).toBe(false);
	});
});
