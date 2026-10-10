<script lang="ts">
	import { fade } from 'svelte/transition';
	import { comparisons } from '../store-prices';

	// staples people buy most often come first; with real receipts this becomes the user's own top items
	const everyday = ['milk', 'eggs', 'bananas', 'whiteBread', 'chicken', 'beef', 'cereal', 'cheddar', 'pasta', 'romaine'];
	const rank = (key: string) => (everyday.includes(key) ? everyday.indexOf(key) : everyday.length);
	const all = comparisons().sort((a, b) => rank(a.key) - rank(b.key));
	const FIRST = 10;

	let query = $state('');
	let showAll = $state(false);
	let selected = $state(all.find((c) => c.key === 'eggs')!);

	const searching = $derived(query.trim().length > 0);
	const visible = $derived(
		searching
			? all.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()))
			: showAll
				? all
				: all.slice(0, FIRST)
	);
	const highest = $derived(Math.max(...selected.prices.map((p) => p.price), selected.usAverage ?? 0));
	const per = $derived(selected.unit === 'LB' ? '/lb' : '');
	const money = (n: number) => `$${n.toFixed(2)}`;
	const title = (label: string) => label.charAt(0) + label.slice(1).toLowerCase();
</script>

<svelte:head>
	<title>Demo · BillBuddy</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-5 py-10">
	<a href="/" class="wordmark text-2xl"><span class="text-accent">B</span>ill<span class="text-accent">B</span>uddy</a>

	<h1 class="blur-rise mt-8 text-2xl font-semibold text-ink sm:text-3xl">What does it cost where?</h1>
	<p class="blur-rise mt-2 max-w-xl text-muted" style:--delay="120ms">
		Pick an item and see its price at seven grocery chains. Once you scan your own receipts, this is
		where your real prices show up.
	</p>

	<input
		bind:value={query}
		type="search"
		placeholder="Search eggs, milk, chicken…"
		aria-label="Search an item"
		class="blur-rise mt-6 w-full rounded-md border border-ink/30 bg-receipt px-4 py-3 text-base text-receipt-ink placeholder:text-receipt-muted focus:border-ink focus:outline-none"
		style:--delay="220ms"
	/>

	<div class="blur-rise mt-4 flex flex-wrap gap-2" style:--delay="300ms">
		{#each visible as item (item.key)}
			<button class="chip" class:selected={item.key === selected.key} onclick={() => (selected = item)}>
				{item.label}
			</button>
		{:else}
			<p class="text-sm text-muted">Nothing called "{query}" in the sample yet.</p>
		{/each}
		{#if !searching && all.length > FIRST}
			<button class="chip more" onclick={() => (showAll = !showAll)}>
				{showAll ? 'Fewer' : `More (${all.length - FIRST})`}
			</button>
		{/if}
	</div>

	{#key selected.key}
		<section in:fade={{ duration: 300 }} class="mt-8 rounded-[3px] bg-receipt px-6 py-6 font-mono text-receipt-ink shadow-lg sm:px-8">
			<div class="flex items-baseline justify-between gap-4">
				<h2 class="font-bold tracking-wide">{selected.label}</h2>
				<span class="text-xs text-receipt-muted">price{per}</span>
			</div>

			<div class="my-4 border-t border-dashed border-receipt-line"></div>

			<ul class="space-y-3">
				{#each selected.prices as row, i (row.store)}
					<li class="grid grid-cols-[6rem_1fr_4.5rem] items-center gap-3 text-sm">
						<span>{row.store}</span>
						<span class="h-2 overflow-hidden rounded-full bg-receipt-line/50">
							<span
								class="bar block h-full rounded-full {i === 0 ? 'bg-receipt-down' : 'bg-receipt-ink/70'}"
								style:--size={row.price / highest}
								style:--delay="{i * 60}ms"
							></span>
						</span>
						<span class="text-right">{money(row.price)}</span>
					</li>
				{/each}
			</ul>

			{#if selected.usAverage !== null}
				<div class="mt-4 flex justify-between border-t border-dashed border-receipt-line pt-3 text-xs text-receipt-muted">
					<span>US average, August 2026</span>
					<span>{money(selected.usAverage)}{per}</span>
				</div>
			{/if}

			<p class="mt-5 text-xs text-receipt-down">
				▼ {selected.prices[0].store} is cheapest. {title(selected.label)} costs {Math.round(
					((selected.prices.at(-1)!.price - selected.prices[0].price) / selected.prices[0].price) * 100
				)}% more at {selected.prices.at(-1)!.store}.
			</p>
		</section>
	{/key}

	<p class="mt-6 text-xs leading-relaxed text-muted">
		Sample prices are typical 2026 shelf prices from published store price reports and the Bureau of Labor
		Statistics. Real prices vary by city and week.
	</p>
</main>

<style>
	.wordmark {
		font-family: var(--font-display);
		font-weight: 700;
		font-synthesis: none;
		font-variation-settings: 'SOFT' 100;
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

	/* bars grow from the left; transform only, so rows never shift */
	.bar {
		transform-origin: left;
		transform: scaleX(var(--size));
		animation: grow 600ms cubic-bezier(0.2, 0.7, 0.2, 1) var(--delay) both;
	}

	@keyframes grow {
		from {
			transform: scaleX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			animation: none;
		}
	}
</style>
