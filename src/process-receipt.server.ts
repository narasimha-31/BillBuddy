import type { SupabaseClient } from '@supabase/supabase-js';
import { nameLines } from './item-names.server';
import { AiUnavailable } from './nebius.server';
import { checkReading } from './receipt-check';
import { readReceipt } from './receipt-reader.server';
import { itemRows } from './receipt-rows';
import { sizeProblem } from './routes/receipts/photo-rules';

export type ProcessResult =
	| { status: 'saved' | 'review'; skipped: number }
	| { status: 'failed'; problem: 'not_a_receipt' | 'handwritten' | 'no_lines' | 'bad_photo' }
	| { status: 'busy' }
	| { status: 'paused' };

// a read that has been "processing" this long crashed part way and may be claimed again
const STALE_MS = 2 * 60 * 1000;

async function storeFor(supabase: SupabaseClient, name: string) {
	const find = () => supabase.from('stores').select('id').ilike('name', name.replace(/[%_\\]/g, '\\$&')).maybeSingle();
	const found = await find();
	if (found.data) return found.data.id as string;
	const created = await supabase.from('stores').insert({ name }).select('id').single();
	if (created.data) return created.data.id as string;
	// another device created it a moment ago
	const again = await find();
	if (again.data) return again.data.id as string;
	throw created.error;
}

// Runs as the signed-in user, so row level security covers every read and write here.
export async function processReceipt(supabase: SupabaseClient, userId: string, receiptId: string): Promise<ProcessResult> {
	// Claim in one statement: only a waiting, retryable or crashed receipt can be claimed, so two
	// devices pressing "process" at once can never both pay for a model call.
	const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
	const { data: claimed, error: claimError } = await supabase
		.from('receipts')
		.update({ status: 'processing', processing_at: new Date().toISOString(), problem: null })
		.eq('id', receiptId)
		.or(`status.eq.pending,and(status.eq.failed,problem.eq.error),and(status.eq.processing,processing_at.lt.${staleBefore})`)
		.select('id, image_path')
		.maybeSingle();
	if (claimError) throw claimError;
	if (!claimed) return { status: 'busy' };

	const photoPath: string | null = claimed.image_path;
	const finish = async (fields: Record<string, unknown>) => {
		const { error } = await supabase.from('receipts').update({ processing_at: null, ...fields }).eq('id', receiptId);
		if (error) throw error;
	};
	const dropPhoto = async () => {
		if (photoPath) await supabase.storage.from('receipts').remove([photoPath]);
	};
	// the photo is gone, so its fingerprint goes too: the same photo can be added again if we got it wrong
	const fail = async (problem: 'not_a_receipt' | 'handwritten' | 'no_lines' | 'bad_photo') => {
		await dropPhoto();
		await finish({ status: 'failed', problem, image_path: null, image_hash: null });
		return { status: 'failed' as const, problem };
	};

	try {
		if (!photoPath) return await fail('bad_photo');
		// the row is made before the upload, so a request that died in between leaves a row with no photo
		const download = await supabase.storage.from('receipts').download(photoPath);
		if (download.error) return await fail('bad_photo');
		const bytes = new Uint8Array(await download.data.arrayBuffer());

		// free checks before any tokens are spent
		if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || sizeProblem(bytes)) return await fail('bad_photo');

		const checked = checkReading(await readReceipt(bytes, userId));
		if (!checked.ok) return await fail(checked.reason);

		const { data: settings } = await supabase
			.from('user_settings')
			.select('keep_store_name, keep_photos')
			.eq('user_id', userId)
			.maybeSingle();
		const storeId = settings?.keep_store_name && checked.store ? await storeFor(supabase, checked.store) : null;

		const items = checked.lines.filter((l) => l.kind === 'item');
		const names = await nameLines(supabase, userId, storeId, items.map((l) => l.raw));
		const { rows, skipped } = itemRows(checked.lines, names);

		// a crashed earlier attempt may have left lines behind
		const cleared = await supabase.from('receipt_items').delete().eq('receipt_id', receiptId);
		if (cleared.error) throw cleared.error;
		const inserted = await supabase.from('receipt_items').insert(rows.map((row) => ({ ...row, receipt_id: receiptId })));
		if (inserted.error) throw inserted.error;

		// clean model names are remembered so the same line skips the model next time
		const learned = names
			.map((n, i) => ({ n, raw: items[i].raw }))
			.filter(({ n }) => n.from === 'ai' && n.flag === 'ok')
			.map(({ n, raw }) => ({ store_id: storeId, raw_text: raw, name: n.name, brand: n.brand, category: n.category }));
		if (learned.length) {
			const memory = await supabase.from('name_memory').upsert(learned, { onConflict: 'user_id,store_id,raw_text' });
			if (memory.error) console.error('name memory not saved', memory.error.message);
		}

		const keepPhoto = settings?.keep_photos === true;
		if (!keepPhoto) await dropPhoto();

		const needsReview = checked.needs_review || rows.some((r) => r.issue !== null);
		await finish({
			status: needsReview ? 'review' : 'saved',
			store_id: storeId,
			purchased_on: checked.purchasedOn,
			channel: checked.channel,
			subtotal_cents: checked.subtotalCents,
			tax_cents: checked.taxCents,
			total_cents: checked.totalCents,
			skipped_lines: skipped,
			image_path: keepPhoto ? photoPath : null
		});
		return { status: needsReview ? 'review' : 'saved', skipped };
	} catch (error) {
		if (error instanceof AiUnavailable) {
			await finish({ status: 'pending' });
			return { status: 'paused' };
		}
		await finish({ status: 'failed', problem: 'error' });
		throw error;
	}
}
