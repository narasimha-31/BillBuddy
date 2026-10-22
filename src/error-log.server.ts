import { admin } from './admin.server';

export type ErrorEntry = { id: string; route: string | null; status: number; message: string; code: string | null; userId: string | null };

// errors carry codes of any type: Postgres uses strings, a timed-out fetch uses the number 23
export function errorCode(error: unknown): string | null {
	const code = (error as { code?: unknown } | null)?.code;
	if (typeof code === 'string') return code.slice(0, 80);
	if (typeof code === 'number') return String(code);
	return null;
}

// a database error is a plain object, not an Error, but it still carries a message
export function errorMessage(error: unknown): string {
	const message = (error as { message?: unknown } | null)?.message;
	return typeof message === 'string' ? message : String(error);
}

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
