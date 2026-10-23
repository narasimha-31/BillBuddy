// A real receipt photographed from farther and farther away: the Fiesta photo shrunk inside a full
// frame. Real model calls, about a cent each; run on purpose, never in `npm test`.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { readReceipt } from '../src/receipt-reader.server';
import { checkReading } from '../src/receipt-check';

const DIR = process.env.FAR_DIR!;
const today = new Date('2026-10-23T12:00:00Z');

describe('far away photos', { timeout: 120_000 }, () => {
	it('reads each distance', async () => {
		const out: Record<string, unknown> = {};
		for (const size of [55, 32, 20]) {
			let result;
			try {
				result = checkReading(await readReceipt(new Uint8Array(readFileSync(`${DIR}/far-${size}.jpg`)), null), today);
			} catch (problem) {
				out[size] = { threw: String(problem) };
				continue;
			}
			out[size] = result.ok
				? { ok: true, date: result.purchasedOn, total: result.totalCents, lines: result.lines.filter((l) => l.kind === 'item').map((l) => `${l.raw} ${l.totalCents}`), totals_match: result.totals_match, lines_match_subtotal: result.lines_match_subtotal, needs_review: result.needs_review }
				: result;
		}
		writeFileSync(`${DIR}/far-results.json`, JSON.stringify(out, null, 1));
	});
});
