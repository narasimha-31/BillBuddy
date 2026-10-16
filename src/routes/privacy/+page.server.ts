import type { PageServerLoad } from './$types';

// signed-out visitors can't open Settings, so the page only links there for someone signed in
export const load: PageServerLoad = async ({ locals }) => ({ signedIn: (await locals.getUser()) !== null });
