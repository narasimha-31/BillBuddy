<script lang="ts">
	import { money, shortDay, storeName } from '../../format';
	import AppShell from '../AppShell.svelte';
	import Trend from '../Trend.svelte';
	import ReceiptUploader from '../ReceiptUploader.svelte';
	import { spendBars, type Bar } from '../../spend';
	import { invalidateAll } from '$app/navigation';
	import { changeLine, toneOf } from '../../price-change';
	import { slide } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { announce, readReceipt } from '../receipts/reading';
	import { toast } from '../../toasts.svelte';

	let { data } = $props();

	const monthName = $derived(new Date(`${data.month.start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }));

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

	// one tap on a bar shows that period in the big number; a second tap goes back to this month
	let by = $state<'week' | 'month'>('month');
	let picked = $state<number | null>(null);
	const bars = $derived(spendBars(data.spend.rows, by, data.spend.today));
	const tallest = $derived(Math.max(1, ...bars.map((b) => b.cents)));
	const periodName = (bar: Bar) =>
		by === 'month' ? new Date(`${bar.from}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }) : `Week of ${shortDay(bar.from)}`;
	// the highlighted period is the picked bar, or else this month (or this week), always compared with the one before
	const at = $derived(picked ?? bars.length - 1);
	const focus = $derived(bars[at]);
	const before = $derived(at > 0 ? bars[at - 1] : null);
	const delta = $derived(before && (focus.cents || before.cents) ? focus.cents - before.cents : null);
	const filled = $derived(bars.filter((b) => b.cents > 0));
	const average = $derived(filled.length > 1 ? Math.round(filled.reduce((sum, b) => sum + b.cents, 0) / filled.length) : null);
	const title = $derived(picked === null ? (by === 'month' ? `Spent in ${monthName}` : 'Spent this week') : periodName(focus));
	const versus = $derived(picked === null ? (by === 'month' ? 'last month' : 'last week') : by === 'month' ? 'the month before' : 'the week before');
	const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;
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

	// three on a phone; a laptop has room for six beside the spend card
	const SHOWN_CHANGES = 3;
	const WIDE_CHANGES = 6;
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
					<h2 id="month-title" aria-live="polite">{title}</h2>
					<div class="order" role="group" aria-label="Group spending by">
						<button type="button" aria-pressed={by === 'week'} onclick={() => show('week')}>Weeks</button>
						<button type="button" aria-pressed={by === 'month'} onclick={() => show('month')}>Months</button>
					</div>
				</div>
				<div class="headline">
					<p class="spent">{money(focus.cents)}</p>
					{#if delta}
						<!-- spending more is the red direction here -->
						<p class="delta" class:up={delta > 0} class:down={delta < 0}>
							<Trend up={delta > 0} />{dollars(Math.abs(delta))} {delta > 0 ? 'more' : 'less'} than {versus}
						</p>
					{/if}
				</div>
				<p class="note">
					{#if focus.receipts}
						{plural(focus.receipts, 'receipt')}{#if focus.ids.length === 1}{' · '}<a href="/receipts/{focus.ids[0]}">Open it</a>{:else}{' · '}<a href="/receipts?from={focus.from}&to={focus.to}">See them</a>{/if}
					{:else}
						Nothing dated {picked === null ? (by === 'month' ? 'this month' : 'this week') : 'then'} yet
					{/if}
				</p>
				<ul class="bars" class:weeks={by === 'week'}>
					{#each bars as bar, i (bar.from)}
						<li>
							<button
								type="button"
								class:on={i === at}
								aria-pressed={picked === i}
								aria-label="{periodName(bar)}: {money(bar.cents)}"
								onclick={() => (picked = picked === i ? null : i)}
							>
								<span class="col">
									{#if average}<span class="avg" style:--size={average / tallest} aria-hidden="true"></span>{/if}
									{#if bar.cents}<span class="cap">{dollars(bar.cents)}</span>{/if}
									<span class="bar" style:--size={bar.cents / tallest} style:--i={i}></span>
								</span>
								<!-- eight dates don't fit under eight thin bars: empty weeks drop every other date -->
								<span class="tick" class:hide={by === 'week' && !bar.cents && i !== at && i % 2 === 0}>{bar.label}</span>
							</button>
						</li>
					{/each}
				</ul>
				{#if average}<p class="legend"><span aria-hidden="true"></span>Average {by === 'month' ? 'month' : 'week'} with receipts · {dollars(average)}</p>{/if}
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
							{#each allChanges ? data.changes : data.changes.slice(0, WIDE_CHANGES) as change, i (change.name)}
								{@const per = change.per === 'lb' ? '/lb' : ''}
								{@const line = changeLine(change, per)}
								{@const back = `from=${encodeURIComponent(change.name)}`}
								<li class:extra={!allChanges && i >= SHOWN_CHANGES}>
									<button type="button" class="row" aria-expanded={opened === change.name} onclick={() => (opened = opened === change.name ? null : change.name)}>
										<span class="row-title">{change.name}</span>
										<span class="row-value">{money(change.now_cents)}{per}</span>
										<span class="row-sub move" class:up={line.tone === 'up'} class:down={line.tone === 'down'}>
											<Trend up={line.tone === 'up'} />{line.text}
										</span>
									</button>
									{#if opened === change.name}
										<!-- the last few purchases by date, lowest green and highest red, each opening its receipt line -->
										<div class="history" transition:slide={{ duration: still ? 0 : 200 }}>
											{#each change.history as paid (paid.item)}
												{@const tone = toneOf(change.history, paid.cents)}
												<a href="/receipts/{paid.receipt}?{back}#line-{paid.item}">
													<span class="when">{shortDay(paid.on)}</span>
													<span class="where">{storeName(paid.store) ?? 'Unknown store'}</span>
													<span class="paid" class:up={tone === 'up'} class:down={tone === 'down'}>{money(paid.cents)}{per}</span>
												</a>
											{/each}
											<a class="all" href="/prices?item={encodeURIComponent(change.name)}">Full price history</a>
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

	/* a 44px reach for the thumb without a bigger look */
	.order button {
		position: relative;
		border-radius: 7px;
		padding: 0.25rem 0.7rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-ink);
		transition:
			background-color var(--quick) var(--ease),
			box-shadow var(--quick) var(--ease);
	}

	.order button::after {
		content: '';
		position: absolute;
		inset: -8px 0;
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
		position: relative;
		width: calc(100% + 0.3rem);
		height: 5.75rem;
		border-bottom: 1px solid rgb(60 60 67 / 0.18);
	}

	/* the average runs across every column as one dashed line */
	.avg {
		position: absolute;
		inset: auto 0 calc(4.5rem * var(--size));
		border-top: 1.5px dashed rgb(60 60 67 / 0.4);
		pointer-events: none;
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

	/* the period in the big number stands out in ink; green and red stay for cheaper and more */
	.bars .on .bar {
		background: var(--color-ink);
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

	.weeks .tick {
		font-size: 0.6875rem;
	}

	.tick.hide {
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

	.headline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.75rem;
		margin-top: 0.35rem;
	}

	.delta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 999px;
		padding: 0.25rem 0.65rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.delta.up {
		background: color-mix(in srgb, var(--color-up) 10%, transparent);
		color: var(--color-up);
	}

	.delta.down {
		background: color-mix(in srgb, var(--color-cheaper) 10%, transparent);
		color: var(--color-cheaper);
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 0.7rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.legend span {
		width: 1.1rem;
		border-top: 1.5px dashed rgb(60 60 67 / 0.4);
	}

	.spent {
		font-family: var(--font-display);
		font-size: 3rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1;
		color: var(--color-ink);
	}

	.note {
		margin-top: 0.6rem;
		color: var(--color-muted);
	}

	.extra {
		display: none;
	}

	@media (min-width: 1024px) {
		.extra {
			display: block;
		}
	}

	.history {
		display: grid;
		margin: -0.25rem 1rem 0;
		padding-bottom: 0.5rem;
	}

	.history a {
		display: grid;
		grid-template-columns: 3.25rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		min-height: 2.75rem;
		border-top: 1px solid rgb(60 60 67 / 0.1);
		font-size: 0.875rem;
		color: var(--color-ink);
	}

	.history .when {
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
	}

	.history .where {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.history .paid {
		font-variant-numeric: tabular-nums;
	}

	.history .paid.down {
		font-weight: 600;
		color: var(--color-cheaper);
	}

	.history .paid.up {
		color: var(--color-up);
	}

	.history .all {
		display: flex;
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
