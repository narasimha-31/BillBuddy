import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SECRET_KEY } from '$env/static/private';

if (!SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
	throw new Error('SUPABASE_SECRET_KEY must start with sb_secret_');
}

// bypasses row level security: only for server-owned tables (error_log, ai_calls)
export const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
