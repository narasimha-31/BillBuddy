<script lang="ts">
	let { href = '/' }: { href?: string } = $props();
</script>

<a {href} class="wordmark" aria-label="Pricetrail home">
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path d="M6 2.5h12a1 1 0 0 1 1 1v17.2l-2.33-1.4-2.33 1.4-2.34-1.4-2.33 1.4-2.34-1.4L5 20.7V3.5a1 1 0 0 1 1-1z" fill="var(--color-accent)" />
		<path d="m8.4 13.6 2.6-2.6 2.1 2.1 3.5-3.9" fill="none" stroke="#fbfbfd" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
	<span>Pricetrail</span>
</a>

<style>
	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 650;
		letter-spacing: -0.022em;
		color: var(--color-ink);
	}

	svg {
		width: 1.25em;
		height: 1.25em;
	}

	.wordmark:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
		border-radius: 6px;
	}
</style>
