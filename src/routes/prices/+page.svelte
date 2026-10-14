<script lang="ts">
	import { goto } from '$app/navigation';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import AppShell from '../AppShell.svelte';
	import ItemPicker from '../ItemPicker.svelte';
	import PriceHistory from '../PriceHistory.svelte';

	let { data } = $props();

	// the chip lights up at once; the history follows when the server answers
	let picked = $state<string | null>(null);
	const selected = $derived(picked ?? data.selected ?? '');

	let history = $state<HTMLElement>();

	// on a phone the history sits below the list, so it is brought into view once it arrives
	async function pick(name: string) {
		picked = name;
		await goto(`?item=${encodeURIComponent(name)}`, { replaceState: true, noScroll: true, keepFocus: true });
		if (matchMedia('(max-width: 959px)').matches) history?.scrollIntoView({ behavior: prefersReducedMotion.current ? 'auto' : 'smooth' });
	}
</script>

<svelte:head>
	<title>Prices · BillBuddy</title>
</svelte:head>

<AppShell fit firstName={data.firstName}>
	<main>
		<h1>What did I pay last time?</h1>

		{#if data.products.length}
			<div class="columns">
				<div class="picker">
					<ItemPicker items={data.products} bind:selected={() => selected, pick} />
				</div>
				<div class="history" bind:this={history}>
					{#key data.selected}
						{#if data.history}
							<div in:fade={{ duration: 250 }}>
								<PriceHistory history={data.history} />
							</div>
						{/if}
					{/key}
				</div>
			</div>
		{:else}
			<p class="lead">
				Your prices show up here once a receipt is read. <a href="/home">Add a receipt</a> or
				<a href="/demo">see how it looks</a> with a sample shopper.
			</p>
		{/if}
	</main>
</AppShell>

<style>
	main {
		margin-top: 2rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.columns {
		display: grid;
		gap: 2rem;
		margin-top: 1.5rem;
	}

	.history {
		scroll-margin-top: 1rem;
	}

	/* the history stays in view while the list beside it is browsed */
	@media (min-width: 960px) {
		.columns {
			grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
			align-items: start;
			gap: 3rem;
		}

		.history {
			position: sticky;
			top: 1.5rem;
		}
	}

	.lead {
		margin-top: 0.5rem;
		color: var(--color-muted);
	}

	.lead a {
		color: var(--color-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	/* on a laptop the page is one screen tall; the item list and the history each scroll on their own */
	@media (min-width: 1024px) and (min-height: 600px) {
		main {
			display: flex;
			flex: 1;
			flex-direction: column;
			min-height: 0;
		}

		.columns {
			flex: 1;
			min-height: 0;
			grid-template-rows: minmax(0, 1fr);
			align-items: stretch;
		}

		/* search and the most bought stay put; only the aisles (or the search results) scroll */
		.picker {
			display: flex;
			flex-direction: column;
			min-height: 0;
			padding: 3px 0 0 3px;
		}

		.picker > :global(*) {
			flex: none;
		}

		.picker > :global(.aisles),
		.picker > :global(.chips:last-child),
		.history {
			flex: 1 1 auto;
			position: static;
			min-height: 0;
			overflow-y: auto;
			padding-right: 0.5rem;
			scrollbar-gutter: stable;
			scrollbar-width: thin;
			scrollbar-color: var(--color-line) transparent;
		}
	}
</style>
