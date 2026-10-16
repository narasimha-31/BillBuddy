// Product merging against the shopper-checked pairs in evals/merge/pairs.json (kept local). One
// embedding call for every name, then every text model judges the pairs the key and the numbers
// leave open, and score cut-offs are tried offline, so finding safe ones costs nothing more.
//   node --env-file=.env node_modules/vitest/vitest.mjs run --dir evals merge-products --silent=false
// JUDGE_MODELS=a,b limits the judges, JUDGE_RUNS=3 asks each judge again. Cut-offs are chosen on the
// tuning pairs only, then scored on the pairs marked new, which nothing was tuned against.
import { existsSync, readFileSync } from 'node:fs';
import { it } from 'vitest';
import { embed } from '../src/nebius.server';
import { matchKey, numbersConflict } from '../src/product-match';
import { judgeRequest, verdictsFrom, type JudgeAnswer, type Verdict } from '../src/product-merge.server';
import { ask, listModels } from './token-factory';

const PAIRS = 'evals/merge/pairs.json';
const TASK = 'Instruct: Name the grocery product a shopper would compare prices for\nQuery: ';
const NOT_JUDGES = /embedding|VL|MiniCPM|gemma/i;

type Pair = { a: string; b: string; same: boolean; from: string };
const RUNS = Number(process.env.JUDGE_RUNS ?? 1);

it.skipIf(!existsSync(PAIRS))('merging matches the checked pairs', { timeout: 10 * 60_000 }, async () => {
	const pairs = JSON.parse(readFileSync(PAIRS, 'utf8')) as Pair[];
	const names = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
	const vectors = await embed({ purpose: 'eval_merge', userId: null, texts: names.map((n) => TASK + n) });
	const unit = new Map(names.map((n, i) => [n, vectors[i].map((x) => x / Math.hypot(...vectors[i]))]));
	const cosine = (a: string, b: string) => unit.get(a)!.reduce((s, x, i) => s + x * unit.get(b)![i], 0);

	const open = pairs.filter((p) => matchKey(p.a) !== matchKey(p.b) && !numbersConflict(p.a, p.b));
	const wanted = process.env.JUDGE_MODELS?.split(',');
	const judges = (await listModels()).filter((m) => (wanted ? wanted.includes(m.id) : !NOT_JUDGES.test(m.id)));

	const results = await Promise.all(
		judges.flatMap((model) => Array.from({ length: RUNS }, () => model)).map(async (model) => {
			const reply = await ask<JudgeAnswer>(model, { purpose: 'eval_judge_products', maxTokens: 30 * open.length + 100, ...judgeRequest(open) });
			if ('error' in reply) return { model: model.id, ms: reply.ms, error: reply.error };
			return { model: model.id, ms: reply.ms, verdicts: new Map<Pair, Verdict>(verdictsFrom(reply.answer, open.length).map((v, i) => [open[i], v])) };
		})
	);

	const rows = [];
	for (const result of results) {
		if (!('verdicts' in result) || !result.verdicts) {
			rows.push({ model: result.model, error: result.error?.slice(0, 60) });
			continue;
		}
		const decide = (p: Pair, low: number, high: number): Verdict =>
			matchKey(p.a) === matchKey(p.b) ? 'same' : numbersConflict(p.a, p.b) ? 'different' : cosine(p.a, p.b) >= high ? 'same' : cosine(p.a, p.b) < low ? 'different' : result.verdicts.get(p)!;
		const tally = (list: Pair[], low: number, high: number) => {
			const wrongs = list.filter((p) => !p.same && decide(p, low, high) === 'same').map((p) => `${p.a}=${p.b}`);
			return { wrong: wrongs.length, missed: list.filter((p) => p.same && decide(p, low, high) !== 'same').length, wrongs };
		};
		const tuning = pairs.filter((p) => p.from !== 'new');
		const fresh = pairs.filter((p) => p.from === 'new');
		// the safest cut-offs on the tuning pairs: fewest wrong merges first, then fewest missed
		let best: { low: number; high: number; wrong: number; missed: number; wrongs: string[] } | null = null;
		for (const low of [0, 0.7, 0.8, 0.85, 0.9])
			for (const high of [1.01]) {
				const { wrong, missed, wrongs } = tally(tuning, low, high);
				if (!best || wrong < best.wrong || (wrong === best.wrong && missed < best.missed)) best = { low, high, wrong, missed, wrongs };
			}
		const held = tally(fresh, best!.low, best!.high);
		rows.push({ model: result.model.replace(/^[^/]+\//, ''), ms: result.ms, low: best!.low, high: best!.high, wrong: best!.wrong, missed: best!.missed, new_wrong: held.wrong, new_missed: held.missed, new_wrongs: held.wrongs.join('; ').slice(0, 80) });
	}
	rows.sort((a, b) => (a.new_wrong ?? 99) + (a.wrong ?? 99) - (b.new_wrong ?? 99) - (b.wrong ?? 99) || (a.missed ?? 99) + (a.new_missed ?? 99) - (b.missed ?? 99) - (b.new_missed ?? 99) || (a.ms ?? 1e9) - (b.ms ?? 1e9));
	console.log(`key alone: ${pairs.filter((p) => matchKey(p.a) === matchKey(p.b) && !p.same).length} wrong, ${pairs.filter((p) => p.same && matchKey(p.a) !== matchKey(p.b)).length} missed of ${pairs.filter((p) => p.same).length} true pairs`);
	console.table(rows);
	const trueScores = pairs.filter((p) => p.same && matchKey(p.a) !== matchKey(p.b)).map((p) => [cosine(p.a, p.b), `${p.a}=${p.b}`] as const).sort((a, b) => a[0] - b[0]);
	console.log('lowest scores of true pairs the key misses:', trueScores.slice(0, 5).map(([s, n]) => `${s.toFixed(3)} ${n}`).join('; '));
});
