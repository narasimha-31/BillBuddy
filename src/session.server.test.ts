import { describe, expect, it } from 'vitest';
import {
	AuthApiError,
	AuthRetryableFetchError,
	AuthSessionMissingError,
	type SupabaseClient
} from '@supabase/supabase-js';
import { currentUser } from './session.server';

function clientReturning(result: { user: unknown; error: unknown }) {
	return {
		auth: { getUser: async () => ({ data: { user: result.user }, error: result.error }) }
	} as unknown as SupabaseClient;
}

describe('currentUser', () => {
	it('returns the user for a valid session', async () => {
		const user = { id: 'u1' };
		expect(await currentUser(clientReturning({ user, error: null }))).toBe(user);
	});

	it('treats a missing session as signed out', async () => {
		const client = clientReturning({ user: null, error: new AuthSessionMissingError() });
		expect(await currentUser(client)).toBeNull();
	});

	it('treats a forged or revoked token as signed out', async () => {
		const client = clientReturning({
			user: null,
			error: new AuthApiError('invalid JWT', 403, 'bad_jwt')
		});
		expect(await currentUser(client)).toBeNull();
	});

	it('throws when supabase itself is failing', async () => {
		const outage = new AuthApiError('upstream down', 503, undefined);
		await expect(currentUser(clientReturning({ user: null, error: outage }))).rejects.toBe(outage);
	});

	it('throws when supabase is unreachable', async () => {
		const offline = new AuthRetryableFetchError('fetch failed', 0);
		await expect(currentUser(clientReturning({ user: null, error: offline }))).rejects.toBe(
			offline
		);
	});
});
