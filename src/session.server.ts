import {
	isAuthApiError,
	isAuthPKCECodeVerifierMissingError,
	isAuthSessionMissingError,
	type SupabaseClient,
	type User
} from '@supabase/supabase-js';

// Bad, expired, forged or replayed credentials mean "not signed in".
// Anything else (Supabase down, network failure) is a real error and is thrown.
function isRejectedCredential(error: unknown) {
	return (
		isAuthSessionMissingError(error) ||
		isAuthPKCECodeVerifierMissingError(error) ||
		(isAuthApiError(error) && error.status >= 400 && error.status < 500)
	);
}

// getUser checks the token with Supabase; getSession only trusts the cookie
export async function currentUser(supabase: SupabaseClient): Promise<User | null> {
	const { data, error } = await supabase.auth.getUser();
	if (!error) return data.user;
	if (isRejectedCredential(error)) return null;
	throw error;
}

export async function signInWithCode(supabase: SupabaseClient, code: string): Promise<boolean> {
	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (!error) return true;
	if (isRejectedCredential(error)) {
		// the reason only, never the code: a missing verifier means the flow started on another origin
		console.warn('sign-in code rejected:', error.code ?? error.name);
		return false;
	}
	throw error;
}

export function firstNameOf(user: User): string | null {
	const meta = user.user_metadata ?? {};
	const name = meta.given_name ?? meta.full_name?.split(' ')[0] ?? meta.name?.split(' ')[0];
	return typeof name === 'string' && name ? name : null;
}
