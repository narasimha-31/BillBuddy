import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// fixed port: Supabase only returns sign-ins to allow-listed addresses, so the port must not drift
	server: { port: 5180, strictPort: true },
	test: { dir: 'src' }
});
