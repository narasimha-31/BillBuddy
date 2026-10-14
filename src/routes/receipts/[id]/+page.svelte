<script lang="ts">
	import { longDay as day, money, storeName } from '../../../format';
	import AppShell from '../../AppShell.svelte';

	let { data, form } = $props();

	const channels: Record<string, string> = { in_store: 'In store', delivery: 'Delivery', pickup: 'Pickup', unknown: '' };

	const r = $derived(data.receipt);
	const store = $derived(storeName(r.store) ?? 'Receipt');
	const offLines = $derived(data.items.some((i) => i.issue === 'line_math'));
	const allGood = $derived(data.math.lines_match_subtotal && data.math.totals_match !== false && !offLines);
	// names BillBuddy guessed come first, so they can be checked without hunting down the receipt
	const toCheck = $derived(data.items.filter((i) => i.issue === 'unsure' || i.issue === 'unreadable'));
	const rest = $derived(data.items.filter((i) => i.issue !== 'unsure' && i.issue !== 'unreadable'));
	const subtotalPlusTax = $derived((r.subtotal_cents ?? 0) + (r.tax_cents ?? 0));
</script>

<svelte:head>
	<title>{store} · BillBuddy</title>
</svelte:head>

<AppShell firstName={data.firstName}>
	<main>
		<a href="/receipts" class="back">All receipts</a>

		<div class="layout">
			<section class="summary" aria-labelledby="store">
				<h1 id="store">{store}</h1>
				<p class="meta">{day(r.purchased_on)}{channels[r.channel ?? ''] ? ` · ${channels[r.channel ?? '']}` : ''}</p>
				{#if r.total_cents !== null}<p class="total">{money(r.total_cents)}</p>{/if}

				<div class="checks">
					{#if allGood}
						<p class="good">Everything adds up.</p>
					{:else}
						{#if data.math.expected === null}
							<p class="warn">The subtotal and total weren't in the photo, so the items can't be checked against them.</p>
						{:else if !data.math.lines_match_subtotal}
							<p class="warn">
								The items add up to {money(data.math.sum)}, but {r.subtotal_cents === null
									? `the total minus tax is ${money(data.math.expected)}`
									: `the receipt says ${money(data.math.expected)}`}.
							</p>
						{/if}
						{#if data.math.totals_match === false}
							<p class="warn">Subtotal plus tax is {money(subtotalPlusTax)}, but the total says {money(r.total_cents)}.</p>
						{/if}
						{#if offLines}
							<p class="warn">The marked lines don't add up on their own.</p>
						{/if}
					{/if}
					{#if toCheck.length}
						<p class="warn">
							BillBuddy wasn't sure about {toCheck.length === 1 ? '1 name' : `${toCheck.length} names`}. {toCheck.length === 1
								? "It's"
								: "They're"} at the top of the receipt.
						</p>
					{/if}
					{#if r.skipped_lines}
						<p class="note">
							{r.skipped_lines}
							{r.skipped_lines === 1 ? 'line was' : 'lines were'} left out because {r.skipped_lines === 1 ? "it wasn't" : "they weren't"} a grocery item.
						</p>
					{/if}
				</div>

				{#if form?.problem}<p class="error" role="alert">{form.problem}</p>{/if}

				<div class="actions">
					<button form="confirm" class="primary">{r.status === 'review' ? 'Looks right' : 'Save changes'}</button>
					<form method="POST" action="?/delete">
						<button class="quiet" onclick={(e) => !confirm('Delete this receipt? This cannot be undone.') && e.preventDefault()}>
							Delete receipt
						</button>
					</form>
				</div>
			</section>

			<div class="paper-shadow">
				<form method="POST" action="?/confirm" id="confirm" class="receipt torn">
					{#if toCheck.length}
						<h2>Check these names</h2>
						<p class="hint">BillBuddy guessed these. Fix any that are wrong and it remembers next time.</p>
						<ul class="lines">
							{#each toCheck as item (item.id)}{@render line(item)}{/each}
						</ul>
						<h2 class="rest">The rest of the receipt</h2>
					{:else}
						<p class="hint">Tap a name or aisle to change it. BillBuddy uses your names from then on.</p>
					{/if}
					<ul class="lines">
						{#each rest as item (item.id)}{@render line(item)}{/each}
					</ul>

					{#snippet line(item: (typeof data.items)[number])}
							<li class:flagged={item.issue === 'line_math'} class:guessed={item.issue === 'unsure' || item.issue === 'unreadable'}>
								<p class="printed">{item.raw_text}</p>
								{#if item.kind === 'discount'}
									<div class="row">
										<span class="savings">Savings</span>
										<span class="price">{money(item.total_cents)}</span>
									</div>
								{:else}
									<div class="row">
										<input
											name="name_{item.id}"
											value={item.name ?? ''}
											placeholder={item.raw_text}
											aria-label="Name for {item.raw_text}"
											maxlength="120"
										/>
										<span class="price">{money(item.total_cents)}</span>
									</div>
									<div class="row small">
										<select name="category_{item.id}" aria-label="Aisle for {item.raw_text}">
											{#each data.categories as category (category)}
												<option value={category} selected={(item.category ?? 'Other') === category}>{category}</option>
											{/each}
										</select>
										<span class="amount">
											{#if item.unit === 'lb' && item.unit_price_cents !== null}
												{item.quantity} lb × {money(item.unit_price_cents)}/lb
											{:else if item.quantity !== 1}
												{item.quantity} {item.unit}
											{/if}
										</span>
									</div>
									{#if item.issue === 'line_math'}
										<p class="issue">{item.unit === 'ea' ? 'The count' : 'The weight'} times the price doesn't match the amount printed.</p>
									{/if}
									{#if item.computed}
										<p class="worked">No amount was printed, so it was worked out from the weight and price.</p>
									{/if}
								{/if}
							</li>
					{/snippet}
					{#if r.subtotal_cents !== null || r.tax_cents !== null}
						<dl class="sums">
							{#if r.subtotal_cents !== null}<dt>Subtotal</dt><dd>{money(r.subtotal_cents)}</dd>{/if}
							{#if r.tax_cents !== null}<dt>Tax</dt><dd>{money(r.tax_cents)}</dd>{/if}
							{#if r.total_cents !== null}<dt class="grand">Total</dt><dd class="grand">{money(r.total_cents)}</dd>{/if}
						</dl>
					{/if}
				</form>
			</div>
		</div>
	</main>
</AppShell>

<style>
	main {
		margin-top: 1.5rem;
	}

	.back {
		font-size: 0.9rem;
		color: var(--color-muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.layout {
		display: grid;
		gap: 2rem;
		margin-top: 1rem;
	}

	/* the receipt takes the room; the summary and its buttons stay in view beside it */
	@media (min-width: 960px) {
		.layout {
			grid-template-columns: minmax(0, 40rem) minmax(18rem, 24rem);
			align-items: start;
			gap: 3rem;
		}

		.summary {
			position: sticky;
			top: 1.5rem;
			order: 2;
		}
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.meta {
		margin-top: 0.25rem;
		color: var(--color-muted);
	}

	.total {
		margin-top: 0.75rem;
		font-family: var(--font-mono);
		font-size: 2.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
	}

	.checks {
		display: grid;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.checks p {
		font-size: 0.95rem;
	}

	.good {
		font-weight: 600;
		color: var(--color-accent);
	}

	.warn {
		border-left: 3px solid var(--color-up);
		padding-left: 0.75rem;
		color: var(--color-ink);
	}

	.note {
		color: var(--color-muted);
	}

	.error {
		margin-top: 1rem;
		font-weight: 600;
		color: var(--color-up);
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	/* one column: summary, then the receipt, then the buttons, which stay in reach on long receipts */
	@media (max-width: 959px) {
		.layout {
			display: flex;
			flex-direction: column;
		}

		.summary {
			display: contents;
		}

		.paper-shadow {
			order: 2;
		}

		.actions {
			position: sticky;
			bottom: 0;
			z-index: 5;
			order: 3;
			border-top: 1px solid var(--color-line);
			background: var(--color-bg);
			padding: 0.85rem 0;
		}
	}

	/* above the tab bar on phones */
	@media (max-width: 640px) {
		.actions {
			bottom: calc(3.7rem + env(safe-area-inset-bottom));
		}
	}

	.primary {
		border-radius: 999px;
		background: var(--color-ink);
		padding: 0.7rem 1.6rem;
		font-weight: 600;
		color: var(--color-on-ink);
	}

	.quiet {
		font-size: 0.9rem;
		color: var(--color-muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.primary:focus-visible,
	.quiet:focus-visible,
	.back:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	.paper-shadow {
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.08)) drop-shadow(0 10px 18px rgb(0 0 0 / 0.12));
	}

	.receipt {
		background: var(--color-receipt);
		padding: 1.25rem 1.25rem 2rem;
		color: var(--color-receipt-ink);
	}

	.hint {
		font-size: 0.85rem;
		color: var(--color-receipt-muted);
	}

	.lines {
		margin-top: 0.75rem;
		border-top: 1px dashed var(--color-receipt-line);
	}

	.lines li {
		border-bottom: 1px dashed var(--color-receipt-line);
		padding: 0.75rem 0;
	}

	.receipt h2 {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.receipt h2.rest {
		margin-top: 1.75rem;
	}

	.lines li.guessed {
		border-left: 3px solid var(--color-brand);
		padding-left: 0.75rem;
	}

	.lines li.flagged {
		border-left: 3px solid var(--color-receipt-up);
		padding-left: 0.75rem;
	}

	.printed {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-receipt-muted);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.3rem;
	}

	.row.small {
		font-size: 0.85rem;
		color: var(--color-receipt-muted);
	}

	input,
	select {
		min-width: 0;
		border: 1px solid transparent;
		border-radius: 0.5rem;
		background: transparent;
		color: var(--color-receipt-ink);
	}

	/* 16px text: iOS Safari zooms the page on any smaller input */
	input {
		flex: 1;
		margin-left: -0.5rem;
		padding: 0.3rem 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	input::placeholder {
		font-family: var(--font-mono);
		font-weight: 400;
		color: var(--color-receipt-muted);
	}

	select {
		margin-left: -0.35rem;
		padding: 0.2rem 0.35rem;
		font-size: 0.85rem;
		color: var(--color-receipt-muted);
	}

	@media (hover: hover) {
		input:hover,
		select:hover {
			border-color: var(--color-receipt-line);
		}
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--color-brand);
		background: var(--color-raised);
	}

	.price,
	.amount,
	.sums dd {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.price {
		font-weight: 600;
	}

	.savings {
		font-weight: 600;
		color: var(--color-receipt-down);
	}

	.issue {
		margin-top: 0.4rem;
		font-size: 0.85rem;
		color: var(--color-receipt-up);
	}

	.worked {
		margin-top: 0.35rem;
		font-size: 0.8rem;
		color: var(--color-receipt-muted);
	}

	.sums {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem 1rem;
		margin-top: 0.9rem;
		font-family: var(--font-mono);
		font-size: 0.9rem;
	}

	.sums .grand {
		font-weight: 700;
	}
</style>
