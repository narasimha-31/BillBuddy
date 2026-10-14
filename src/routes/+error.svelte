<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Not found' : 'Something went wrong'} · BillBuddy</title>
</svelte:head>

<main class="wrap">
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? "This page isn't here." : 'Something went wrong on our side.'}</h1>
	{#if page.error?.ref}
		<p class="ref">If it keeps happening, mention this reference: <code>{page.error.ref}</code></p>
	{/if}
	<a href="/" class="home">Go to BillBuddy</a>
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
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.ref {
		color: var(--color-muted);
	}

	code {
		border-radius: 0.375rem;
		background: var(--color-raised);
		padding: 0.1rem 0.4rem;
		font-family: var(--font-mono);
		color: var(--color-ink);
	}

	.home {
		margin-top: 0.75rem;
		border-radius: 999px;
		background: var(--color-ink);
		padding: 0.6rem 1.25rem;
		font-weight: 500;
		color: var(--color-on-ink);
	}
</style>
