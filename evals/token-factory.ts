// Any Token Factory model by id, for side-by-side tests. Each call is logged like the app's own, under
// an "eval_" purpose: it counts in the balance but not against the app's daily cap.
import { createClient } from '@supabase/supabase-js';

export type Model = { id: string; pricing: { prompt: string; completion: string } };

const admin = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

export const api = (path: string, init?: RequestInit) =>
	fetch(`https://api.tokenfactory.nebius.com/v1/${path}`, {
		...init,
		headers: { authorization: `Bearer ${process.env.NEBIUS_API_KEY}`, 'content-type': 'application/json' }
	});

export async function listModels(): Promise<Model[]> {
	return (await (await api('models?verbose=true')).json()).data;
}

type Ask = { purpose: string; schema: object; messages: object[]; maxTokens: number; effort?: string; limitMs?: number };

export async function ask<T>(model: Model, { purpose, schema, messages, maxTokens, effort = 'none', limitMs = 60_000 }: Ask) {
	const body = {
		model: model.id,
		temperature: 0,
		max_tokens: maxTokens,
		...(effort === 'omit' ? {} : { reasoning_effort: effort }),
		response_format: { type: 'json_schema', json_schema: { name: purpose, schema, strict: true } },
		messages
	};
	const started = Date.now();
	let usage = { prompt_tokens: 0, completion_tokens: 0 };
	let ok = false;
	try {
		const response = await api('chat/completions', { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(limitMs) });
		if (!response.ok) return { error: `${response.status} ${(await response.text()).slice(0, 160)}`, ms: Date.now() - started };
		const json = await response.json();
		usage = json.usage ?? usage;
		const answer = JSON.parse(json.choices?.[0]?.message?.content ?? '') as T;
		ok = true;
		return { answer, ms: Date.now() - started };
	} catch (error) {
		return { error: String(error).slice(0, 160), ms: Date.now() - started };
	} finally {
		const cost = Math.ceil(usage.prompt_tokens * Number(model.pricing.prompt) * 1e6 + usage.completion_tokens * Number(model.pricing.completion) * 1e6);
		await admin.from('ai_calls').insert({
			model: model.id.slice(0, 100),
			purpose,
			input_tokens: usage.prompt_tokens,
			output_tokens: usage.completion_tokens,
			cost_micros: cost,
			duration_ms: Date.now() - started,
			ok
		});
	}
}
