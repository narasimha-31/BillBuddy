<script lang="ts">
	import { money, shortDay, storeName } from '../../format';
	import AppShell from '../AppShell.svelte';
	import Trend from '../Trend.svelte';
	import ReceiptUploader from '../ReceiptUploader.svelte';
	import { spendBars, type Bar } from '../../spend';
	import { invalidateAll } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { announce, readReceipt } from '../receipts/reading';
	import { toast } from '../../toasts.svelte';

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
	// receipts uploaded but never read (the page was left mid-way, or reading failed); read them right here
	let rereading = $state(false);
	async function readUnread() {
		rereading = true;
		try {
			// a read that worked shows up in the lists; ones that failed would vanish without a word, so they are
			// told in one popup, not one each
			const outcomes = await Promise.all(data.unread.map(async (id) => ({ id, outcome: await readReceipt(id) })));
			const failed = outcomes.filter(({ outcome }) => outcome.state === 'failed' || outcome.state === 'paused');
			if (failed.length === 1) announce(failed[0].id, failed[0].outcome);
			else if (failed.length > 1)
				toast({ key: 'unread', kind: 'error', text: `${failed.length} receipts couldn't be read.`, action: { label: 'Try again', run: readUnread } });
		} finally {
			rereading = false;
		}
		await invalidateAll();
	}

	const SHOWN_CHANGES = 3;
	let allChanges = $state(false);
	let opened = $state<string | null>(null);
	const still = $derived(prefersReducedMotion.current);
</script>

<svelte:head>
	<title>Home · BillBuddy</title>
</svelte:head>

<AppShell fit firstName={data.firstName}>
	<main>
		<h1 class="large-title">{data.firstName ? `Hi ${data.firstName}` : 'Your groceries'}</h1>

		{#if data.unread.length}
			<p class="unread surface" aria-live="polite">
				<span>{data.unread.length === 1 ? '1 receipt wasn’t read' : `${data.unread.length} receipts weren’t read`}</span>
				<button type="button" class="small-button" disabled={rereading} onclick={readUnread}>{rereading ? 'Reading…' : data.unread.length === 1 ? 'Read it now' : 'Read them now'}</button>
			</p>
		{/if}

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
						{plural(chosen.receipts, 'receipt')}{#if chosen.ids.length === 1}{' · '}<a href="/receipts/{chosen.ids[0]}">Open it</a>{:else if chosen.receipts}{' · '}<a href="/receipts?from={chosen.from}&to={chosen.to}">See them</a>{/if}
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
								<span class="col">
									{#if bar.cents}<span class="cap">${Math.round(bar.cents / 100)}</span>{/if}
									<span class="bar" style:--size={bar.cents / tallest} style:--i={i}></span>
								</span>
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
								{@const per = change.per === 'lb' ? '/lb' : ''}
								{@const back = `from=${encodeURIComponent(change.name)}`}
								<li>
									<button type="button" class="row" aria-expanded={opened === change.name} onclick={() => (opened = opened === change.name ? null : change.name)}>
										<span class="row-title">{change.name}</span>
										<span class="row-value">{money(change.now_cents)}{per}</span>
										<span class="row-sub move" class:up={diff > 0} class:down={diff < 0}>
											<Trend up={diff > 0} />{money(change.before_cents)} at {storeName(change.before_store) ?? 'last time'} → {money(change.now_cents)} at {storeName(change.store) ?? 'an unknown store'} · {shortDay(change.bought_on)} · {diff > 0 ? 'up' : 'down'} {step(Math.abs(diff))}
										</span>
									</button>
									{#if opened === change.name}
										<!-- the two purchases behind the change, each opening the receipt line it came from -->
										<div class="both" transition:slide={{ duration: still ? 0 : 200 }}>
											<a href="/receipts/{change.now_receipt}?{back}#line-{change.now_item}">
												<span>{shortDay(change.bought_on)} · {storeName(change.store) ?? 'Unknown store'}</span>
												<span class="paid">{money(change.now_cents)}{per}</span>
											</a>
											<a href="/receipts/{change.before_receipt}?{back}#line-{change.before_item}">
												<span>{shortDay(change.before_on)} · {storeName(change.before_store) ?? 'Unknown store'}</span>
												<span class="paid">{money(change.before_cents)}{per}</span>
											</a>
											<a class="history" href="/prices?item={encodeURIComponent(change.name)}">Full price history</a>
										</div>
									{/if}
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

		<!-- on a phone Settings is otherwise only behind the avatar -->
		<ul class="group settings">
			<li><a class="row" href="/settings"><span class="row-title">Settings</span></a></li>
		</ul>
	</main>
</AppShell>

<style>
	.unread {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1rem;
		padding: 0.75rem 0.85rem 0.75rem 1.1rem;
		font-size: 0.9375rem;
		color: var(--color-ink);
	}

	.small-button {
		flex: none;
		min-height: 2.25rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		padding: 0.35rem 0.95rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-accent);
		transition: transform var(--standard) var(--ease);
	}

	.small-button:active {
		transform: scale(0.96);
		transition-duration: var(--quick);
	}

	.small-button:disabled {
		opacity: 0.6;
	}

	@media (pointer: coarse) {
		.small-button {
			min-height: 2.75rem;
		}
	}

	.settings {
		display: none;
	}

	@media (max-width: 640px) {
		.settings {
			display: block;
			margin-top: 1.75rem;
		}
	}

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
		justify-items: center;
		gap: 0.35rem;
		width: 100%;
		border-radius: 8px;
		-webkit-tap-highlight-color: transparent;
	}

	/* each bar stands on one shared baseline; an empty period is just the baseline, never a stub */
	.col {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		width: calc(100% + 0.3rem);
		height: 5.75rem;
		border-bottom: 1px solid rgb(60 60 67 / 0.18);
	}

	.bar {
		width: 100%;
		max-width: 1.5rem;
		height: calc(4.5rem * var(--size));
		border-radius: 4px 4px 0 0;
		background: rgb(118 118 128 / 0.24);
		transform-origin: bottom;
		transition:
			height var(--slow) var(--ease),
			background-color var(--quick) var(--ease),
			transform var(--slow) var(--ease) calc(var(--i) * 25ms);
	}

	/* switching weeks and months grows the new bars up from the baseline, left to right */
	@starting-style {
		.bar {
			transform: scaleY(0);
		}
	}

	.bars button:active .bar {
		transform: scaleY(0.94);
		transition-delay: 0ms;
		transition-duration: var(--quick);
	}

	.bars .on .bar {
		background: var(--color-accent);
	}

	/* every amount is readable without a tap; the highlighted one is bold */
	.cap {
		margin-bottom: 0.25rem;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--color-muted);
	}

	.on .cap {
		font-weight: 600;
		color: var(--color-ink);
	}

	@media (hover: hover) {
		.bars button:not(.on):hover .bar {
			background: rgb(118 118 128 / 0.4);
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

		@starting-style {
			.bar {
				transform: none;
			}
		}

		.bars button:active .bar {
			transform: none;
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

	.both {
		display: grid;
		margin: -0.25rem 1rem 0;
		padding-bottom: 0.6rem;
	}

	.both a {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		min-height: 2.75rem;
		align-items: center;
		border-top: 1px solid rgb(60 60 67 / 0.1);
		font-size: 0.875rem;
		color: var(--color-ink);
	}

	.both .paid {
		font-variant-numeric: tabular-nums;
	}

	.both .history {
		color: var(--color-accent);
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
