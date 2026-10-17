// Who should pick each line's aisle: the vision model while it reads the photo, or the naming model
// from the printed text alone. Scored against a hand-made key (evals/real/aisles.json, kept local).
// Both get the same aisle definitions; a plain read is timed too, to see what the extra field costs.
//   node --env-file=.env node_modules/vitest/vitest.mjs run --dir evals aisle-bakeoff
// AISLE_RUNS=2 repeats every call.
// Oct 16, 2 runs, 42 labelled lines: naming model 98% (median 3.1 s) with or without the aisle
// definitions; vision model 95% (4.4 s), reading WHL milk as Other or Beverages. The naming model keeps the job.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { MODELS } from '../src/ai-budget';
import { CATEGORIES, linesPayload } from '../src/item-names';
import { namingInstructions, namingSchema } from '../src/item-names.server';
import { base64, readingInstructions, readingSchema } from '../src/receipt-reader.server';
import { ask, listModels } from './token-factory';

// What each aisle holds, in general terms, given to both models alike
const AISLE_GUIDE = `Aisles:
- Produce: fresh fruit, vegetables, fresh herbs, chillies, mushrooms.
- Meat & seafood: raw or cooked meat, poultry, fish and shellfish, deli meats.
- Dairy & eggs: milk, cheese, yogurt, butter, cream, eggs, plant milks.
- Bakery: bread, rolls, tortillas, flatbreads, cakes and pastries.
- Pantry: shelf-stable food: canned and boxed food, soups, broth, dry grains, beans and lentils, flour, pasta and noodles, sauces, condiments, spices, oils, baking supplies.
- Frozen: anything sold frozen.
- Snacks: chips, crackers, cookies, candy, nuts and other ready-to-eat snacks.
- Beverages: water, soda, juice, coffee, tea and other drinks without alcohol.
- Household: cleaning supplies, paper goods, kitchen and bathroom items, foil and bakeware.
- Personal care: shampoo, soap, toothpaste, cosmetics, medicine.
- Baby, Pet, Alcohol: items for babies, for pets, and drinks with alcohol.
- Other: anything that fits none of these.`;

const KEY = 'evals/real/aisles.json';
const RUNS = Number(process.env.AISLE_RUNS ?? 2);
const PHOTOS = ['fiesta', 'parivar', 'heb'];

const RETURN = '\n\nReturn only the JSON object';
const aisleSchema = structuredClone(readingSchema) as typeof readingSchema;
const line = aisleSchema.properties.lines.items as { properties: Record<string, object>; required: string[] };
line.properties.category = { type: 'string', enum: [...CATEGORIES] };
line.required.push('category');
const aisleRule = `\n- category: the store aisle each line belongs in, from the list below. Use the whole receipt for context: the store, section headings and the items around it. A discount takes the aisle of the item it discounts.\n\n${AISLE_GUIDE}`;
const readAisleInstructions = readingInstructions.replace(JSON.stringify(readingSchema), JSON.stringify(aisleSchema)).replace(RETURN, aisleRule + RETURN);

const OLD_RULE = '- category: the best fit from the list. Fresh fruit, vegetables, herbs and chillies are "Produce".';
const namingGuided = namingInstructions.replace(OLD_RULE, '- category: the best fit from the aisle list below.').replace(RETURN, `\n\n${AISLE_GUIDE}${RETURN}`);

// letter pairs shared between two texts, so a reading of "A/F CHICKEN NOODLE" still finds its label
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

type Read = { lines: { raw: string; discount: boolean; category?: string }[] };
type Named = { items: { index: number; category: string }[] };

it.skipIf(!existsSync(KEY))('aisle bake-off', { timeout: 20 * 60_000 }, async () => {
	const key = JSON.parse(readFileSync(KEY, 'utf8')) as Record<string, string[]>;
	const answers = JSON.parse(readFileSync('evals/real/answers.json', 'utf8')) as Record<string, { lines: [string, number][] }>;
	const models = await listModels();
	const vision = models.find((m) => m.id === MODELS.vision.id)!;
	const names = models.find((m) => m.id === MODELS.names.id)!;

	const tally: Record<string, { right: number; of: number; ms: number[]; wrong: string[]; found: number }> = {};
	const note = (arm: string, raw: string, got: string | undefined) => {
		const t = (tally[arm] ??= { right: 0, of: 0, ms: [], wrong: [], found: 0 });
		const wanted = key[raw];
		if (!wanted) return;
		t.of++;
		if (got && wanted.includes(got)) t.right++;
		else t.wrong.push(`${raw} -> ${got ?? 'missing'} (want ${wanted.join('/')})`);
	};

	for (let run = 0; run < RUNS; run++)
		for (const photo of PHOTOS) {
			const jpeg = new Uint8Array(readFileSync(`evals/real/${photo}.jpg`));
			const image = { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64(jpeg)}` } };
			const raws = answers[photo].lines.map(([raw]) => raw);

			const [plain, withAisle, current, guided] = await Promise.all([
				ask<Read>(vision, { purpose: 'eval_aisle_read', schema: readingSchema, maxTokens: 3000, messages: [{ role: 'system', content: readingInstructions }, { role: 'user', content: [image, { type: 'text', text: 'Transcribe this image following the rules.' }] }] }),
				ask<Read>(vision, { purpose: 'eval_aisle_read', schema: aisleSchema, maxTokens: 3500, messages: [{ role: 'system', content: readAisleInstructions }, { role: 'user', content: [image, { type: 'text', text: 'Transcribe this image following the rules.' }] }] }),
				...[namingInstructions, namingGuided].map((system) =>
					ask<Named>(names, {
						purpose: 'eval_aisle_names',
						schema: namingSchema,
						maxTokens: 150 * raws.length + 200,
						messages: [{ role: 'system', content: system }, { role: 'user', content: `<receipt_lines>${linesPayload(raws.map((raw, index) => ({ index, raw })))}</receipt_lines>` }]
					})
				)
			]);

			(tally['vision read, no aisle'] ??= { right: 0, of: 0, ms: [], wrong: [], found: 0 }).ms.push(plain.ms);
			for (const [arm, result] of [['vision reads + picks aisle', withAisle]] as const) {
				const t = (tally[arm] ??= { right: 0, of: 0, ms: [], wrong: [], found: 0 });
				t.ms.push(result.ms);
				if (!('answer' in result) || !result.answer) {
					t.wrong.push(`${photo}: ${'error' in result ? result.error : 'no answer'}`);
					continue;
				}
				const unused = result.answer.lines.filter((l) => !l.discount);
				for (const raw of raws) {
					const at = unused.findIndex((l) => alike(l.raw, raw) >= 0.6);
					if (at < 0) {
						note(arm, raw, undefined);
						continue;
					}
					t.found++;
					note(arm, raw, unused[at].category);
					unused.splice(at, 1);
				}
			}
			for (const [arm, result] of [['names, prompt today', current], ['names, aisle guide', guided]] as const) {
				const t = (tally[arm] ??= { right: 0, of: 0, ms: [], wrong: [], found: 0 });
				t.ms.push(result.ms);
				if (!('answer' in result) || !result.answer) {
					t.wrong.push(`${photo}: ${'error' in result ? result.error : 'no answer'}`);
					continue;
				}
				for (const [index, raw] of raws.entries()) note(arm, raw, result.answer.items.find((i) => i.index === index)?.category);
			}
		}

	const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
	const table = Object.entries(tally).map(([arm, t]) => ({
		arm,
		right: t.of ? `${t.right}/${t.of} (${Math.round((100 * t.right) / t.of)}%)` : '-',
		medianMs: median(t.ms),
		slowestMs: Math.max(...t.ms),
		wrong: t.wrong
	}));
	writeFileSync(`evals/real/aisles-${Date.now()}.json`, JSON.stringify(table, null, 1));
	console.table(table.map(({ wrong, ...rest }) => ({ ...rest, misses: wrong.length })));
	for (const row of table) if (row.wrong.length) console.log(`${row.arm}:\n  ${row.wrong.join('\n  ')}`);
});
