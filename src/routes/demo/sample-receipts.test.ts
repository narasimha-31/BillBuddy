import { describe, expect, it } from 'vitest';
import { comparisons } from '../store-prices';
import { historyOf } from '../../price-history';
import { productFor, samplePurchases, sampleReceipts } from './sample-receipts';

describe('sample receipts', () => {
	it('are newest first and add up line by line', () => {
		const dates = sampleReceipts.map((r) => r.date);
		expect(dates).toEqual([...dates].sort().reverse());
		for (const r of sampleReceipts) expect(r.totalCents).toBe(r.lines.reduce((s, l) => s + l.totalCents, 0));
	});

	it('only point at products the price research knows', () => {
		const known = new Set(comparisons().map((c) => c.key));
		for (const line of sampleReceipts.flatMap((r) => r.lines)) expect(known.has(line.product as never), line.product).toBe(true);
	});

	it('give every item one name and one product, whatever the store prints', () => {
		const products = new Map<string, string>();
		for (const line of sampleReceipts.flatMap((r) => r.lines)) {
			expect(products.get(line.name) ?? line.product).toBe(line.product);
			products.set(line.name, line.product);
		}
		expect(productFor('Bananas')).toBe('bananas');
	});

	it('include a delivery order and enough repeat buys to show a price history', () => {
		expect(sampleReceipts.some((r) => r.channel === 'delivery')).toBe(true);
		expect(historyOf(samplePurchases, 'Large eggs, 12 ct')!.visits).toHaveLength(7);
	});
});
