<script lang="ts">
	import { money, shortDay, storeName } from '../../format';
	import AppShell from '../AppShell.svelte';
	import Trend from '../Trend.svelte';
	import ReceiptUploader from '../ReceiptUploader.svelte';

	let { data } = $props();

	const monthName = $derived(new Date(`${data.month.start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }));

	const step = (cents: number) => (cents < 100 ? `${cents}¢` : money(cents));
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<svelte:head>
	<title>Home · BillBuddy</title>
</svelte:head>

<AppShell fit firstName={data.firstName}>
	<main>
		<h1 class="large-title">{data.firstName ? `Hi ${data.firstName}` : 'Your groceries'}</h1>

		<div class="board">
			<section class="add surface" aria-label="Add a receipt">
				<ReceiptUploader uploads={data.uploads} dailyLimit={data.dailyLimit} />
			</section>

			<section class="month surface" aria-labelledby="month-title">
				<h2 id="month-title">Spent in {monthName}</h2>
				<p class="spent">{money(data.month.spentCents)}</p>
				<p class="note">
					{#if data.month.receipts}
						{plural(data.month.receipts, 'receipt')} at {plural(data.month.stores, 'store')}
					{:else}
						No receipts dated this month yet
					{/if}
				</p>
			</section>

			<section class="changes" aria-labelledby="changes-title">
				<h2 class="list-label" id="changes-title">Prices since last time</h2>
				{#if data.changes.length}
					<div class="scroll-area">
						<ul class="group">
							{#each data.changes as change (change.name)}
								{@const diff = change.now_cents - change.before_cents}
								<li>
									<a class="row" href="/prices?item={encodeURIComponent(change.name)}">
										<span class="row-title">{change.name}</span>
										<span class="row-value">{money(change.now_cents)}{change.per === 'lb' ? '/lb' : ''}</span>
										<span class="row-sub move" class:up={diff > 0} class:down={diff < 0}>
											<Trend up={diff > 0} />{diff > 0 ? 'Up' : 'Down'} {step(Math.abs(diff))} from {storeName(change.before_store) ?? 'last time'}
										</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<p class="empty surface">Buy something twice and you’ll see here whether it got cheaper.</p>
				{/if}
			</section>

			<section class="recent" aria-labelledby="recent-title">
				<div class="list-label-row">
					<h2 class="list-label" id="recent-title">Recent receipts</h2>
					{#if data.recent.length}<a href="/receipts">See all</a>{/if}
				</div>
				{#if data.recent.length}
					<div class="scroll-area">
						<ul class="group">
							{#each data.recent as receipt (receipt.id)}
								<li>
									<a class="row" href="/receipts/{receipt.id}">
										<span class="row-title">{storeName(receipt.store) ?? 'Store not printed'}</span>
										<span class="row-value">{money(receipt.total_cents)}</span>
										<span class="row-sub">{shortDay(receipt.purchased_on)}{receipt.channel === 'delivery' ? ' · Delivery' : ''}</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<p class="empty surface">Your receipts show up here once they’re read.</p>
				{/if}
			</section>
		</div>
	</main>
</AppShell>

<style>
	.board {
		display: grid;
		gap: 1.75rem;
		margin-top: 1.25rem;
	}

	/* the same two columns as Receipts, so the drop zone has one size and place on both pages */
	@media (min-width: 1024px) {
		.board {
			grid-template-columns: minmax(0, 1fr) 22rem;
			grid-template-areas: 'add month' 'changes recent';
			gap: 1.75rem 2.5rem;
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

	.add {
		padding: 1rem;
	}

	.month {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 1.5rem 1.6rem;
	}

	.month h2 {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-muted);
	}

	.spent {
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: clamp(2.75rem, 4.5vw, 3.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1;
		color: var(--color-ink);
	}

	.note {
		margin-top: 0.6rem;
		color: var(--color-muted);
	}

	.move {
		color: var(--color-accent);
	}

	.move.up {
		color: var(--color-up);
	}

	.move.down {
		color: var(--color-cheaper);
	}

	.empty {
		padding: 1rem 1.1rem;
		font-size: 0.9375rem;
		color: var(--color-muted);
	}

	/* on a laptop the page is one screen tall; the two lists scroll inside their columns instead */
	@media (min-width: 1024px) and (min-height: 600px) {
		main {
			display: flex;
			flex: 1;
			flex-direction: column;
			min-height: 0;
		}

		.board {
			flex: 1;
			min-height: 0;
			grid-template-rows: auto minmax(0, 1fr);
		}

		.add {
			display: flex;
			flex-direction: column;
			max-height: 55dvh;
			min-height: 0;
		}

		.changes,
		.recent {
			display: flex;
			flex-direction: column;
			min-height: 0;
		}

		.changes .scroll-area,
		.recent .scroll-area {
			flex: 0 1 auto;
		}
	}
</style>
