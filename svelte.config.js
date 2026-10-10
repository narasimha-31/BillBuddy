import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		// Vercel sets VERCEL=1 on its builders; local builds skip the adapter
		adapter: process.env.VERCEL ? vercel({ runtime: 'nodejs24.x' }) : undefined
	}
};
