<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	const next = page.url.searchParams.get('next') === '/home' ? '/home' : '/?signin=failed';

	// tells the tab that opened this window, then closes; a tab that cannot close goes on itself
	onMount(() => {
		const signin = new BroadcastChannel('signin');
		signin.postMessage(next);
		signin.close();
		close();
		setTimeout(() => location.replace(next), 300);
	});
</script>

<svelte:head>
	<title>Signing in · Billie</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<p class="signing-in">Signing you in…</p>

<style>
	.signing-in {
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--color-muted);
	}
</style>
