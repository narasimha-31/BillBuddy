import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SECRET_KEY } from '$env/static/private';

if (!SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
	throw new Error('SUPABASE_SECRET_KEY must start with sb_secret_');
}

const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

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
