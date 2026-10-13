<script lang="ts">
	import type { History } from '../price-history';
	import { money, shortDay } from '../format';

	let { history }: { history: History } = $props();

	const SHOWN = 6;
	const per = $derived(history.per === 'lb' ? '/lb' : '');
	const priciest = $derived(Math.max(...history.stores.map((s) => s.lastCents)));
	const previous = $derived(history.visits[1]);
	const change = $derived(history.change);
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
			at {history.last.store ?? 'an unknown store'} on {shortDay(history.last.date)}
			{#if history.last.channel === 'delivery'}<em class="tag">delivery</em>{/if}
		</p>
		{#if change && previous}
			<p class="change" class:up={change.cents > 0} class:down={change.cents < 0}>
				{#if change.cents === 0}
					Same as the time before at {previous.store ?? 'an unknown store'}.
				{:else}
					{change.cents > 0 ? 'Up' : 'Down'}
					{money(Math.abs(change.cents))} ({Math.abs(change.percent)}%) from {previous.store ?? 'an unknown store'} on {shortDay(previous.date)}.
				{/if}
			</p>
		{/if}
	</div>

	{#if history.stores.length > 1}
		<div class="part">
			<p class="label">Last price at each store</p>
			<ul class="stores">
				{#each history.stores as row, i (row.store)}
					{@const cheapest = row.lastCents === history.stores[0].lastCents}
					<li class:cheapest>
						<span class="store">{row.store}{#if cheapest}<em>cheapest</em>{/if}</span>
						<span class="track"><span class="bar" style:--size={row.lastCents / priciest} style:--delay="{i * 60}ms"></span></span>
						<span class="price">{money(row.lastCents)}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="part">
		<p class="label">Every time you bought it</p>
		<ul class="visits">
			{#each history.visits.slice(0, SHOWN) as visit, i (i)}
				<li>
					<span>{shortDay(visit.date)}</span>
					<span class="store">{visit.store ?? 'Unknown store'}{#if visit.channel === 'delivery'}<em class="tag">delivery</em>{/if}</span>
					<span class="price">{money(visit.unitCents)}{per}</span>
				</li>
			{/each}
		</ul>
		{#if history.visits.length > SHOWN}
			<p class="more">and {history.visits.length - SHOWN} more before that</p>
		{/if}
	</div>
</section>

<style>
	.card {
		border-radius: 0.875rem;
		background: var(--color-receipt);
		padding: 1.5rem;
		font-family: var(--font-mono);
		color: var(--color-receipt-ink);
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.06),
			0 18px 40px -18px rgb(0 0 0 / 0.35);
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px dashed var(--color-receipt-line);
		padding-bottom: 1rem;
	}

	h2 {
		font-weight: 700;
	}

	header span,
	.label,
	.more {
		font-size: 0.75rem;
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
		font-size: 2.75rem;
		font-weight: 700;
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

	.part {
		border-top: 1px dashed var(--color-receipt-line);
		padding: 1.1rem 0 0.25rem;
	}

	.part + .part {
		margin-top: 1rem;
	}

	.stores,
	.visits {
		display: grid;
		gap: 0.75rem;
		margin-top: 0.85rem;
		font-size: 0.875rem;
	}

	.stores li {
		display: grid;
		grid-template-columns: 7.5rem 1fr 4rem;
		align-items: center;
		gap: 1rem;
	}

	.visits li {
		display: grid;
		grid-template-columns: 4rem 1fr auto;
		align-items: center;
		gap: 1rem;
	}

	.store {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}

	em {
		border-radius: 999px;
		padding: 0.1rem 0.4rem;
		font-size: 0.625rem;
		font-style: normal;
	}

	.store em:not(.tag) {
		background: rgb(71 106 80 / 0.14);
		color: var(--color-receipt-down);
	}

	.tag {
		background: rgb(148 69 42 / 0.12);
		color: var(--color-receipt-up);
	}

	.track {
		position: relative;
		height: 0.6rem;
		border-radius: 999px;
		background: rgb(207 201 186 / 0.45);
	}

	/* bars grow from the left; transform only, so rows never shift */
	.bar {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: rgb(46 48 44 / 0.7);
		transform-origin: left;
		transform: scaleX(var(--size));
		animation: grow 600ms cubic-bezier(0.2, 0.7, 0.2, 1) var(--delay) both;
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
		margin-top: 0.75rem;
	}

	@media (max-width: 480px) {
		.card {
			padding: 1.25rem 1rem;
		}

		.stores li {
			grid-template-columns: 5.25rem 1fr 3.5rem;
			gap: 0.6rem;
		}

		.stores .store {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.15rem;
		}

		.visits li {
			grid-template-columns: 3.75rem 1fr auto;
			gap: 0.6rem;
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
