import { describe, expect, it } from 'vitest';
import { errorCode } from './error-log.server';

describe('errorCode', () => {
	it('keeps string codes and turns number codes into text', () => {
		expect(errorCode({ code: '23505' })).toBe('23505');
		expect(errorCode({ code: 'x'.repeat(200) })).toHaveLength(80);
		// what AbortSignal.timeout throws; this crashed the error log on 10-13
		expect(errorCode(new DOMException('The operation timed out.', 'TimeoutError'))).toBe('23');
	});

	it('returns nothing when there is no usable code', () => {
		for (const error of [null, undefined, 'boom', new Error('boom'), { code: { nested: true } }, { code: null }]) {
			expect(errorCode(error)).toBeNull();
		}
	});
});
