import type { SupabaseClient } from '@supabase/supabase-js';
import { photoProblem } from './routes/receipts/photo-rules';

export const DAILY_RECEIPTS = 10;

// the limit counts the last 24 hours; frees_at is when the oldest of those drops out
export const uploadWindow = (rows: unknown) => {
	const row = (rows as { used: number; frees_at: string | null }[] | null)?.[0];
	return { used: row?.used ?? 0, freesAt: row?.frees_at ?? null };
};

// database limit messages, turned into something a person can act on
const limitMessages: Record<string, string> = {
	'receipt limit: too many at once': 'slow down a little and try again in a minute',
	'receipt limit: daily': `you've added ${DAILY_RECEIPTS} receipts in the last 24 hours, the page shows when the next one opens`,
	'receipt limit: monthly': "you've reached 100 receipts this month",
	photos: "you've reached today's photo limit, try again tomorrow"
};

export type Saved = { id: string } | { status: 400 | 409 | 429; problem: string };

// The row is created before the upload, so a failed upload never leaves a photo nobody points to.
// Desktop uploads pass the user's own client; phone uploads pass the service client, so the
// owner is always set explicitly and both go through the same checks and database limits.
export async function savePhoto(db: SupabaseClient, userId: string, photo: unknown, hash: string): Promise<Saved> {
	if (!(photo instanceof File)) return { status: 400, problem: 'no photo' };
	const bytes = new Uint8Array(await photo.arrayBuffer());
	const problem = photoProblem(bytes, hash);
	if (problem) return { status: 400, problem };

	const path = `${userId}/${crypto.randomUUID()}.jpg`;
	const row = await db.from('receipts').insert({ user_id: userId, image_hash: hash, image_path: path }).select('id').single();
	if (row.error) {
		if (row.error.code === '23505') return { status: 409, problem: 'already added' };
		if (row.error.code === 'P0001' && row.error.message in limitMessages) {
			return { status: 429, problem: limitMessages[row.error.message] };
		}
		throw row.error;
	}

	const stored = await db.storage.from('receipts').upload(path, bytes, { contentType: 'image/jpeg' });
	if (stored.error) {
		await db.from('receipts').delete().eq('id', row.data.id);
		// the only upload the storage policy refuses for a signed-in owner is the daily photo cap
		if ('statusCode' in stored.error && stored.error.statusCode === '403') {
			return { status: 429, problem: limitMessages.photos };
		}
		throw stored.error;
	}
	return { id: row.data.id as string };
}
