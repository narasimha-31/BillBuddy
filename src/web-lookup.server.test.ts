import { afterEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ TAVILY_API_KEY: 'tvly-test-key' as string | undefined }));
const logged = vi.hoisted(() => [] as unknown[]);
const today = vi.hoisted(() => ({ count: 0 }));
vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('./admin.server', () => {
	const counted = { eq: () => counted, gte: async () => ({ count: today.count, error: null }) };
	return { admin: { from: () => ({ insert: async (row: unknown) => (logged.push(row), { error: null }), select: () => counted }) } };
});

import { chainOf, searchLines, SEARCHES_PER_DAY } from './web-lookup.server';

afterEach(() => {
	vi.unstubAllGlobals();
	logged.length = 0;
	today.count = 0;
	env.TAVILY_API_KEY = 'tvly-test-key';
});

describe('chainOf', () => {
	it('drops the branch number', () => {
		expect(chainOf('FIESTA MART #18')).toBe('FIESTA MART');
		expect(chainOf('Walmart Supercenter 1234')).toBe('Walmart Supercenter');
	});
});

describe('searchLines', () => {
	it('stops at the daily searches for a shopper, without calling out', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		today.count = SEARCHES_PER_DAY;
		expect(await searchLines('H-E-B', ['PILLW SCHUN BEEF'], 'user-1')).toEqual([null]);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('sends only the chain and the printed line, and keeps a short result', async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ title: 'Kraft Original BBQ sauce', content: 'x'.repeat(500), url: 'https://a' }] })));
		vi.stubGlobal('fetch', fetch);
		const [found] = await searchLines('FIESTA MART #18', ['CF ORGI SAUCE'], 'user-1');
		expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ query: 'FIESTA MART CF ORGI SAUCE' });
		expect(found).toEqual([{ title: 'Kraft Original BBQ sauce', content: 'x'.repeat(300) }]);
		expect(logged).toMatchObject([{ model: 'tavily/search', purpose: 'name_lookup', ok: true }]);
	});

	it('leaves the guess when the search fails, and logs the failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')));
		expect(await searchLines('H-E-B', ['PILLW SCHUN BEEF'], null)).toEqual([null]);
		expect(logged).toMatchObject([{ ok: false }]);
	});

	it('searches nothing without a key', async () => {
		env.TAVILY_API_KEY = undefined;
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		expect(await searchLines('H-E-B', ['A', 'B'], null)).toEqual([null, null]);
		expect(fetch).not.toHaveBeenCalled();
	});
});
