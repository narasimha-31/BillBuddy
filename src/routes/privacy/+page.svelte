<script lang="ts">
	const promises = [
		['We never sell or share your data.', 'No ads, no trackers, no "partners". Your receipts are not a product.'],
		['Card details are never saved.', 'We keep the items, prices, store and date. The card digits, cash given and change stay on the paper.'],
		['The photo is deleted once it is read.', 'Unless you choose to keep it. What stays is the list of items, not the picture.'],
		[
			'The AI reads it and forgets it.',
			'Open models on Nebius read your receipt with zero data retention. Nothing is stored after the read, and nothing is used for training.'
		],
		['Price checks send only the item name.', 'When we look up a better price, the search sees "bananas". Never you, your store or your city.'],
		['Cookies only keep you signed in.', 'No tracking or ad cookies, which is why there is no cookie banner.'],
		['Only you can see your receipts.', 'Locked to your account in the database itself. Delete your account and every receipt goes with it.']
	];
</script>

<svelte:head>
	<title>The fine print · BillBuddy</title>
</svelte:head>

<main class="mx-auto max-w-xl px-5 py-12">
	<a href="/" class="wordmark text-2xl"><span class="text-accent">B</span>ill<span class="text-accent">B</span>uddy</a>

	<article class="mt-6 rounded-[3px] bg-receipt px-6 py-8 font-mono text-receipt-ink shadow-lg sm:px-10">
		<h1 class="text-center text-lg font-bold tracking-[0.2em]">THE FINE PRINT</h1>
		<p class="mt-1 text-center text-xs text-receipt-muted">what happens to your receipts</p>

		<div class="my-6 border-t border-dashed border-receipt-line"></div>

		<ol class="space-y-6">
			{#each promises as [promise, detail] (promise)}
				<li>
					<p class="text-sm font-bold">{promise}</p>
					<p class="mt-1 font-sans text-sm leading-relaxed text-receipt-muted">{detail}</p>
				</li>
			{/each}
		</ol>

		<div class="my-6 border-t border-dashed border-receipt-line"></div>

		<p class="text-center text-xs tracking-[0.2em]">THAT'S IT. TOLD YOU IT WAS SHORT.</p>
	</article>
</main>

<style>
	.wordmark {
		font-family: var(--font-display);
		font-weight: 700;
		font-synthesis: none;
		font-variation-settings: 'SOFT' 100;
	}
</style>
