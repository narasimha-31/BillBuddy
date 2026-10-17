import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from './item-names';

// The shopper's aisle for a product: remembered for later receipts and written onto every line of it
// they already have. Row level security keeps both to their own rows; the shared product is untouched.
export async function chooseAisle(supabase: SupabaseClient, productId: string, aisle: Category) {
	const [kept, moved] = await Promise.all([
		supabase.from('my_aisles').upsert({ product_id: productId, aisle, updated_at: new Date().toISOString() }, { onConflict: 'user_id,product_id' }),
		supabase.from('receipt_items').update({ category: aisle }).eq('product_id', productId)
	]);
	if (kept.error) throw kept.error;
	if (moved.error) throw moved.error;
}

// a line with no product yet is known by its name alone
export async function chooseAisleByName(supabase: SupabaseClient, name: string, aisle: Category) {
	const { error } = await supabase.from('receipt_items').update({ category: aisle }).eq('name', name).is('product_id', null);
	if (error) throw error;
}

// the aisles this shopper picked among these products, so a new receipt follows them
export async function myAisles(supabase: SupabaseClient, productIds: (string | null)[]) {
	const ids = [...new Set(productIds.filter((id) => id !== null))];
	if (!ids.length) return new Map<string, Category>();
	const { data, error } = await supabase.from('my_aisles').select('product_id, aisle').in('product_id', ids);
	if (error) throw error;
	return new Map(data.map((row) => [row.product_id as string, row.aisle as Category]));
}
