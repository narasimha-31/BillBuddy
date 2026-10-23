import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { findRecalls } from '../../daily-lookups.server';
import type { RequestHandler } from './$types';

// compared as hashes, so the time taken says nothing about the secret
const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

// Vercel's daily cron, which sends the shared secret. Without the secret set, nothing runs.
export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	if (!secret) error(401, 'Not allowed');
	const [sent, wanted] = await Promise.all([digest(request.headers.get('authorization') ?? ''), digest(`Bearer ${secret}`)]);
	if (!sent.every((byte, i) => byte === wanted[i])) error(401, 'Not allowed');
	return json({ recalls: await findRecalls() });
};
