<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import AppShell from '../AppShell.svelte';
	import ItemPicker from '../ItemPicker.svelte';
	import PriceHistory from '../PriceHistory.svelte';

	let { data } = $props();

	// the chip lights up at once; the history follows when the server answers
	let picked = $state<string | null>(null);
	const selected = $derived(picked ?? data.selected ?? '');

	function pick(name: string) {
		picked = name;
		goto(`?item=${encodeURIComponent(name)}`, { replaceState: true, noScroll: true, keepFocus: true });
	}
</script>

<svelte:head>
	<title>Prices · BillBuddy</title>
</svelte:head>

<AppShell firstName={data.firstName}>

	<main>
		<h1>What did I pay last time?</h1>

		{#if data.products.length}
			<p class="lead">Pick something you buy. You'll see what you paid, where, and how the price moved.</p>
			<ItemPicker items={data.products} bind:selected={() => selected, pick} />
			{#key data.selected}
				{#if data.history}
					<div class="mt-8" in:fade={{ duration: 300 }}>
						<PriceHistory history={data.history} />
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
