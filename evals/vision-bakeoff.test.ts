// Every model on Token Factory reads the same real receipt photos with the app's exact prompt and
// schema, and each answer goes through the app's own checks. Scored against a hand-made answer key
// in evals/real/answers.json (kept local, with the photos). Run on purpose only:
//   node --env-file=.env node_modules/vitest/vitest.mjs run evals/vision-bakeoff.test.ts
// BAKEOFF_MODELS=a,b limits the models, BAKEOFF_RUNS=3 repeats each read, BAKEOFF_EFFORT=low (or omit)
// is for models that refuse reasoning_effort none.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { base64, readingInstructions, readingSchema } from '../src/receipt-reader.server';
import { checkReading, type Checked, type Reading } from '../src/receipt-check';

type Answer = { purchasedOn: string; totalCents: number; lines: [string, number][]; file?: string; refuse?: undefined } | { file: string; refuse: 'not_a_receipt' | 'handwritten' };
type Model = { id: string; pricing: { prompt: string; completion: string } };

const KEY = 'evals/real/answers.json';
const RUNS = Number(process.env.BAKEOFF_RUNS ?? 1);
const EFFORT = process.env.BAKEOFF_EFFORT ?? 'none';
const LIMIT_MS = 60_000;
const NOT_READERS = /embedding/i;

const admin = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const api = (path: string, init?: RequestInit) =>
	fetch(`https://api.tokenfactory.nebius.com/v1/${path}`, {
		...init,
		headers: { authorization: `Bearer ${process.env.NEBIUS_API_KEY}`, 'content-type': 'application/json' }
	});

// letter pairs shared between two texts (Dice coefficient), so "A F CHICKEN NOODLE" still matches "A/F CHICKEN NOODLE"
function alike(a: string, b: string) {
	const pairs = (s: string) => {
		const t = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
		return Array.from({ length: Math.max(t.length - 1, 0) }, (_, i) => t.slice(i, i + 2));
	};
	const x = pairs(a);
	const y = pairs(b);
	if (!x.length || !y.length) return 0;
	const left = new Map<string, number>();
	for (const p of x) left.set(p, (left.get(p) ?? 0) + 1);
	let shared = 0;
	for (const p of y) {
		const n = left.get(p) ?? 0;
		if (n) {
			shared++;
			left.set(p, n - 1);
		}
	}
	return (2 * shared) / (x.length + y.length);
}

function score(checked: Checked, answer: Answer) {
	if (answer.refuse) return { refused: !checked.ok && checked.reason === answer.refuse, invented: checked.ok ? checked.lines.length : 0 };
	if (!checked.ok) return { read: false, found: 0, extra: 0, textExact: 0, date: false, total: false, adds: false, review: true };
	const unused = [...checked.lines];
	let found = 0;
	let textExact = 0;
	for (const [raw, cents] of answer.lines) {
		const at = unused.findIndex((l) => Math.abs(l.totalCents) === cents && alike(l.raw, raw) >= 0.6);
		if (at < 0) continue;
		found++;
		if (alike(unused[at].raw, raw) >= 0.9) textExact++;
		unused.splice(at, 1);
	}
	return {
		read: true,
		found,
		extra: unused.length,
		textExact,
		date: checked.purchasedOn === answer.purchasedOn,
		total: checked.totalCents === answer.totalCents,
		adds: checked.lines_match_subtotal && checked.totals_match !== false,
		review: checked.needs_review
	};
}

async function readWith(model: Model, jpeg: Uint8Array) {
	const body = {
		model: model.id,
		temperature: 0,
		max_tokens: 3000,
		...(EFFORT === 'omit' ? {} : { reasoning_effort: EFFORT }),
		response_format: { type: 'json_schema', json_schema: { name: 'eval_bakeoff', schema: readingSchema, strict: true } },
		messages: [
			{ role: 'system', content: readingInstructions },
			{
				role: 'user',
				content: [
					{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64(jpeg)}` } },
					{ type: 'text', text: 'Transcribe this image following the rules.' }
				]
			}
		]
	};
	const started = Date.now();
	let usage = { prompt_tokens: 0, completion_tokens: 0 };
	let ok = false;
	try {
		const response = await api('chat/completions', { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(LIMIT_MS) });
		if (!response.ok) return { error: `${response.status} ${(await response.text()).slice(0, 160)}`, ms: Date.now() - started };
		const json = await response.json();
		usage = json.usage ?? usage;
		const reading = JSON.parse(json.choices?.[0]?.message?.content ?? '') as Reading;
		ok = true;
		return { reading, ms: Date.now() - started };
	} catch (error) {
		return { error: String(error).slice(0, 160), ms: Date.now() - started };
	} finally {
		const cost = Math.ceil(usage.prompt_tokens * Number(model.pricing.prompt) * 1e6 + usage.completion_tokens * Number(model.pricing.completion) * 1e6);
		await admin.from('ai_calls').insert({
			model: model.id.slice(0, 100),
			purpose: 'eval_vision_bakeoff',
			input_tokens: usage.prompt_tokens,
			output_tokens: usage.completion_tokens,
			cost_micros: cost,
			duration_ms: Date.now() - started,
			ok
		});
	}
}

it.skipIf(!existsSync(KEY))('vision bake-off on real receipts', { timeout: 30 * 60_000 }, async () => {
	const answers = JSON.parse(readFileSync(KEY, 'utf8')) as Record<string, Answer>;
	const wanted = process.env.BAKEOFF_MODELS?.split(',');
	const models = ((await (await api('models?verbose=true')).json()).data as Model[]).filter((m) =>
		wanted ? wanted.includes(m.id) : !NOT_READERS.test(m.id)
	);
	const photos = Object.entries(answers).map(([name, a]) => ({ name, jpeg: new Uint8Array(readFileSync(a.file ?? `evals/real/${name}.jpg`)) }));
	const today = new Date('2026-10-16T12:00:00Z');

	const results = await Promise.all(
		models.map(async (model) => {
			const reads = [];
			for (let run = 0; run < RUNS; run++)
				for (const { name, jpeg } of photos) {
					const answer = await readWith(model, jpeg);
					if ('error' in answer) {
						reads.push({ name, ms: answer.ms, error: answer.error });
						// a model that cannot take an image at all fails the same way on every photo
						if (/image|vision|multimodal|content type|400/i.test(answer.error ?? '') && !reads.some((r) => !('error' in r))) return { model: model.id, reads };
						continue;
					}
					const checked = checkReading(answer.reading, today);
					reads.push({ name, ms: answer.ms, ...score(checked, answers[name]), checked });
				}
			return { model: model.id, reads };
		})
	);

	writeFileSync(`evals/real/bakeoff-${Date.now()}.json`, JSON.stringify(results, null, '\t'));
	const expected = photos.reduce((s, p) => { const a = answers[p.name]; return s + (a.refuse ? 0 : a.lines.length); }, 0) * RUNS;
	const rows = results.map(({ model, reads }) => {
		const answered = reads.filter((r) => !('error' in r)) as Record<string, any>[];
		const good = answered.filter((r) => 'found' in r);
		const refusals = answered.filter((r) => 'refused' in r);
		const times = reads.map((r) => r.ms).sort((a, b) => a - b);
		return {
			model,
			answered: `${answered.length}/${reads.length}`,
			refused: `${refusals.filter((r) => r.refused).length}/${refusals.length}`,
			invented: refusals.reduce((s, r) => s + r.invented, 0),
			lines: `${good.reduce((s, r) => s + r.found, 0)}/${expected}`,
			text: good.reduce((s, r) => s + r.textExact, 0),
			extra: good.reduce((s, r) => s + r.extra, 0),
			dates: good.filter((r) => r.date).length,
			totals: good.filter((r) => r.total).length,
			adds: good.filter((r) => r.adds).length,
			median_ms: times[Math.floor(times.length / 2)],
			max_ms: times.at(-1),
			error: reads.find((r) => 'error' in r && r.error)?.['error' as never]
		};
	});
	rows.sort((a, b) => parseInt(b.lines) - parseInt(a.lines) || a.median_ms - b.median_ms);
	console.table(rows);
});
