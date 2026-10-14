<script lang="ts">
	type Item = { name: string; category?: string | null };

	// items come most bought first
	let { items, selected = $bindable() }: { items: Item[]; selected: string } = $props();

	const MOST_BOUGHT = 6;

	let query = $state('');
	const searching = $derived(query.trim().length > 0);
	const found = $derived(items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())));

	// the rest of the list sorted into aisles, the fullest aisle first
	const aisles = $derived.by(() => {
		const groups = new Map<string, Item[]>();
		for (const item of items) {
			const aisle = item.category ?? 'Other';
			groups.set(aisle, [...(groups.get(aisle) ?? []), item]);
		}
		return [...groups].sort((a, b) => b[1].length - a[1].length);
	});
	const selectedAisle = $derived(items.find((item) => item.name === selected)?.category ?? 'Other');
</script>

{#snippet chip(item: Item)}
	<button class="chip" class:selected={item.name === selected} aria-pressed={item.name === selected} onclick={() => (selected = item.name)}>
		{item.name}
	</button>
{/snippet}

<label class="search">
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="11" cy="11" r="7" />
		<path d="m20 20-3.5-3.5" />
	</svg>
	<input bind:value={query} type="search" placeholder="Search eggs, milk, chicken" aria-label="Search an item" />
</label>

{#if searching}
	<div class="chips">
		{#each found as item (item.name)}
			{@render chip(item)}
		{:else}
			<p class="none">Nothing called "{query.trim()}" on your receipts yet.</p>
		{/each}
	</div>
{:else}
	<h2>You buy these most</h2>
	<div class="chips">
		{#each items.slice(0, MOST_BOUGHT) as item (item.name)}
			{@render chip(item)}
		{/each}
	</div>

	{#if items.length > MOST_BOUGHT}
		<h2>By aisle</h2>
		<div class="aisles">
			{#each aisles as [aisle, list] (aisle)}
				<details open={aisle === selectedAisle && items.findIndex((i) => i.name === selected) >= MOST_BOUGHT}>
					<summary>
						<span>{aisle}</span>
						<span class="count">{list.length}</span>
					</summary>
					<div class="chips">
						{#each list as item (item.name)}
							{@render chip(item)}
						{/each}
					</div>
				</details>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid var(--color-line);
		border-radius: 0.875rem;
		background: var(--color-raised);
		padding: 0 1.1rem;
		transition: border-color 150ms;
	}

	.search:focus-within {
		border-color: var(--color-brand);
		outline: 2px solid color-mix(in srgb, var(--color-brand) 25%, transparent);
	}

	.search svg {
		width: 1.25rem;
		height: 1.25rem;
		flex: none;
		fill: none;
		stroke: var(--color-muted);
		stroke-width: 2;
		stroke-linecap: round;
	}

	/* 16px text: iOS Safari zooms the page on any smaller input */
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		padding: 0.85rem 0;
		font-size: 1rem;
		color: var(--color-ink);
		outline: none;
	}

	.search input::placeholder {
		color: var(--color-muted);
	}

	h2 {
		margin-top: 1.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-muted);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.75rem;
	}

	.chip {
		border: 1px solid var(--color-line);
		border-radius: 999px;
		background: var(--color-raised);
		padding: 0.45rem 0.85rem;
		font-size: 0.875rem;
		color: var(--color-ink);
		transition:
			background-color 150ms,
			border-color 150ms;
	}

	.chip:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	.chip.selected {
		border-color: var(--color-ink);
		background: var(--color-ink);
		color: var(--color-on-ink);
	}

	.none {
		font-size: 0.9rem;
		color: var(--color-muted);
	}

	.aisles {
		margin-top: 0.5rem;
		border-top: 1px solid var(--color-line);
	}

	details {
		border-bottom: 1px solid var(--color-line);
	}

	summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		list-style: none;
		padding: 0.75rem 0.25rem;
		font-weight: 550;
		color: var(--color-ink);
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::after {
		content: '';
		width: 0.45rem;
		height: 0.45rem;
		margin-left: 0.25rem;
		border-right: 1.5px solid var(--color-muted);
		border-bottom: 1.5px solid var(--color-muted);
		transform: rotate(-45deg);
		transition: transform 150ms;
	}

	details[open] summary::after {
		transform: rotate(45deg);
	}

	.count {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		font-weight: 400;
		color: var(--color-muted);
	}

	details .chips {
		margin: 0 0 0.9rem;
	}

	/* touch screens keep :hover on the last tapped spot, so hover styles are for mice only */
	@media (hover: hover) {
		.chip:not(.selected):hover {
			border-color: var(--color-muted);
			background: var(--color-receipt);
		}
	}
</style>
