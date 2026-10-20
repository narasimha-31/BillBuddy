<script lang="ts">
	import SiteFooter from '../SiteFooter.svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { comparisons } from '../store-prices';
	import { historyOf, itemsBought } from '../../price-history';
	import { money as cents, shortDay } from '../../format';
	import ItemPicker from '../ItemPicker.svelte';
	import PriceHistory from '../PriceHistory.svelte';
	import Wordmark from '../Wordmark.svelte';
	import { placed } from '../../branches';
	import PriceMap from '../PriceMap.svelte';
	import { productFor, sampleBranches, sampleHome, samplePurchases, sampleReceipts } from './sample-receipts';

	const all = itemsBought(samplePurchases);
	const chains = comparisons();

	let selected = $state('Large eggs, 12 ct');
	// the sample shopper's map is on; "See how it asks first" shows the locked map they started from
	let asking = $state(false);
	let only = $state<string | null>(null);
	const places = placed(sampleBranches, sampleHome);
	let result = $state<HTMLElement>();

	const history = $derived(historyOf(samplePurchases, selected)!);
	const typical = $derived(chains.find((c) => c.key === productFor(selected)) ?? null);
	const highest = $derived(typical ? Math.max(...typical.prices.map((p) => p.price), typical.usAverage ?? 0) : 1);
	const per = $derived(typical?.unit === 'LB' ? '/lb' : '');
	const money = (n: number) => `$${n.toFixed(2)}`;

	// same as the Prices page: on a phone, picking from an aisle below the price brings the price back into view
	function pick(name: string) {
		selected = name;
		const top = result?.getBoundingClientRect().top ?? 0;
		if (matchMedia('(max-width: 959px)').matches && (top < 0 || top > innerHeight * 0.6))
			result?.scrollIntoView({ behavior: prefersReducedMotion.current ? 'auto' : 'smooth' });
	}
</script>

<svelte:head>
	<title>Demo · BillBuddy</title>
</svelte:head>

<div class="app">
	<header class="top">
		<div class="site-top">
			<Wordmark />
			<span class="sample">Sample shopper</span>
			<a href="/" class="pill-button start">Use your receipts</a>
		</div>
	</header>

	<main>
		<h1 class="large-title">What did I pay last time?</h1>
		<p class="ask">
			A sample shopper with {sampleReceipts.length} receipts from the last three months. Pick something they buy to see
			what they paid, where, and how the price moved.
		</p>

		<div class="columns">
			<div class="picker">
				<ItemPicker items={all} bind:selected={() => selected, pick} />
			</div>

			<div class="result scroll-area" bind:this={result}>
				{#key selected}
					<div in:fade={{ duration: 250 }}>
						<PriceHistory {history} bind:only>
							{#snippet map()}
								<PriceMap map={{ on: !asking, zip: sampleHome.zip, you: sampleHome }} {places} stores={[]} {history} bind:only demo onpretend={() => (asking = false)} />
								{#if !asking}
									<p class="map-note">
										Sample shopper near ZIP {sampleHome.zip}. In your account the map stays off until you turn it on.
										<button type="button" class="ask-again" onclick={() => (asking = true)}>See how it asks first</button>
									</p>
								{/if}
							{/snippet}
						</PriceHistory>
					</div>

					{#if typical}
						<section class="typical surface" in:fade={{ duration: 300 }} aria-labelledby="typical-title">
							<header>
								<h2 id="typical-title">Typical price elsewhere</h2>
								<span>{typical.unit === 'LB' ? 'per lb' : 'each'}</span>
							</header>

							<ul class="bars">
								{#each typical.prices as row, i (row.store)}
									<li class:cheapest={i === 0}>
										<span class="store">
											{row.store}
											{#if i === 0}<em>Cheapest</em>{/if}
										</span>
										<span class="track">
											<span class="fill" style:--size={row.price / highest} style:--delay="{i * 60}ms"></span>
											{#if typical.usAverage !== null}
												<span class="average" style:left="{(typical.usAverage / highest) * 100}%"></span>
											{/if}
										</span>
										<span class="price">{money(row.price)}</span>
									</li>
								{/each}
							</ul>

							<footer>
								{#if typical.usAverage !== null}
									<p class="legend">
										<span class="tick"></span>
										US average {money(typical.usAverage)}{per} · BLS, August 2026
									</p>
								{/if}
								<p>Typical 2026 shelf prices from store price reports. Real prices vary by city and week.</p>
							</footer>
						</section>
					{/if}
				{/key}
			</div>

			<section class="receipts" aria-labelledby="receipts-title">
				<h2 class="list-label" id="receipts-title">Their receipts</h2>
				<ul class="group">
					{#each sampleReceipts as receipt (receipt.id)}
						<li>
							<details>
								<summary class="row">
									<span class="row-title">{receipt.store}</span>
									<span class="row-value">{cents(receipt.totalCents)}</span>
									<span class="row-sub">{shortDay(receipt.date)}{receipt.via ? ` · ${receipt.via} delivery` : ''}</span>
								</summary>
								<p class="count">{receipt.lines.length} items</p>
								<ul class="lines">
									{#each receipt.lines as line (line.raw)}
										<li>
											<span class="named">{line.name}</span>
											<span class="price">{cents(line.totalCents)}</span>
											<span class="printed">{line.raw}</span>
										</li>
									{/each}
								</ul>
							</details>
						</li>
					{/each}
				</ul>
				<p class="hint">Open one to see what was printed and the name BillBuddy gave it.</p>
			</section>
		</div>
	</main>
	<footer class="bottom"><SiteFooter /></footer>
</div>

<style>
	.bottom {
		margin: 0 auto;
		max-width: 76rem;
		border-top: 1px solid rgb(60 60 67 / 0.1);
		padding: 1rem 1.25rem 2rem;
	}

	/* the demo is the app itself, so it sits on the same grouped grey as the signed-in pages */
	.app {
		min-height: 100dvh;
		background: var(--color-raised);
	}

	.top {
		position: sticky;
		top: 0;
		z-index: 20;
		background: color-mix(in srgb, var(--color-raised) 82%, transparent);
		backdrop-filter: saturate(1.8) blur(20px);
		box-shadow: 0 1px 0 rgb(0 0 0 / 0.06);
	}

	.sample {
		border-radius: 999px;
		background: rgb(118 118 128 / 0.12);
		padding: 0.2rem 0.65rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.start {
		margin-left: auto;
		padding: 0.5rem 1.05rem;
		font-size: 0.9375rem;
		white-space: nowrap;
	}

	@media (max-width: 420px) {
		.sample {
			display: none;
		}
	}

	main {
		margin: 0 auto;
		max-width: 76rem;
		padding: 1.75rem 1.25rem 4rem;
	}

	.ask {
		margin-top: 0.4rem;
		max-width: 38rem;
		font-size: 1.0625rem;
		line-height: 1.45;
		color: var(--color-muted);
	}

	.columns {
		display: grid;
		gap: 2rem;
		margin-top: 1.75rem;
	}

	.result {
		display: grid;
		gap: 1.25rem;
		scroll-margin-top: 5rem;
	}

	/* on a phone the price comes straight after the items tapped most; the aisles and receipts follow it */
	@media (max-width: 959px) {
		.columns {
			display: flex;
			flex-direction: column;
			gap: 0;
		}

		.picker {
			display: contents;
		}

		.result {
			order: 2;
			margin-top: 1.5rem;
		}

		.picker > :global(h2:nth-of-type(2)),
		.picker > :global(.aisles) {
			order: 3;
		}

		.receipts {
			order: 4;
			margin-top: 2rem;
		}
	}

	/* on a laptop the list and receipts sit left; the price stays in view on the right */
	@media (min-width: 960px) {
		.columns {
			grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
			grid-template-areas: 'picker result' 'receipts result';
			grid-template-rows: auto 1fr;
			align-items: start;
			gap: 2rem 3rem;
		}

		.picker {
			grid-area: picker;
		}

		.receipts {
			grid-area: receipts;
		}

		.result {
			grid-area: result;
			position: sticky;
			top: 5rem;
			max-height: calc(100dvh - 6.5rem);
		}
	}

	.map-note {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.ask-again {
		border-radius: 6px;
		color: var(--color-accent);
	}

	.ask-again:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.ask-again:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.typical {
		padding: 1.25rem 1.4rem 1.1rem;
	}

	.typical header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.typical h2 {
		font-family: var(--font-display);
		font-size: 1.1875rem;
		font-weight: 600;
		letter-spacing: -0.015em;
	}

	.typical header span {
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.bars {
		display: grid;
		gap: 0.9rem;
		margin-top: 1.1rem;
	}

	.bars li {
		display: grid;
		grid-template-columns: 7.5rem minmax(0, 1fr) 3.75rem;
		align-items: center;
		gap: 1rem;
		font-size: 0.9375rem;
	}

	.store {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}

	.store em {
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		padding: 0.1rem 0.45rem;
		font-size: 0.6875rem;
		font-style: normal;
		font-weight: 500;
		color: var(--color-accent);
	}

	.track {
		position: relative;
		height: 0.5rem;
		border-radius: 999px;
		background: #ececf0;
	}

	/* bars grow from the left; transform only, so rows never shift */
	.fill {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: #aeaeb2;
		transform-origin: left;
		transform: scaleX(var(--size));
		animation: grow 700ms cubic-bezier(0.16, 1, 0.3, 1) var(--delay) both;
	}

	.cheapest .fill {
		background: var(--color-cheaper);
	}

	.price {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.cheapest .price {
		font-weight: 600;
		color: var(--color-cheaper);
	}

	.average,
	.tick {
		width: 2px;
		border-radius: 1px;
		background: var(--color-ink);
	}

	.average {
		position: absolute;
		top: -0.3rem;
		bottom: -0.3rem;
	}

	.typical footer {
		display: grid;
		gap: 0.4rem;
		margin-top: 1.25rem;
		border-top: 1px solid rgb(60 60 67 / 0.14);
		padding-top: 0.9rem;
		font-size: 0.8125rem;
		line-height: 1.45;
		color: var(--color-muted);
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.tick {
		height: 0.9rem;
	}

	/* each sample receipt opens in place, an iOS disclosure row */
	summary {
		list-style: none;
		grid-template-columns: minmax(0, 1fr) auto 0.5rem;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::after {
		content: '';
		grid-column: 3;
		grid-row: 1 / span 2;
		width: 0.45rem;
		height: 0.45rem;
		border-top: 2px solid rgb(60 60 67 / 0.3);
		border-right: 2px solid rgb(60 60 67 / 0.3);
		transform: rotate(45deg);
		transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	details[open] summary::after {
		transform: translateY(-2px) rotate(135deg);
	}

	@media (hover: hover) {
		summary:hover {
			background: rgb(0 0 0 / 0.025);
		}
	}

	summary:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	/* an open receipt sits on a grey band so its items read apart from the receipt rows */
	.count {
		margin: 0 1rem;
		border-top: 1px solid rgb(60 60 67 / 0.14);
		padding: 0.7rem 0 0.35rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	/* each item is its own white tile on the grey band */
	.lines {
		display: grid;
		gap: 0.375rem;
		margin: 0 0.75rem 0.75rem;
		border-radius: 16px;
		background: var(--color-raised);
		padding: 0.375rem;
	}

	.lines li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0.2rem 0.75rem;
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 0 0 0.5px rgb(0 0 0 / 0.06);
		padding: 0.65rem 0.8rem;
	}

	.named {
		font-size: 0.9375rem;
		color: var(--color-ink);
	}

	.lines .price {
		font-size: 0.9375rem;
		font-variant-numeric: tabular-nums;
	}

	.printed {
		grid-column: 1 / -1;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.hint {
		margin: 0.5rem 1rem 0;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	@media (max-width: 480px) {
		.typical {
			padding: 1.1rem 1rem 1rem;
		}

		.bars li {
			grid-template-columns: 5.5rem minmax(0, 1fr) 3.5rem;
			gap: 0.65rem;
			font-size: 0.875rem;
		}

		.store {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.15rem;
		}
	}

	@keyframes grow {
		from {
			transform: scaleX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fill {
			animation: none;
		}
	}
</style>
