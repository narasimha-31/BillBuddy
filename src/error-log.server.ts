import { admin } from './admin.server';

export type ErrorEntry = { id: string; route: string | null; status: number; message: string; code: string | null; userId: string | null };

// best effort: a failure here must never turn one error into two
export async function logError(entry: ErrorEntry) {
	const { error } = await admin.from('error_log').insert({
		id: entry.id,
		route: entry.route?.slice(0, 200) ?? null,
		status: entry.status,
		message: entry.message.slice(0, 500),
		code: entry.code?.slice(0, 80) ?? null,
		user_id: entry.userId
	});
	if (error) console.error('error log write failed', entry.id, error.message);
}
