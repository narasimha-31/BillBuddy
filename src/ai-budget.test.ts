import { describe, expect, it } from 'vitest';
import { DAILY_CAP_MICROS, USER_DAILY_CAP_MICROS, costMicros, overDailyCap, overUserCap } from './ai-budget';

describe('costMicros', () => {
	it('prices input and output tokens separately at the catalog rate', () => {
		// 1,000 in at $0.45/M + 200 out at $3/M = $0.00045 + $0.0006 = 1,050 micros
		expect(costMicros('vision', { prompt_tokens: 1000, completion_tokens: 200 })).toBe(1050);
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
		expect(USER_DAILY_CAP_MICROS * 5).toBeLessThanOrEqual(DAILY_CAP_MICROS);
	});
});
