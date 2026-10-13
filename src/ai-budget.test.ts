import { describe, expect, it } from 'vitest';
import { DAILY_CAP_MICROS, USER_DAILY_CAP_MICROS, costMicros, overDailyCap, overUserCap } from './ai-budget';

describe('costMicros', () => {
	it('prices input and output tokens separately at the catalog rate', () => {
		// 1,000 in at $0.15/M + 200 out at $0.50/M = $0.00015 + $0.0001 = 250 micros
		expect(costMicros('vision', { prompt_tokens: 1000, completion_tokens: 200 })).toBe(250);
	});

	it('rounds a fraction of a micro up, never down', () => {
		// 1 in token at $0.06/M = 0.06 micros
		expect(costMicros('names', { prompt_tokens: 1 })).toBe(1);
	});

	it('treats missing usage as zero instead of failing', () => {
		expect(costMicros('names', {})).toBe(0);
	});
});

describe('overDailyCap', () => {
	it('stops at the cap, not after it', () => {
		expect(overDailyCap(DAILY_CAP_MICROS - 1)).toBe(false);
		expect(overDailyCap(DAILY_CAP_MICROS)).toBe(true);
	});
});

describe('overUserCap', () => {
	it('stops one person well before they could use up the day for everyone', () => {
		expect(overUserCap(USER_DAILY_CAP_MICROS - 1)).toBe(false);
		expect(overUserCap(USER_DAILY_CAP_MICROS)).toBe(true);
		expect(USER_DAILY_CAP_MICROS * 10).toBeLessThanOrEqual(DAILY_CAP_MICROS);
	});
});
