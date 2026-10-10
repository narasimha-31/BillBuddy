import {
	isAuthApiError,
	isAuthSessionMissingError,
	type SupabaseClient,
	type User
} from '@supabase/supabase-js';

// getUser checks the token with Supabase; getSession only trusts the cookie.
// A forged, expired or revoked token is a signed-out visitor, not a server error.
export async function currentUser(supabase: SupabaseClient): Promise<User | null> {
	const { data, error } = await supabase.auth.getUser();
	if (!error) return data.user;
	if (isAuthSessionMissingError(error)) return null;
	if (isAuthApiError(error) && error.status >= 400 && error.status < 500) return null;
	throw error;
}
