import { createServerClient } from '@supabase/ssr';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { logError } from './error-log.server';
import { currentUser } from './session.server';

if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(PUBLIC_SUPABASE_URL)) {
	throw new Error('PUBLIC_SUPABASE_URL must look like https://<project-ref>.supabase.co');
}
if (!PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')) {
	throw new Error('PUBLIC_SUPABASE_PUBLISHABLE_KEY must start with sb_publishable_');
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});

	event.locals.getUser = () => currentUser(event.locals.supabase);

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

// Unexpected errors get a short reference the user can quote; the details go to error_log.
// Expected ones (404s and the like) are not logged.
export const handleError: HandleServerError = async ({ error, event, status }) => {
	if (status < 500) return { message: 'Not found' };

	const id = crypto.randomUUID();
	const userId = await event.locals.getUser?.().then((u) => u?.id ?? null).catch(() => null);
	await logError({
		id,
		route: event.route.id,
		status,
		message: error instanceof Error ? error.message : String(error),
		code: (error as { code?: string })?.code ?? null,
		userId: userId ?? null
	});
	return { message: 'Something went wrong', ref: id.slice(0, 8) };
};
