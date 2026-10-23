<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Not found' : 'Something went wrong'} · Billi</title>
</svelte:head>

<main class="wrap">
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? "This page isn't here." : 'Something went wrong on our side.'}</h1>
	{#if page.error?.ref}
		<p class="ref">If it keeps happening, mention this reference: <code>{page.error.ref}</code></p>
	{/if}
	<a href="/" class="pill-button home">Go to Billi</a>
</main>

<style>
	.wrap {
		display: grid;
		place-content: center;
		justify-items: start;
		gap: 0.75rem;
		min-height: 100dvh;
		padding: 2rem 1.25rem;
		max-width: 32rem;
		margin: 0 auto;
	}

	.code {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-muted);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 2.125rem;
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.1;
		color: var(--color-ink);
	}

	.ref {
		color: var(--color-muted);
	}

	code {
		border-radius: 6px;
		background: var(--color-raised);
		padding: 0.1rem 0.4rem;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		color: var(--color-ink);
	}

	.home {
		margin-top: 0.75rem;
	}
</style>
