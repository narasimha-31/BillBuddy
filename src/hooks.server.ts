import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
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
