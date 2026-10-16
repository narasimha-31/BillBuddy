<script lang="ts">
	type Item = { name: string; category?: string | null };

	// items come most bought first
	let { items, selected = $bindable() }: { items: Item[]; selected: string } = $props();

	const MOST_BOUGHT = 6;

	let query = $state('');
	const searching = $derived(query.trim().length > 0);
	// names are lowercased once per list, the query once per keystroke, then one substring scan
	const lowered = $derived(items.map((item) => ({ item, name: item.name.toLowerCase() })));
	const found = $derived.by(() => {
		const wanted = query.trim().toLowerCase();
		return lowered.filter(({ name }) => name.includes(wanted)).map(({ item }) => item);
	});

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
	{#if query}
		<button class="clear" aria-label="Clear the search" onclick={() => (query = '')}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8 8 8M16 8l-8 8" /></svg>
		</button>
	{/if}
</label>

{#if searching}
	<div class="chips found scroll-area">
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
		<div class="aisles scroll-area">
			<div class="aisle-list">
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
		</div>
	{/if}
{/if}

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 10px;
		background: rgb(118 118 128 / 0.12);
		padding: 0 0.75rem;
	}

	.search:focus-within {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
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
		padding: 0.6rem 0;
		font-size: 1rem;
		color: var(--color-ink);
		outline: none;
	}

	.search input::placeholder {
		color: var(--color-muted);
	}

	/* the browser's own blue cross is replaced by an iOS-style grey one */
	.search input::-webkit-search-cancel-button {
		-webkit-appearance: none;
	}

	.clear {
		display: grid;
		flex: none;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		background: rgb(118 118 128 / 0.45);
	}

	.clear svg {
		width: 0.9rem;
		height: 0.9rem;
		fill: none;
		stroke: #fff;
		stroke-width: 2.6;
		stroke-linecap: round;
	}

	.clear:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	h2 {
		margin: 1.5rem 1rem 0;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-muted);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.75rem;
	}

	.chip {
		border-radius: 999px;
		background: #fff;
		padding: 0.45rem 0.9rem;
		font-size: 0.9375rem;
		color: var(--color-ink);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
		transition:
			background-color 150ms,
			color 150ms;
	}

	.chip:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.chip.selected {
		background: var(--color-accent);
		color: #fff;
	}

	.none {
		font-size: 0.9rem;
		color: var(--color-muted);
	}

	.aisles {
		margin-top: 0.45rem;
	}

	.aisle-list {
		overflow: hidden;
		border-radius: 14px;
		background: #fff;
	}

	details + details {
		box-shadow: inset 0 1px 0 rgb(60 60 67 / 0.12);
	}

	summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		list-style: none;
		padding: 0.8rem 1rem;
		font-weight: 500;
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
		font-size: 0.9375rem;
		font-weight: 400;
		color: var(--color-muted);
	}

	details .chips {
		margin: 0;
		padding: 0 1rem 0.9rem;
	}

	details .chip {
		background: var(--color-raised);
		box-shadow: none;
	}

	details .chip.selected {
		background: var(--color-accent);
	}

	/* touch screens keep :hover on the last tapped spot, so hover styles are for mice only */
	@media (hover: hover) {
		.chip:not(.selected):hover {
			color: var(--color-accent);
		}
	}
</style>
