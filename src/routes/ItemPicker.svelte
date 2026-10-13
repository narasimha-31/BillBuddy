<script lang="ts">
	let {
		items,
		selected = $bindable(),
		first = 10
	}: { items: { name: string }[]; selected: string; first?: number } = $props();

	let query = $state('');
	let showAll = $state(false);

	const searching = $derived(query.trim().length > 0);
	const visible = $derived(
		searching
			? items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
			: showAll
				? items
				: items.slice(0, first)
	);
</script>

<label class="search">
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="11" cy="11" r="7" />
		<path d="m20 20-3.5-3.5" />
	</svg>
	<input bind:value={query} type="search" placeholder="Search eggs, milk, chicken" aria-label="Search an item" />
</label>

<div class="chips">
	{#each visible as item (item.name)}
		<button class="chip" class:selected={item.name === selected} onclick={() => (selected = item.name)}>
			{item.name}
		</button>
	{:else}
		<p>Nothing called "{query}" on these receipts.</p>
	{/each}
	{#if !searching && items.length > first}
		<button class="chip more" onclick={() => (showAll = !showAll)}>
			{showAll ? 'Fewer' : `More (${items.length - first})`}
		</button>
	{/if}
</div>

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.75rem;
		border: 1px solid rgb(43 38 32 / 0.2);
		border-radius: 0.875rem;
		background: var(--color-receipt);
		padding: 0 1.1rem;
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.06),
			0 8px 24px -12px rgb(0 0 0 / 0.25);
		transition:
			border-color 150ms,
			box-shadow 150ms;
	}
	.search:focus-within {
		border-color: var(--color-accent);
		box-shadow:
			0 0 0 3px rgb(44 74 52 / 0.25),
			0 8px 24px -12px rgb(0 0 0 / 0.25);
	}
	.search svg {
		width: 1.25rem;
		height: 1.25rem;
		flex: none;
		fill: none;
		stroke: var(--color-receipt-muted);
		stroke-width: 2;
		stroke-linecap: round;
	}
	/* 16px text: iOS Safari zooms the page on any smaller input */
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		padding: 0.95rem 0;
		font-size: 1rem;
		color: var(--color-receipt-ink);
		outline: none;
	}
	.search input::placeholder {
		color: var(--color-receipt-muted);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1.25rem;
	}
	.chip {
		border: 1px solid rgb(43 38 32 / 0.25);
		border-radius: 999px;
		background: rgb(253 251 245 / 0.55);
		padding: 0.5rem 0.95rem;
		font: 500 0.75rem/1 var(--font-mono);
		letter-spacing: 0.02em;
		color: var(--color-ink);
		transition:
			background-color 150ms,
			border-color 150ms,
			transform 150ms,
			box-shadow 150ms;
	}
	.chip:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
	.chip.selected {
		border-color: var(--color-ink);
		background: var(--color-ink);
		color: var(--color-receipt);
	}
	.chip.more {
		border-style: dashed;
		background: rgb(44 74 52 / 0.12);
		color: var(--color-accent);
	}

	.chips p {
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	/* touch screens keep :hover on the last tapped spot, so hover styles are for mice only */
	@media (hover: hover) {
		.chip:hover {
			border-color: rgb(43 38 32 / 0.55);
			background: var(--color-receipt);
			box-shadow: 0 2px 6px rgb(0 0 0 / 0.08);
			transform: translateY(-1px);
		}

		.chip.more:hover {
			background: rgb(44 74 52 / 0.2);
		}
	}
</style>
