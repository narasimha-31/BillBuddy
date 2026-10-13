import { NEBIUS_API_KEY } from '$env/static/private';
import { admin } from './admin.server';
import { MODELS, costMicros, overDailyCap, overUserCap, type ModelRole } from './ai-budget';

const BASE_URL = 'https://api.tokenfactory.nebius.com/v1';

if (NEBIUS_API_KEY.length < 20) throw new Error('NEBIUS_API_KEY is missing or too short');

// the provider is down, slow or unreachable, or (budget) the daily AI budget is spent
export class AiUnavailable extends Error {
	constructor(
		message: string,
		readonly budget = false
	) {
		super(message);
	}
}

type Message = { role: 'system' | 'user'; content: string | unknown[] };
type Request = { role: ModelRole; purpose: string; userId: string | null; messages: Message[]; schema: object; maxTokens?: number };

// today's spend for everyone, and for this person, summed by the database
async function spentToday(userId: string | null) {
	const { data, error } = await admin.rpc('ai_spent_today', { p_user_id: userId });
	if (error) throw error;
	const row = (data as { all_micros: number; user_micros: number }[])[0];
	return { all: Number(row?.all_micros ?? 0), mine: Number(row?.user_micros ?? 0) };
}

// no answer in time, or no connection at all, counts as the provider being down; a timeout
// is not retried, since waiting twice would leave the person sitting there far too long
async function post(body: object, seconds: number) {
	try {
		return await fetch(`${BASE_URL}/chat/completions`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${NEBIUS_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(seconds * 1000)
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === 'TimeoutError') throw new AiUnavailable('provider timed out');
		if (error instanceof TypeError) throw new AiUnavailable(`provider unreachable: ${error.message}`);
		throw error;
	}
}

// One structured call. reasoning_effort "none" matters: with reasoning on, Nemotron ignores
// response_format and bills the reasoning, so strict JSON (our injection defence) breaks.
export async function structured<T>({ role, purpose, userId, messages, schema, maxTokens = 2000 }: Request): Promise<T> {
	const spent = await spentToday(userId);
	if (overDailyCap(spent.all)) throw new AiUnavailable('daily AI budget reached', true);
	if (overUserCap(spent.mine)) throw new AiUnavailable('daily AI budget for this person reached', true);

	const body = {
		model: MODELS[role].id,
		messages,
		temperature: 0,
		max_tokens: maxTokens,
		reasoning_effort: 'none',
		response_format: { type: 'json_schema', json_schema: { name: purpose, schema, strict: true } }
	};

	const started = Date.now();
	let usage: { prompt_tokens?: number; completion_tokens?: number } = {};
	let ok = false;
	let servedModel: string | null = null;
	try {
		let response = await post(body, MODELS[role].seconds);
		if (response.status === 429 || response.status >= 500) {
			await new Promise((wait) => setTimeout(wait, 1500));
			response = await post(body, MODELS[role].seconds);
		}
		if (response.status === 429 || response.status >= 500) throw new AiUnavailable(`provider returned ${response.status}`);
		if (!response.ok) throw new Error(`provider rejected the request: ${response.status}`);

		const json = await response.json();
		usage = json.usage ?? {};
		servedModel = typeof json.model === 'string' ? json.model.slice(0, 100) : null;
		const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '') as T;
		ok = true;
		return parsed;
	} finally {
		const { error } = await admin.from('ai_calls').insert({
			user_id: userId,
			model: MODELS[role].id,
			served_model: servedModel,
			purpose,
			input_tokens: usage.prompt_tokens ?? 0,
			output_tokens: usage.completion_tokens ?? 0,
			cost_micros: costMicros(role, usage),
			duration_ms: Date.now() - started,
			ok
		});
		if (error) console.error('ai call log failed', error.message);
	}
}
