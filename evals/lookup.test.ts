// The Fiesta receipt read and named for real, with web lookups for the lines the namer guessed.
// Real model calls and a few Tavily searches; run on purpose, never in `npm test`.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readReceipt } from '../src/receipt-reader.server';
import { checkReading } from '../src/receipt-check';
import { nameLines } from '../src/item-names.server';

const admin = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

describe('web lookups', { timeout: 120_000 }, () => {
	it('names the unclear Fiesta lines', async () => {
		const checked = checkReading(await readReceipt(new Uint8Array(readFileSync('evals/real/fiesta.jpg')), null), new Date('2026-10-23T12:00:00Z'));
		if (!checked.ok) throw new Error(`not read: ${JSON.stringify(checked)}`);
		const items = checked.lines.filter((l) => l.kind === 'item');
		const plain = await nameLines(admin, null, null, items.map((l) => l.raw));
		const looked = await nameLines(admin, null, null, items.map((l) => l.raw), [], checked.store);
		const rows = items.map((l, i) => ({ raw: l.raw, before: `${plain[i].name} (${plain[i].flag})`, after: `${looked[i].name} (${looked[i].flag})` }));
		writeFileSync(process.env.OUT!, JSON.stringify({ store: checked.store, rows }, null, 1));
	});
});
