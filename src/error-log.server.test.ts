import { describe, expect, it } from 'vitest';
import { errorCode, errorMessage } from './error-log.server';

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

describe('errorMessage', () => {
	it('reads the message of a database error, which is not an Error', () => {
		// logged as "[object Object]" on 10-22
		expect(errorMessage({ code: '42703', message: 'column user_settings.tour_seen does not exist' })).toBe('column user_settings.tour_seen does not exist');
		expect(errorMessage(new Error('boom'))).toBe('boom');
		expect(errorMessage('plain')).toBe('plain');
		expect(errorMessage(null)).toBe('null');
	});
});
