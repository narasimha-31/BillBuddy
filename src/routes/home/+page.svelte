<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { money, shortDay, storeName } from '../../format';
	import AppShell from '../AppShell.svelte';

	let { data } = $props();

	const monthName = $derived(new Date(`${data.month.start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }));

	// the month's total counts up once on arrival, so the eye lands on it
	const spent = new Tween(0, { duration: 900, easing: cubicOut });
	onMount(() => spent.set(data.month.spentCents, { duration: prefersReducedMotion.current ? 0 : 900 }));

	const step = (cents: number) => (cents < 100 ? `${cents}¢` : money(cents));
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<svelte:head>
	<title>Home · BillBuddy</title>
</svelte:head>

<AppShell firstName={data.firstName}>
	<main>
		<h1>{data.firstName ? `Hi ${data.firstName}` : 'Your groceries'}</h1>

		<div class="board">
			<a class="add" href="/receipts">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
				<span class="add-title">Add a receipt</span>
				<span class="add-note">A photo, or send it from your phone. {data.today} of {data.dailyLimit} today.</span>
			</a>

			<section class="month" aria-labelledby="month-title">
				<h2 id="month-title">Spent in {monthName}</h2>
				<p class="spent">{money(Math.round(spent.current))}</p>
				<p class="note">
					{#if data.month.receipts}
						{plural(data.month.receipts, 'receipt')} at {plural(data.month.stores, 'store')}
					{:else}
						No receipts dated this month yet
					{/if}
				</p>
			</section>

			<section class="changes" aria-labelledby="changes-title">
				<h2 id="changes-title">Prices since last time</h2>
				{#if data.changes.length}
					<ul>
						{#each data.changes as change (change.name)}
							{@const diff = change.now_cents - change.before_cents}
							<li>
								<a href="/prices?item={encodeURIComponent(change.name)}">
									<span class="name">{change.name}</span>
									<span class="price">{money(change.now_cents)}{change.per === 'lb' ? '/lb' : ''}</span>
									<span class="move" class:up={diff > 0}>
										{diff > 0 ? 'up' : 'down'} {step(Math.abs(diff))} from {storeName(change.before_store) ?? 'last time'}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty">Buy something twice and you'll see here whether it got cheaper.</p>
				{/if}
			</section>

			<section class="recent" aria-labelledby="recent-title">
				<div class="heading">
					<h2 id="recent-title">Recent receipts</h2>
					{#if data.recent.length}<a href="/receipts">All receipts</a>{/if}
				</div>
				{#if data.recent.length}
					<ul>
						{#each data.recent as receipt (receipt.id)}
							<li>
								<a href="/receipts/{receipt.id}">
									<span class="name">{storeName(receipt.store) ?? 'Store not printed'}</span>
									<span class="when">{shortDay(receipt.purchased_on)}{receipt.channel === 'delivery' ? ' · delivery' : ''}</span>
									<span class="price">{money(receipt.total_cents)}</span>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty">Your receipts show up here once they're read.</p>
				{/if}
			</section>
		</div>
	</main>
</AppShell>

<style>
	main {
		margin-top: 2rem;
	}

	h1 {
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 3vw, 2.4rem);
		font-weight: 650;
		font-synthesis: none;
		font-variation-settings: 'SOFT' 100;
		color: var(--color-ink);
	}

	.board {
		display: grid;
		gap: 1.25rem;
		margin-top: 1.5rem;
	}

	@media (min-width: 900px) {
		.board {
			grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
			grid-template-areas: 'add month' 'changes recent';
			gap: 1.5rem 2.5rem;
		}

		.add {
			grid-area: add;
		}

		.month {
			grid-area: month;
		}

		.changes {
			grid-area: changes;
		}

		.recent {
			grid-area: recent;
		}
	}

	h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-muted);
	}

	.add {
		display: grid;
		justify-items: center;
		align-content: center;
		gap: 0.4rem;
		min-height: 11rem;
		border: 1.5px dashed var(--color-line);
		border-radius: 1rem;
		background: var(--color-raised);
		padding: 1.5rem;
		text-align: center;
		transition: border-color 150ms, background-color 150ms;
	}

	@media (hover: hover) {
		.add:hover {
			border-color: var(--color-brand);
			background: var(--color-receipt);
		}
	}

	.add:focus-visible,
	li a:focus-visible,
	.heading a:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	.add svg {
		width: 2rem;
		height: 2rem;
		fill: none;
		stroke: var(--color-ink);
		stroke-width: 1.5;
		stroke-linejoin: round;
	}

	.add-title {
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.add-note {
		max-width: 26rem;
		font-size: 0.9rem;
		color: var(--color-muted);
	}

	.month {
		align-self: center;
	}

	.spent {
		margin-top: 0.25rem;
		font-family: var(--font-mono);
		font-size: clamp(2.6rem, 5vw, 3.5rem);
		font-weight: 700;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
	}

	.note,
	.empty {
		margin-top: 0.35rem;
		color: var(--color-muted);
	}

	.empty {
		font-size: 0.95rem;
	}

	ul {
		margin-top: 0.6rem;
		border-top: 1px solid var(--color-line);
	}

	li a {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.1rem 1rem;
		border-bottom: 1px solid var(--color-line);
		padding: 0.75rem 0.25rem;
		color: var(--color-ink);
	}

	@media (hover: hover) {
		li a:hover .name {
			text-decoration: underline;
			text-underline-offset: 3px;
		}
	}

	.name {
		font-weight: 550;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.price {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.move,
	.when {
		grid-column: 1;
		font-size: 0.85rem;
		color: var(--color-accent);
	}

	.move.up {
		color: var(--color-up);
	}

	.when {
		color: var(--color-muted);
	}

	.recent .price {
		grid-row: 1 / span 2;
		grid-column: 2;
		align-self: center;
	}

	.heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.heading a {
		font-size: 0.9rem;
		color: var(--color-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
