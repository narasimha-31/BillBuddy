import type { Purchase } from '../../price-history';

// one made-up shopper's last three months, priced from the same 2026 research as the landing receipt
type Line = [raw: string, name: string, category: string, quantity: number, unit: 'ea' | 'lb', unitPrice: number, product: string];

export type SampleReceipt = {
	id: string;
	store: string;
	date: string;
	channel: 'in_store' | 'delivery';
	via: string | null;
	lines: { raw: string; name: string; category: string; quantity: number; unit: 'ea' | 'lb'; unitPriceCents: number; totalCents: number; product: string }[];
	totalCents: number;
};

const MILK = 'Whole milk, 1 gal';
const EGGS = 'Large eggs, 12 ct';
const BANANAS = 'Bananas';
const CHICKEN = 'Chicken breast';
const BEEF = 'Ground beef 80/20';

const raw: { store: string; date: string; via?: string; lines: Line[] }[] = [
	{
		store: 'Walmart',
		date: '2026-07-12',
		lines: [
			['GV WHL MLK GAL', MILK, 'Dairy & eggs', 1, 'ea', 3.08, 'milk'],
			['GV LG EGGS 12CT', EGGS, 'Dairy & eggs', 1, 'ea', 2.48, 'eggs'],
			['BANANAS', BANANAS, 'Produce', 2.3, 'lb', 0.54, 'bananas'],
			['FRSH CHKN BRST', CHICKEN, 'Meat & seafood', 1.8, 'lb', 3.47, 'chicken'],
			['GV SPAGHETTI 16Z', 'Spaghetti, 16 oz', 'Pantry', 1, 'ea', 1.12, 'pasta'],
			['GV TSTD OATS 18Z', 'Toasted oat cereal, 18 oz', 'Pantry', 1, 'ea', 2.88, 'cereal']
		]
	},
	{
		store: 'Aldi',
		date: '2026-08-02',
		lines: [
			['FF WHOLE MILK GAL', MILK, 'Dairy & eggs', 1, 'ea', 2.89, 'milk'],
			['GOLDHEN LG EGG 12', EGGS, 'Dairy & eggs', 1, 'ea', 2.29, 'eggs'],
			['BANANAS', BANANAS, 'Produce', 2, 'lb', 0.44, 'bananas'],
			['GRND BEEF 80/20', BEEF, 'Meat & seafood', 1.3, 'lb', 4.59, 'beef'],
			['HAPPY FARMS SHRD CHED', 'Shredded cheddar, 8 oz', 'Dairy & eggs', 1, 'ea', 1.94, 'cheddar'],
			['GALA APPLES 3LB', 'Gala apples, 3 lb bag', 'Produce', 1, 'ea', 4.34, 'apples']
		]
	},
	{
		store: 'Kroger',
		date: '2026-08-23',
		via: 'Instacart',
		lines: [
			['KRO WHL MILK GAL', MILK, 'Dairy & eggs', 1, 'ea', 3.79, 'milk'],
			['KRO GRD A LG EGGS', EGGS, 'Dairy & eggs', 1, 'ea', 2.05, 'eggs'],
			['BANANAS', BANANAS, 'Produce', 2.2, 'lb', 0.69, 'bananas'],
			['BNLS SKNLS CHKN BRST', CHICKEN, 'Meat & seafood', 1.6, 'lb', 4.49, 'chicken'],
			['JIF CRMY PB 16OZ', 'Creamy peanut butter, 16 oz', 'Pantry', 1, 'ea', 3.49, 'peanutButter']
		]
	},
	{
		store: 'Walmart',
		date: '2026-09-06',
		lines: [
			['GV WHL MLK GAL', MILK, 'Dairy & eggs', 1, 'ea', 3.18, 'milk'],
			['GV LG EGGS 12CT', EGGS, 'Dairy & eggs', 1, 'ea', 2.24, 'eggs'],
			['BANANAS', BANANAS, 'Produce', 2.1, 'lb', 0.56, 'bananas'],
			['GRND BF 80/20', BEEF, 'Meat & seafood', 1.25, 'lb', 5.18, 'beef'],
			['GV WHT BRD 20Z', 'White bread', 'Bakery', 1, 'ea', 2.85, 'whiteBread'],
			['MRKTSD ROMAINE 3CT', 'Romaine hearts, 3 pack', 'Produce', 1, 'ea', 3.98, 'romaine']
		]
	},
	{
		store: 'Target',
		date: '2026-09-27',
		lines: [
			['GG WHOLE MILK 1G', MILK, 'Dairy & eggs', 1, 'ea', 3.69, 'milk'],
			['GG LRG EGGS 12CT', EGGS, 'Dairy & eggs', 1, 'ea', 2.44, 'eggs'],
			['BANANA', BANANAS, 'Produce', 1.9, 'lb', 0.62, 'bananas'],
			['GG CHKN BRST BNLS', CHICKEN, 'Meat & seafood', 1.5, 'lb', 4.14, 'chicken'],
			['MRKT PANTRY PIZZA', 'Frozen cheese pizza', 'Frozen', 1, 'ea', 4.64, 'pizza']
		]
	},
	{
		store: 'Aldi',
		date: '2026-10-04',
		lines: [
			['FF WHOLE MILK GAL', MILK, 'Dairy & eggs', 1, 'ea', 2.98, 'milk'],
			['GOLDHEN LG EGG 12', EGGS, 'Dairy & eggs', 1, 'ea', 2.05, 'eggs'],
			['BANANAS', BANANAS, 'Produce', 2.4, 'lb', 0.47, 'bananas'],
			['KIRKWOOD CHKN BRST', CHICKEN, 'Meat & seafood', 1.7, 'lb', 3.14, 'chicken'],
			['RESERVA SPAGHETTI', 'Spaghetti, 16 oz', 'Pantry', 1, 'ea', 0.92, 'pasta'],
			['BABY CARROTS 1LB', 'Baby carrots, 1 lb', 'Produce', 1, 'ea', 1.09, 'carrots']
		]
	},
	{
		store: 'Walmart',
		date: '2026-10-09',
		lines: [
			['GV WHL MLK GAL', MILK, 'Dairy & eggs', 1, 'ea', 3.21, 'milk'],
			['GV LG EGGS 12CT', EGGS, 'Dairy & eggs', 1, 'ea', 2.1, 'eggs'],
			['BANANAS', BANANAS, 'Produce', 2.1, 'lb', 0.56, 'bananas'],
			['GRND BF 80/20', BEEF, 'Meat & seafood', 1.25, 'lb', 5.23, 'beef'],
			['GV TSTD OATS 18Z', 'Toasted oat cereal, 18 oz', 'Pantry', 1, 'ea', 2.88, 'cereal']
		]
	}
];

export const sampleReceipts: SampleReceipt[] = raw
	.map((r, i) => {
		const lines = r.lines.map(([raw, name, category, quantity, unit, unitPrice, product]) => {
			const unitPriceCents = Math.round(unitPrice * 100);
			return { raw, name, category, quantity, unit, unitPriceCents, totalCents: Math.round(quantity * unitPriceCents), product };
		});
		return {
			id: `sample-${i + 1}`,
			store: r.store,
			date: r.date,
			channel: r.via ? ('delivery' as const) : ('in_store' as const),
			via: r.via ?? null,
			lines,
			totalCents: lines.reduce((sum, l) => sum + l.totalCents, 0)
		};
	})
	.reverse();

export const samplePurchases: Purchase[] = sampleReceipts.flatMap((r) =>
	r.lines.map((l) => ({
		name: l.name,
		category: l.category,
		store: r.store,
		date: r.date,
		channel: r.channel,
		quantity: l.quantity,
		unit: l.unit,
		unitPriceCents: l.unitPriceCents,
		totalCents: l.totalCents
	}))
);

// which researched product an item is, so the demo can show typical prices elsewhere
export const productFor = (name: string) => sampleReceipts.flatMap((r) => r.lines).find((l) => l.name === name)?.product ?? null;
