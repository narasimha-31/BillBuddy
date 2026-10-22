<script lang="ts">
	import '@fontsource-variable/geist';
	import geistLatin from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
	import '../app.css';
	import { onNavigate } from '$app/navigation';

	let { children } = $props();

	// moving between pages crossfades instead of cutting; the header and tab bar stay put (app.css)
	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<!-- the one font file nearly every page needs, fetched with the page instead of after the CSS -->
	<link rel="preload" href={geistLatin} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

{@render children()}
