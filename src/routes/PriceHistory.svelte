<script lang="ts">
	import type { History } from '../price-history';
	import { money, shortDay, storeName } from '../format';
	import Trend from './Trend.svelte';

	// extra facts per store, such as "Your usual" or "Nearest · 0.8 mi"
	let { history, tags = {} }: { history: History; tags?: Record<string, string[]> } = $props();

	const SHOWN = 6;
	const per = $derived(history.per === 'lb' ? '/lb' : '');
	const previous = $derived(history.visits[1]);
	const change = $derived(history.change);

	// One list for both questions: newest first answers "what did I pay", cheapest first answers
	// "where is it cheapest". Each row opens the receipt it came from.
	let order = $state<'newest' | 'cheapest'>('newest');
	let only = $state<string | null>(null);
	let everything = $state(false);
	const storeOf = (store: string | null) => store ?? 'Unknown store';
	const stores = $derived(history.stores.map((s) => s.store));
	const lowest = $derived(Math.min(...history.visits.map((v) => v.unitCents)));
	const priciest = $derived(Math.max(...history.visits.map((v) => v.unitCents)));
	const rows = $derived.by(() => {
		const kept = history.visits.filter((v) => only === null || storeOf(v.store) === only);
		// sorting a copy of a list already newest first keeps ties newest first
		return order === 'cheapest' ? [...kept].sort((a, b) => a.unitCents - b.unitCents) : kept;
	});
	const shown = $derived(everything ? rows : rows.slice(0, SHOWN));
	const opens = (v: History['visits'][number]) => (v.receiptId ? `/receipts/${v.receiptId}?from=${encodeURIComponent(history.name)}#line-${v.itemId}` : null);
	const lastLink = $derived(opens(history.last));

	// another product starts from the full, newest-first list
	$effect.pre(() => {
		void history.name;
		order = 'newest';
		only = null;
		everything = false;
	});
</script>

<section class="card">
	<header>
		<h2>{history.name}</h2>
		<span>{history.per === 'lb' ? 'price per lb' : 'price each'}</span>
	</header>

	<div class="last">
		<p class="label">You paid last time</p>
		<p class="big">{money(history.last.unitCents)}<small>{per}</small></p>
		<p class="where">
			{#if lastLink}
				<a href={lastLink}>at {storeName(history.last.store) ?? 'an unknown store'} on {shortDay(history.last.date)}</a>
			{:else}
				at {storeName(history.last.store) ?? 'an unknown store'} on {shortDay(history.last.date)}
			{/if}
			{#if history.last.channel === 'delivery'}<em class="tag">delivery</em>{/if}
		</p>
		{#if change && previous}
			<p class="change" class:up={change.cents > 0} class:down={change.cents < 0}>
				{#if change.cents === 0}
					Same as the time before at {storeName(previous.store) ?? 'an unknown store'}.
				{:else}
					<Trend up={change.cents > 0} />{change.cents > 0 ? 'Up' : 'Down'}
					{money(Math.abs(change.cents))} ({Math.abs(change.percent)}%) from {storeName(previous.store) ?? 'an unknown store'} on {shortDay(previous.date)}.
				{/if}
			</p>
		{/if}
	</div>

	<div class="part">
		<div class="list-head">
			<p class="label">Every time you bought it</p>
			{#if history.visits.length > 1}
				<div class="order" role="group" aria-label="Sort">
					<button type="button" aria-pressed={order === 'newest'} onclick={() => (order = 'newest')}>Newest</button>
					<button type="button" aria-pressed={order === 'cheapest'} onclick={() => (order = 'cheapest')}>Cheapest</button>
				</div>
			{/if}
		</div>

		{#if stores.length > 1}
			<div class="only" role="group" aria-label="Store">
				<button type="button" aria-pressed={only === null} onclick={() => (only = null)}>All stores</button>
				{#each stores as store (store)}
					<button type="button" aria-pressed={only === store} onclick={() => (only = only === store ? null : store)}>
						{storeName(store) ?? store}{#each tags[store] ?? [] as fact (fact)}<em class="fact">{fact}</em>{/each}
					</button>
				{/each}
			</div>
		{/if}

		<ul class="visits">
			{#each shown as visit (visit.itemId ?? `${visit.date}${visit.store}${visit.unitCents}`)}
				{@const cheapest = stores.length > 1 && visit.unitCents === lowest}
				{@const href = opens(visit)}
				<li class:cheapest>
					<svelte:element this={href ? 'a' : 'div'} class="visit" {href}>
						<span class="day">{shortDay(visit.date)}</span>
						<span class="store">
							<span class="name">{storeName(visit.store) ?? 'Unknown store'}</span>
							{#if cheapest}<em>cheapest</em>{/if}
							{#if visit.channel === 'delivery'}<em class="tag">delivery</em>{/if}
						</span>
						<span class="track" aria-hidden="true"><span class="bar" style:--size={visit.unitCents / priciest}></span></span>
						<span class="price">{money(visit.unitCents)}{per}</span>
						{#if href}<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>{/if}
					</svelte:element>
				</li>
			{/each}
		</ul>
		{#if rows.length > SHOWN}
			<button type="button" class="more" onclick={() => (everything = !everything)}>
				{everything ? 'Show fewer' : `Show all ${rows.length}`}
			</button>
		{/if}
	</div>
</section>

<style>
	.card {
		border-radius: 18px;
		background: #fff;
		padding: 1.4rem 1.5rem;
		color: var(--color-ink);
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid rgb(60 60 67 / 0.12);
		padding-bottom: 0.9rem;
	}

	h2 {
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	header span,
	.label,
	.more {
		font-size: 0.8125rem;
		color: var(--color-receipt-muted);
	}

	header span {
		white-space: nowrap;
	}

	.last {
		padding: 1.25rem 0;
	}

	.big {
		margin-top: 0.25rem;
		font-family: var(--font-display);
		font-size: 3rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}

	.big small {
		font-size: 1.1rem;
		font-weight: 400;
		color: var(--color-receipt-muted);
	}

	.where {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.35rem;
		font-size: 0.875rem;
	}

	.change {
		margin-top: 0.75rem;
		font-size: 0.875rem;
	}

	.change.up {
		color: var(--color-receipt-up);
	}

	.change.down {
		color: var(--color-receipt-down);
	}

	.where a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: rgb(60 60 67 / 0.3);
		text-underline-offset: 3px;
		transition: text-decoration-color var(--quick) var(--ease);
	}

	.where a:hover {
		text-decoration-color: currentColor;
	}

	.part {
		border-top: 1px solid rgb(60 60 67 / 0.12);
		padding: 1.1rem 0 0.25rem;
	}

	.list-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.list-head .label {
		white-space: nowrap;
	}

	/* the sort is a small segmented control; the store filter is a row of chips that scrolls */
	.order {
		display: inline-grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		border-radius: 9px;
		background: rgb(118 118 128 / 0.12);
		padding: 2px;
	}

	.order button {
		border-radius: 7px;
		padding: 0.25rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-ink);
		transition:
			background-color var(--quick) var(--ease),
			box-shadow var(--quick) var(--ease),
			transform var(--standard) var(--ease);
	}

	.order button[aria-pressed='true'] {
		background: #fff;
		box-shadow:
			0 3px 8px rgb(0 0 0 / 0.12),
			0 3px 1px rgb(0 0 0 / 0.04);
	}

	/* a scroll row still reports all its chips as its width; containing it keeps the card from growing */
	.only {
		contain: inline-size;
		display: flex;
		gap: 0.4rem;
		margin: 0.85rem -1.5rem 0;
		overflow-x: auto;
		padding: 0.1rem 1.5rem;
		scrollbar-width: none;
	}

	.only button {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 0.35rem;
		border-radius: 999px;
		background: rgb(118 118 128 / 0.12);
		padding: 0.35rem 0.8rem;
		font-size: 0.8125rem;
		color: var(--color-ink);
		white-space: nowrap;
		transition:
			background-color var(--quick) var(--ease),
			color var(--quick) var(--ease),
			transform var(--standard) var(--ease);
	}

	.only button[aria-pressed='true'] {
		background: var(--color-ink);
		color: #fff;
	}

	.only button[aria-pressed='true'] .fact {
		background: rgb(255 255 255 / 0.2);
		color: #fff;
	}

	.order button:active,
	.only button:active,
	.more:active {
		transform: scale(0.96);
		transition-duration: var(--quick);
	}

	.order button:focus-visible,
	.only button:focus-visible,
	.more:focus-visible,
	.visit:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	/* every row shares one store column, as wide as the longest name, so the bars line up */
	.visits {
		display: grid;
		grid-template-columns: max-content minmax(0, max-content) minmax(4rem, 1fr) auto 1rem;
		margin: 0.5rem -0.75rem 0;
		font-size: 0.9375rem;
	}

	.visits li {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
	}

	/* a row is one tap target: date, store, a bar to compare at a glance, the price, a chevron */
	.visit {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: center;
		column-gap: 0.9rem;
		border-radius: 12px;
		padding: 0.6rem 0.75rem;
		color: inherit;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color var(--quick) var(--ease),
			transform var(--standard) var(--ease);
	}

	a.visit:hover {
		background: rgb(118 118 128 / 0.08);
	}

	a.visit:active {
		background: rgb(118 118 128 / 0.14);
		transform: scale(0.985);
		transition-duration: var(--quick);
	}

	.day {
		min-width: 3rem;
		color: var(--color-receipt-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.store {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: var(--color-receipt-muted);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: transform var(--standard) var(--ease);
	}

	a.visit:hover .chevron {
		transform: translateX(2px);
	}

	em {
		flex: none;
		border-radius: 999px;
		padding: 0.1rem 0.4rem;
		font-size: 0.625rem;
		font-style: normal;
	}

	.store em:not(.tag) {
		background: color-mix(in srgb, var(--color-receipt-down) 14%, transparent);
		color: var(--color-receipt-down);
	}

	.fact {
		background: rgb(118 118 128 / 0.16);
		color: var(--color-muted);
	}

	.tag {
		background: color-mix(in srgb, var(--color-receipt-up) 12%, transparent);
		color: var(--color-receipt-up);
	}

	.track {
		position: relative;
		height: 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-receipt-line) 60%, transparent);
	}

	/* each bar is scaled from the left, so its length never changes the row */
	.bar {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: color-mix(in srgb, var(--color-receipt-ink) 55%, transparent);
		transform-origin: left;
		transform: scaleX(var(--size));
		transition: transform var(--slow) var(--ease);
	}

	.cheapest .bar {
		background: var(--color-receipt-down);
	}

	.price {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.cheapest .price {
		font-weight: 700;
		color: var(--color-receipt-down);
	}

	.more {
		margin-top: 0.5rem;
		border-radius: 8px;
		padding: 0.3rem 0;
		font-size: 0.875rem;
		color: var(--color-accent);
		transition: transform var(--standard) var(--ease);
	}

	@media (max-width: 480px) {
		.card {
			padding: 1.25rem 1rem;
		}

		.only {
			margin-inline: -1rem;
			padding-inline: 1rem;
		}

		/* on a phone the bar moves under the store and price */
		.visits,
		.visits li {
			display: block;
		}

		.visit {
			grid-template-columns: 3.25rem minmax(0, 1fr) auto 0.9rem;
			grid-template-areas: 'day store price chevron' 'day track track chevron';
			row-gap: 0.35rem;
			column-gap: 0.6rem;
		}

		.day {
			grid-area: day;
		}

		.store {
			grid-area: store;
		}

		.track {
			grid-area: track;
		}

		.price {
			grid-area: price;
		}

		.chevron {
			grid-area: chevron;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
	}
</style>
