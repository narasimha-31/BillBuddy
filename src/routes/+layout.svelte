<script lang="ts">
	import '@fontsource-variable/geist';
	import geistLatin from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<!-- the one font file nearly every page needs, fetched with the page instead of after the CSS -->
	<link rel="preload" href={geistLatin} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

{@render children()}
