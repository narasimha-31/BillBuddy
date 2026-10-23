import { env } from '$env/dynamic/private';
import { admin } from './admin.server';

export type Found = { title: string; content: string };

const SEARCH_MS = 4000;
const RESULTS = 3;

// "FIESTA MART #18" -> "FIESTA MART": the chain is enough, a branch number says where someone shops
export const chainOf = (store: string) => store.replace(/#?\s*\d+/g, '').replace(/\s+/g, ' ').trim();

// One web search per unclear line, all at once and cut off together. Only the chain's name and the
// printed text leave, never the shopper. A lookup that fails just leaves the model's own guess, so it
// is logged and the receipt goes on.
export async function searchLines(store: string, raws: string[], userId: string | null): Promise<(Found[] | null)[]> {
	const key = env.TAVILY_API_KEY;
	if (!key) return raws.map(() => null);
	const chain = chainOf(store);
	const signal = AbortSignal.timeout(SEARCH_MS);
	return Promise.all(
		raws.map(async (raw) => {
			const started = Date.now();
			let found: Found[] | null = null;
			try {
				const response = await fetch('https://api.tavily.com/search', {
					method: 'POST',
					headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
					body: JSON.stringify({ query: `${chain} ${raw}`, max_results: RESULTS, search_depth: 'basic' }),
					signal
				});
				if (response.ok) {
					const json = (await response.json()) as { results?: { title?: unknown; content?: unknown }[] };
					found = (json.results ?? []).slice(0, RESULTS).map((r) => ({ title: String(r.title ?? '').slice(0, 120), content: String(r.content ?? '').slice(0, 300) }));
				}
			} catch (problem) {
				console.error('web lookup failed', problem instanceof Error ? problem.name : problem);
			}
			const logged = await admin.from('ai_calls').insert({ user_id: userId, model: 'tavily/search', served_model: null, purpose: 'name_lookup', input_tokens: 0, output_tokens: 0, cost_micros: 0, duration_ms: Date.now() - started, ok: found !== null });
			if (logged.error) console.error('lookup log failed', logged.error.message);
			return found;
		})
	);
}
