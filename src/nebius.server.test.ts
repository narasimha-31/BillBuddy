import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiUnavailable, structured } from './nebius.server';

const spent = vi.hoisted(() => ({ all_micros: 0, user_micros: 0 }));
vi.mock('./admin.server', () => ({
	admin: {
		rpc: async () => ({ data: [spent], error: null }),
		from: () => ({ insert: async () => ({ error: null }) })
	}
}));

const call = () => structured({ role: 'names', purpose: 'test', userId: null, messages: [{ role: 'user', content: 'hi' }], schema: {} });
const answer = (status: number, body: object = {}) => new Response(JSON.stringify(body), { status });

afterEach(() => {
	vi.unstubAllGlobals();
	Object.assign(spent, { all_micros: 0, user_micros: 0 });
});

describe('structured', () => {
	it('treats a timeout as the provider being unavailable, without retrying', async () => {
		const fetch = vi.fn().mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
		vi.stubGlobal('fetch', fetch);
		await expect(call()).rejects.toBeInstanceOf(AiUnavailable);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('treats a failed connection as unavailable', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
		await expect(call()).rejects.toBeInstanceOf(AiUnavailable);
	});

	it('retries a server error once, then gives up as unavailable', async () => {
		const fetch = vi.fn().mockResolvedValue(answer(503));
		vi.stubGlobal('fetch', fetch);
		await expect(call()).rejects.toBeInstanceOf(AiUnavailable);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('reports a rejected request as a real error, not an outage', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(422)));
		const error = await call().catch((e: unknown) => e);
		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(AiUnavailable);
	});

	it('refuses before calling out once the budget for the day, or for this person, is spent', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		spent.all_micros = 1_000_000;
		await expect(call()).rejects.toMatchObject({ budget: true });
		Object.assign(spent, { all_micros: 60_000, user_micros: 50_000 });
		await expect(call()).rejects.toMatchObject({ budget: true, message: expect.stringContaining('person') });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('returns the parsed answer', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(200, { model: 'm', usage: {}, choices: [{ message: { content: '{"ok":true}' } }] })));
		await expect(call()).resolves.toEqual({ ok: true });
	});
});
