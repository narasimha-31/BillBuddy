<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { money, shortDay, storeName } from '../../format';
	import AppShell from '../AppShell.svelte';
	import ReceiptUploader from '../ReceiptUploader.svelte';

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
			<div class="add">
				<ReceiptUploader uploads={data.uploads} dailyLimit={data.dailyLimit} />
			</div>

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
		font-size: 1.75rem;
		font-weight: 600;
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

	li a:focus-visible,
	.heading a:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	.month {
		align-self: start;
	}

	@media (min-width: 900px) {
		.month {
			padding-top: 2.5rem;
		}
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
