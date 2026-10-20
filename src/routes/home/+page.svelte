<script lang="ts">
	import { money, shortDay, storeName } from '../../format';
	import AppShell from '../AppShell.svelte';
	import Trend from '../Trend.svelte';
	import ReceiptUploader from '../ReceiptUploader.svelte';
	import { spendBars, type Bar } from '../../spend';

	let { data } = $props();

	const monthName = $derived(new Date(`${data.month.start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }));

	const step = (cents: number) => (cents < 100 ? `${cents}¢` : money(cents));
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

	// one tap on a bar shows that period in the big number; a second tap goes back to this month
	let by = $state<'week' | 'month'>('month');
	let picked = $state<number | null>(null);
	const bars = $derived(spendBars(data.spend.rows, by, data.spend.today));
	const tallest = $derived(Math.max(1, ...bars.map((b) => b.cents)));
	const chosen = $derived(picked === null ? null : bars[picked]);
	const lastMonth = $derived(spendBars(data.spend.rows, 'month', data.spend.today)[4].cents);
	const periodName = (bar: Bar) =>
		by === 'month' ? new Date(`${bar.from}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }) : `Week of ${shortDay(bar.from)}`;
	const show = (next: 'week' | 'month') => {
		by = next;
		picked = null;
	};
	const SHOWN_CHANGES = 3;
	let allChanges = $state(false);
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
				<div class="month-head">
					<h2 id="month-title">{chosen ? periodName(chosen) : `Spent in ${monthName}`}</h2>
					<div class="order" role="group" aria-label="Group spending by">
						<button type="button" aria-pressed={by === 'week'} onclick={() => show('week')}>Weeks</button>
						<button type="button" aria-pressed={by === 'month'} onclick={() => show('month')}>Months</button>
					</div>
				</div>
				<p class="spent">{money(chosen ? chosen.cents : data.month.spentCents)}</p>
				<p class="note">
					{#if chosen}
						{plural(chosen.receipts, 'receipt')}{#if chosen.receipts}{' · '}<a href="/receipts?from={chosen.from}&to={chosen.to}">See receipts</a>{/if}
					{:else}
						{data.month.receipts ? `${plural(data.month.receipts, 'receipt')} at ${plural(data.month.stores, 'store')}` : 'Nothing dated this month yet'}{lastMonth ? ` · last month ${money(lastMonth)}` : ''}
					{/if}
				</p>
				<ul class="bars" class:weeks={by === 'week'}>
					{#each bars as bar, i (bar.from)}
						<li>
							<button
								type="button"
								class:on={i === (picked ?? bars.length - 1)}
								aria-pressed={picked === i}
								aria-label="{periodName(bar)}: {money(bar.cents)}"
								onclick={() => (picked = picked === i ? null : i)}
							>
								<span class="bar" style:--size={bar.cents / tallest}></span>
								<span class="tick">{bar.label}</span>
							</button>
						</li>
					{/each}
				</ul>
				{#if data.spend.undated}
					<p class="undated">{plural(data.spend.undated, 'receipt')} with no date {data.spend.undated === 1 ? 'is' : 'are'} left out</p>
				{/if}
			</section>

			<section class="changes" aria-labelledby="changes-title">
				<div class="list-label-row">
					<h2 class="list-label" id="changes-title">Prices since last time</h2>
					{#if data.changes.length > SHOWN_CHANGES}
						<button type="button" onclick={() => (allChanges = !allChanges)}>{allChanges ? 'Show fewer' : `Show all ${data.changes.length}`}</button>
					{/if}
				</div>
				{#if data.changes.length}
					<div class="scroll-area">
						<ul class="group">
							{#each allChanges ? data.changes : data.changes.slice(0, SHOWN_CHANGES) as change (change.name)}
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
			grid-template-areas: 'add month' 'changes month' 'changes recent';
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
		align-self: start;
		padding: 1rem;
	}

	.month {
		display: flex;
		flex-direction: column;
		padding: 1.25rem 1.4rem 1.1rem;
	}

	.month-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	/* the same small segmented control as the sort on Prices */
	.order {
		display: inline-grid;
		flex: none;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		border-radius: 9px;
		background: rgb(118 118 128 / 0.12);
		padding: 2px;
	}

	.order button {
		border-radius: 7px;
		padding: 0.25rem 0.7rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-ink);
		transition:
			background-color var(--quick) var(--ease),
			box-shadow var(--quick) var(--ease);
	}

	.order button[aria-pressed='true'] {
		background: #fff;
		box-shadow:
			0 3px 8px rgb(0 0 0 / 0.12),
			0 3px 1px rgb(0 0 0 / 0.04);
	}

	.note a {
		color: var(--color-accent);
	}

	.bars {
		display: flex;
		gap: 0.3rem;
		margin-top: 1rem;
	}

	.bars li {
		flex: 1;
		min-width: 0;
	}

	.bars button {
		display: grid;
		grid-template-rows: 4.75rem auto;
		justify-items: center;
		gap: 0.3rem;
		width: 100%;
		border-radius: 8px;
		padding-top: 0.25rem;
		-webkit-tap-highlight-color: transparent;
	}

	.bar {
		align-self: end;
		width: 100%;
		max-width: 2rem;
		height: calc(0.25rem + 4.5rem * var(--size));
		border-radius: 5px;
		background: rgb(118 118 128 / 0.22);
		transition:
			height var(--slow) var(--ease),
			background-color var(--quick) var(--ease);
	}

	.bars .on .bar {
		background: var(--color-accent);
	}

	@media (hover: hover) {
		.bars button:not(.on):hover .bar {
			background: rgb(118 118 128 / 0.36);
		}
	}

	.bars button:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.tick {
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
	}

	/* eight dates don't fit under eight thin bars: every other one; the heading names a picked week */
	.weeks li:nth-child(odd) .tick {
		visibility: hidden;
	}

	.on .tick {
		font-weight: 600;
		color: var(--color-ink);
	}

	.undated {
		margin-top: 0.6rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
	}

	.month h2 {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-muted);
	}

	.spent {
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 4vw, 3.25rem);
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
			grid-template-rows: auto auto minmax(0, 1fr);
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
