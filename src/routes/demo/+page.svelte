<script lang="ts">
	import { fade } from 'svelte/transition';
	import { comparisons } from '../store-prices';
	import { historyOf, itemsBought } from '../../price-history';
	import { money as cents, shortDay } from '../../format';
	import ItemPicker from '../ItemPicker.svelte';
	import PriceHistory from '../PriceHistory.svelte';
	import { productFor, samplePurchases, sampleReceipts } from './sample-receipts';

	const all = itemsBought(samplePurchases);
	const chains = comparisons();

	let selected = $state('Large eggs, 12 ct');

	const history = $derived(historyOf(samplePurchases, selected)!);
	const typical = $derived(chains.find((c) => c.key === productFor(selected)) ?? null);
	const highest = $derived(typical ? Math.max(...typical.prices.map((p) => p.price), typical.usAverage ?? 0) : 1);
	const per = $derived(typical?.unit === 'LB' ? '/lb' : '');
	const money = (n: number) => `$${n.toFixed(2)}`;
</script>

<svelte:head>
	<title>Demo · BillBuddy</title>
</svelte:head>

<header class="top">
	<a href="/" class="wordmark"><span>B</span>ill<span>B</span>uddy</a>
	<a href="/" class="start">Use it with your receipts</a>
</header>

<main class="layout">
	<div class="intro">
		<h1>What did I pay last time?</h1>
		<p>
			A sample shopper with {sampleReceipts.length} receipts from the last three months. Pick something they buy to see
			what they paid, where, and how the price moved. Your own receipts work the same way.
		</p>
	</div>

	<div class="picker">
		<ItemPicker items={all} bind:selected />
	</div>

	<div class="result">
		{#key selected}
			<div in:fade={{ duration: 250 }}>
				<PriceHistory {history} />
			</div>

				{#if typical}
					<section class="card" in:fade={{ duration: 300 }}>
						<header>
							<h2>Typical price elsewhere</h2>
							<span>{typical.unit === 'LB' ? 'per lb' : 'each'}</span>
						</header>

						<ul class="rows">
							{#each typical.prices as row, i (row.store)}
								<li class:cheapest={i === 0}>
									<span class="store">
										{row.store}
										{#if i === 0}<em>cheapest</em>{/if}
									</span>
									<span class="track">
										<span class="bar" style:--size={row.price / highest} style:--delay="{i * 60}ms"></span>
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
							<p class="note">Typical 2026 shelf prices from store price reports. Real prices vary by city and week.</p>
						</footer>
					</section>
				{/if}
		{/key}
	</div>

	<aside class="receipts">
		<h2>Their receipts</h2>
		<p>Tap one to see what was printed and the name BillBuddy gave it.</p>
			<ul>
				{#each sampleReceipts as receipt (receipt.id)}
					<li>
						<details>
							<summary>
								<span>
									<strong>{receipt.store}</strong>
									<small>{shortDay(receipt.date)}{receipt.via ? ` · ${receipt.via} delivery` : ''}</small>
								</span>
								<span class="total">{cents(receipt.totalCents)}</span>
							</summary>
							<ul class="lines">
								{#each receipt.lines as line (line.raw)}
									<li>
										<span class="printed">{line.raw}</span>
										<span class="named">{line.name}</span>
										<span class="price">{cents(line.totalCents)}</span>
									</li>
								{/each}
							</ul>
						</details>
					</li>
				{/each}
			</ul>
	</aside>
</main>

<style>
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 auto;
		max-width: 90rem;
		border-bottom: 1px dashed var(--color-line);
		padding: 1.5rem 1.25rem 1.25rem;
	}

	@media (min-width: 1024px) {
		.top {
			padding: 2rem 2.5rem 1.25rem;
		}
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 700;
		font-synthesis: none;
		font-variation-settings: 'SOFT' 100;
		color: var(--color-ink);
	}

	.wordmark span {
		color: var(--color-brand);
	}

	.start {
		border-radius: 999px;
		background: var(--color-ink);
		padding: 0.55rem 1.1rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-receipt);
	}

	.wordmark:focus-visible,
	.start:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 3vw, 2.4rem);
		font-weight: 650;
		font-synthesis: none;
		font-variation-settings: 'SOFT' 100;
		color: var(--color-ink);
	}

	.intro p,
	.receipts > p {
		margin-top: 0.5rem;
		max-width: 36rem;
		color: var(--color-muted);
	}

	.receipts > p {
		font-size: 0.9rem;
	}

	.receipts h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-muted);
	}

	/* touch screens keep :hover on the last tapped spot, so hover styles are for mice only */
	@media (hover: hover) {
		details:not([open]) summary:hover {
			border-radius: 0.75rem;
			background: var(--color-receipt);
		}
	}

	.card {
		margin-top: 2rem;
		border-radius: 0.875rem;
		background: var(--color-receipt);
		padding: 1.5rem;
		font-family: var(--font-mono);
		color: var(--color-receipt-ink);
		box-shadow: 0 0 0 1px var(--color-receipt-line);
	}

	.card header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px dashed var(--color-receipt-line);
		padding-bottom: 1rem;
	}

	.card h2 {
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.card header span {
		font-size: 0.75rem;
		color: var(--color-receipt-muted);
	}

	.rows {
		display: grid;
		gap: 0.85rem;
		margin-top: 1.25rem;
	}

	.rows li {
		display: grid;
		grid-template-columns: 7.5rem 1fr 4rem;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.store {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}

	.store em {
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-receipt-down) 14%, transparent);
		padding: 0.1rem 0.4rem;
		font-size: 0.625rem;
		font-style: normal;
		color: var(--color-receipt-down);
	}

	.track {
		position: relative;
		height: 0.6rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-receipt-line) 60%, transparent);
	}

	.price {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.cheapest .price {
		font-weight: 700;
		color: var(--color-receipt-down);
	}

	/* bars grow from the left; transform only, so rows never shift */
	.bar {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: color-mix(in srgb, var(--color-receipt-ink) 70%, transparent);
		transform-origin: left;
		transform: scaleX(var(--size));
		animation: grow 600ms cubic-bezier(0.2, 0.7, 0.2, 1) var(--delay) both;
	}

	.cheapest .bar {
		background: var(--color-receipt-down);
	}

	.average,
	.tick {
		width: 0;
		border-left: 2px dashed var(--color-receipt-up);
	}

	.average {
		position: absolute;
		top: -0.3rem;
		bottom: -0.3rem;
	}

	.card footer {
		margin-top: 1.5rem;
		border-top: 1px dashed var(--color-receipt-line);
		padding-top: 1rem;
		font-size: 0.75rem;
		line-height: 1.6;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-receipt-muted);
	}

	.tick {
		height: 0.9rem;
	}

	.note {
		margin-top: 0.5rem;
		color: var(--color-receipt-muted);
	}

	.layout {
		display: grid;
		gap: 2rem;
		margin: 0 auto;
		max-width: 90rem;
		padding: 2rem 1.25rem 4rem;
	}

	/* the list and receipts on the left, what was paid on the right, like the Prices page */
	@media (min-width: 960px) {
		.layout {
			grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
			grid-template-areas: 'intro result' 'picker result' 'receipts result';
			grid-template-rows: auto auto 1fr;
			align-items: start;
			column-gap: 3rem;
			padding: 2rem 2.5rem 4rem;
		}

		.intro {
			grid-area: intro;
		}

		.picker {
			grid-area: picker;
		}

		.result {
			grid-area: result;
		}

		.receipts {
			grid-area: receipts;
		}
	}

	.receipts > ul {
		display: grid;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	details {
		border-radius: 0.75rem;
		background: var(--color-raised);
	}

	details[open] {
		background: var(--color-receipt);
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		list-style: none;
		color: var(--color-ink);
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary small {
		display: block;
		font-size: 0.8rem;
		color: var(--color-muted);
	}

	.total {
		font-family: var(--font-mono);
		font-weight: 700;
	}

	.lines {
		display: grid;
		gap: 0.6rem;
		border-top: 1px dashed var(--color-receipt-line);
		padding: 0.75rem 1rem 1rem;
		color: var(--color-receipt-ink);
	}

	.lines li {
		display: grid;
		grid-template-columns: 1fr auto;
		column-gap: 0.75rem;
	}

	.printed {
		grid-column: 1 / -1;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-receipt-muted);
	}

	.named {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.lines .price {
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	@media (max-width: 480px) {
		.card {
			padding: 1.25rem 1rem;
		}

		.rows li {
			grid-template-columns: 5.25rem 1fr 3.5rem;
			gap: 0.6rem;
			font-size: 0.8125rem;
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
		.bar {
			animation: none;
		}
	}
</style>
