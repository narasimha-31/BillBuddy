<script lang="ts">
	import { fade } from 'svelte/transition';
	import { historyOf, itemsBought } from '../../price-history';
	import AppShell from '../AppShell.svelte';
	import ItemPicker from '../ItemPicker.svelte';
	import PriceHistory from '../PriceHistory.svelte';

	let { data } = $props();

	const items = $derived(itemsBought(data.purchases));
	let picked = $state<string | null>(null);
	const selected = $derived(picked ?? items[0]?.name ?? '');
	const history = $derived(historyOf(data.purchases, selected));
</script>

<svelte:head>
	<title>Prices · BillBuddy</title>
</svelte:head>

<AppShell firstName={data.firstName}>

	<main>
		<h1>What did I pay last time?</h1>

		{#if items.length}
			<p class="lead">Pick something you buy. You'll see what you paid, where, and how the price moved.</p>
			<ItemPicker {items} bind:selected={() => selected, (name) => (picked = name)} />
			{#key selected}
				{#if history}
					<div class="mt-8" in:fade={{ duration: 300 }}>
						<PriceHistory {history} />
					</div>
				{/if}
			{/key}
		{:else}
			<p class="lead">
				Your prices show up here once a receipt is read. <a href="/receipts">Add a receipt</a> or
				<a href="/demo">see how it looks</a> with a sample shopper.
			</p>
		{/if}
	</main>
</AppShell>

<style>
	main {
		margin-top: 2rem;
		max-width: 46rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-ink);
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
</style>
