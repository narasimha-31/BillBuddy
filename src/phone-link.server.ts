import { admin } from './admin.server';

export const LINK_MINUTES = 10;
const SHAPE = /^[A-Za-z0-9_-]{22}$/;

// 128 random bits, URL safe
export function newSecret() {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const wellFormed = (secret: unknown): secret is string => typeof secret === 'string' && SHAPE.test(secret);

export async function hashOf(secret: string) {
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)));
	return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// a new link replaces the account's previous one, so at most one is ever live
export async function createPhoneLink(userId: string) {
	const token = newSecret();
	const expiresAt = new Date(Date.now() + LINK_MINUTES * 60_000).toISOString();
	const removed = await admin.from('phone_links').delete().eq('user_id', userId);
	if (removed.error) throw removed.error;
	const { error } = await admin.from('phone_links').insert({ token_hash: await hashOf(token), user_id: userId, expires_at: expiresAt });
	if (error) throw error;
	return { token, expiresAt };
}

// the first phone to open the link takes it; returns that phone's secret, or null if it was already taken or expired
export async function claimPhoneLink(token: string) {
	if (!wellFormed(token)) return null;
	const claim = newSecret();
	const { data, error } = await admin
		.from('phone_links')
		.update({ claim_hash: await hashOf(claim) })
		.eq('token_hash', await hashOf(token))
		.is('claim_hash', null)
		.gt('expires_at', new Date().toISOString())
		.select('expires_at');
	if (error) throw error;
	return data.length ? { claim, expiresAt: data[0].expires_at as string } : null;
}

// whether this phone still holds a live link
export async function heldBy(token: unknown, claim: unknown) {
	if (!wellFormed(token) || !wellFormed(claim)) return null;
	const { data, error } = await admin
		.from('phone_links')
		.select('expires_at')
		.eq('token_hash', await hashOf(token))
		.eq('claim_hash', await hashOf(claim))
		.gt('expires_at', new Date().toISOString())
		.maybeSingle();
	if (error) throw error;
	return data ? (data.expires_at as string) : null;
}

// counts one upload and returns the account it belongs to, or null when the link no longer allows it
export async function usePhoneLink(token: unknown, claim: unknown): Promise<string | null> {
	if (!wellFormed(token) || !wellFormed(claim)) return null;
	const { data, error } = await admin.rpc('use_phone_link', { p_token_hash: await hashOf(token), p_claim_hash: await hashOf(claim) });
	if (error) throw error;
	return (data as string | null) ?? null;
}
