// Typical 2026 shelf prices for metro-area chains, taken from published store price lists
// and local news price trackers. Ranges were reduced to their midpoint. A store only lists a
// product when a like-for-like, non-promotional price was published for it.
const products = {
	milk: { label: 'WHOLE MILK GAL', qty: 1, unit: 'EA' },
	eggs: { label: 'LARGE EGGS 12CT', qty: 1, unit: 'EA' },
	butter: { label: 'BUTTER 1LB', qty: 1, unit: 'EA' },
	cheddar: { label: 'SHRED CHEDDAR 8OZ', qty: 1, unit: 'EA' },
	yogurt: { label: 'GREEK YOGURT 32OZ', qty: 1, unit: 'EA' },
	chicken: { label: 'CHICKEN BREAST', qty: 1.62, unit: 'LB' },
	beef: { label: 'GROUND BEEF 80/20', qty: 1.25, unit: 'LB' },
	pork: { label: 'PORK CHOPS', qty: 1.4, unit: 'LB' },
	bacon: { label: 'BACON 12OZ', qty: 1, unit: 'EA' },
	cereal: { label: 'CEREAL 18OZ', qty: 1, unit: 'EA' },
	pasta: { label: 'PASTA 16OZ', qty: 1, unit: 'EA' },
	peanutButter: { label: 'PEANUT BUTTER 16OZ', qty: 1, unit: 'EA' },
	rice: { label: 'WHITE RICE 5LB', qty: 1, unit: 'EA' },
	whiteBread: { label: 'WHITE BREAD LOAF', qty: 1, unit: 'EA' },
	grainBread: { label: 'MULTIGRAIN BREAD', qty: 1, unit: 'EA' },
	bananas: { label: 'BANANAS', qty: 2.1, unit: 'LB' },
	apples: { label: 'APPLES 3LB BAG', qty: 1, unit: 'EA' },
	romaine: { label: 'ROMAINE HEARTS 3PK', qty: 1, unit: 'EA' },
	carrots: { label: 'BABY CARROTS 1LB', qty: 1, unit: 'EA' },
	potatoes: { label: 'RUSSET POTATO 5LB', qty: 1, unit: 'EA' },
	onions: { label: 'YELLOW ONION 3LB', qty: 1, unit: 'EA' },
	pizza: { label: 'FROZEN PIZZA', qty: 1, unit: 'EA' }
};

type Product = keyof typeof products;
type Store = { name: string; prices: Partial<Record<Product, number>> };

const stores: Store[] = [
	{ name: 'H-E-B', prices: { milk: 3.43, eggs: 1.47, beef: 4.98, whiteBread: 2.48, bananas: 0.5 } },
	{
		name: 'Walmart',
		prices: {
			milk: 3.21, eggs: 2.1, butter: 3.88, cheddar: 2.23, yogurt: 4.33, chicken: 3.61, beef: 5.23,
			pork: 3.98, bacon: 5.23, cereal: 2.88, pasta: 1.14, peanutButter: 2.73, rice: 4.48,
			whiteBread: 2.85, grainBread: 3.59, bananas: 0.56, apples: 4.88, romaine: 3.98, carrots: 1.23,
			potatoes: 4.08, onions: 3.48, pizza: 4.23
		}
	},
	{
		name: 'Kroger',
		prices: {
			milk: 3.25, eggs: 1.7, chicken: 3.89, beef: 5.64, peanutButter: 3.04, pasta: 1.32,
			whiteBread: 2.6, bananas: 0.59
		}
	},
	{
		name: 'Aldi',
		prices: {
			milk: 2.98, eggs: 2.05, butter: 3.39, cheddar: 1.94, yogurt: 3.64, chicken: 3.14, beef: 4.74,
			pork: 3.64, bacon: 4.64, cereal: 2.29, pasta: 0.92, peanutButter: 2.09, rice: 3.79,
			grainBread: 2.47, bananas: 0.47, apples: 4.34, romaine: 3.49, carrots: 1.09, potatoes: 3.64,
			onions: 2.99, pizza: 3.74
		}
	},
	{
		name: 'Target',
		prices: {
			milk: 3.69, eggs: 2.44, chicken: 4.14, beef: 5.64, peanutButter: 2.89, pasta: 1.24,
			grainBread: 3.64, bananas: 0.62, pizza: 4.64
		}
	},
	{ name: 'Publix', prices: { milk: 3.59, eggs: 2.89, bananas: 0.65 } },
	{ name: 'Wegmans', prices: { milk: 2.49, eggs: 1.69, chicken: 2.29 } }
];

export const LINES_PER_RECEIPT = 5;

// only stores with a full receipt's worth of prices rotate; the rest still count in comparisons
export const rotation = stores.filter((s) => Object.keys(s.prices).length >= LINES_PER_RECEIPT);

export type ReceiptLine = {
	label: string;
	qty: string;
	unitPrice: string;
	totalCents: number;
	versus: { kind: 'cheapest'; of: number } | { kind: 'more'; percent: number; store: string };
};

// each visit to a store shows its next five products, so the receipt keeps changing
export function receiptFor(store: Store, visit = 0): ReceiptLine[] {
	const owned = (Object.keys(products) as Product[]).filter((p) => store.prices[p] !== undefined);
	const start = (visit * LINES_PER_RECEIPT) % owned.length;
	return Array.from({ length: LINES_PER_RECEIPT }, (_, i) => lineFor(store, owned[(start + i) % owned.length]));
}

function lineFor(store: Store, key: Product): ReceiptLine {
	const { label, qty, unit } = products[key];
	const price = store.prices[key]!;
	const listed = stores.filter((s) => s.prices[key] !== undefined);
	const cheapest = listed.reduce((low, s) => (s.prices[key]! < low.prices[key]! ? s : low));
	const lowest = cheapest.prices[key]!;
	const weighed = unit === 'LB';

	return {
		label,
		qty: weighed ? `${qty.toFixed(2)} LB` : `${qty} EA`,
		unitPrice: weighed ? `$${price.toFixed(2)}/LB` : `$${price.toFixed(2)} EA`,
		totalCents: Math.round(qty * price * 100),
		versus:
			price <= lowest
				? { kind: 'cheapest', of: listed.length }
				: { kind: 'more', percent: Math.round(((price - lowest) / lowest) * 100), store: cheapest.name }
	};
}

// U.S. city average, BLS average price data, August 2026. Only products that match ours like-for-like.
const usAverage: Partial<Record<Product, number>> = {
	milk: 4.23,
	eggs: 2.27,
	butter: 4.02,
	chicken: 4.17,
	bananas: 0.65
};

export type Comparison = {
	key: Product;
	label: string;
	unit: 'EA' | 'LB';
	prices: { store: string; price: number }[];
	usAverage: number | null;
};

export const CART: Product[] = ['milk', 'eggs', 'chicken', 'beef', 'peanutButter', 'pasta', 'bananas'];

// one of each product (a pound of anything weighed) at every store that prices all of them, cheapest first
export function cartTotals(cart: Product[] = CART) {
	return stores
		.filter((s) => cart.every((p) => s.prices[p] !== undefined))
		.map((s) => ({ store: s.name, cents: cart.reduce((sum, p) => sum + Math.round(s.prices[p]! * 100), 0) }))
		.sort((a, b) => a.cents - b.cents);
}

export const priceOf = (store: string, product: Product) => stores.find((s) => s.name === store)?.prices[product] ?? null;

// every product with each store's price, cheapest first
export function comparisons(): Comparison[] {
	return (Object.keys(products) as Product[]).map((key) => ({
		key,
		label: products[key].label,
		unit: products[key].unit === 'LB' ? 'LB' : 'EA',
		prices: stores
			.filter((s) => s.prices[key] !== undefined)
			.map((s) => ({ store: s.name, price: s.prices[key]! }))
			.sort((a, b) => a.price - b.price),
		usAverage: usAverage[key] ?? null
	}));
}
