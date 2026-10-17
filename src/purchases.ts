import type { Purchase } from './price-history';

type One<T> = T | T[] | null;

export type ItemRow = {
	id?: string;
	receipt_id?: string;
	name: string | null;
	category: string | null;
	quantity: number;
	unit: string;
	unit_price_cents: number | null;
	total_cents: number;
	receipts: One<{ purchased_on: string | null; channel: string | null; store_id?: string | null; branch_key?: string | null; stores: One<{ name: string }> }>;
};

// supabase types a joined row as a list even when the foreign key makes it a single row
const one = <T>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

export function toPurchases(rows: ItemRow[]): Purchase[] {
	return rows.flatMap((row) => {
		const receipt = one(row.receipts);
		if (!row.name || !receipt) return [];
		return [
			{
				name: row.name,
				category: row.category,
				store: one(receipt.stores)?.name ?? null,
				date: receipt.purchased_on,
				channel: receipt.channel,
				quantity: Number(row.quantity),
				unit: row.unit,
				unitPriceCents: row.unit_price_cents,
				totalCents: row.total_cents,
				...(row.receipt_id && { receiptId: row.receipt_id, itemId: row.id }),
				...(receipt.store_id !== undefined && { storeId: receipt.store_id, branchKey: receipt.branch_key ?? null })
			}
		];
	});
}
