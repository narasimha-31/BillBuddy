<script lang="ts">
	import { money, storeName } from '../../../format';
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
		<a href="/receipts" class="back">Receipts</a>

		<div class="layout">
			<section class="summary surface" aria-labelledby="store">
				<h1 class="large-title" id="store">{store}</h1>
				{#if r.store_address}<p class="address">{r.store_address}</p>{/if}
				<p class="meta">
					<label>
						<span class="visually-hidden">Date bought</span>
						<input class="date" type="date" name="purchased_on" form="confirm" value={r.purchased_on ?? ''} max={new Date().toISOString().slice(0, 10)} />
					</label>
					{channels[r.channel ?? ''] ? ` · ${channels[r.channel ?? '']}` : ''}
				</p>
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
					<button form="confirm" class="pill-button">{r.status === 'review' ? 'Looks right' : 'Save changes'}</button>
					<form method="POST" action="?/delete">
						<button class="quiet" onclick={(e) => !confirm('Delete this receipt? This cannot be undone.') && e.preventDefault()}>
							Delete receipt
						</button>
					</form>
				</div>
			</section>

			<div class="sheet">
				<form method="POST" action="?/confirm" id="confirm" class="receipt surface">
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
									<div class="line-row">
										<span class="savings">Savings</span>
										<span class="price">{money(item.total_cents)}</span>
									</div>
								{:else}
									<div class="line-row">
										<input
											name="name_{item.id}"
											value={item.name ?? ''}
											placeholder={item.raw_text}
											aria-label="Name for {item.raw_text}"
											maxlength="120"
										/>
										<span class="price">{money(item.total_cents)}</span>
									</div>
									<div class="line-row small">
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
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 1.0625rem;
		color: var(--color-accent);
	}

	.back::before {
		content: '';
		width: 0.55rem;
		height: 0.55rem;
		border-bottom: 2px solid currentColor;
		border-left: 2px solid currentColor;
		transform: rotate(45deg);
	}

	.back:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	.layout {
		display: grid;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	/* the receipt takes the room; the summary and its buttons stay in view beside it */
	@media (min-width: 960px) {
		.layout {
			grid-template-columns: minmax(0, 40rem) minmax(18rem, 24rem);
			align-items: start;
			gap: 2rem;
		}

		.summary {
			position: sticky;
			top: 5rem;
			order: 2;
		}
	}

	.summary {
		padding: 1.4rem 1.5rem;
	}

	.address {
		margin-top: 0.3rem;
		font-size: 0.9375rem;
		color: var(--color-muted);
	}

	.meta {
		margin-top: 0.3rem;
		color: var(--color-muted);
	}

	/* the date reads as plain text until it is clicked to fix it */
	.date {
		margin-left: -0.35rem;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		padding: 0.15rem 0.35rem;
		font: inherit;
		color: inherit;
	}

	.date:hover,
	.date:focus {
		border-color: var(--color-line);
		outline: none;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.total {
		margin-top: 0.75rem;
		font-family: var(--font-display);
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-ink);
	}

	.checks {
		display: grid;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.checks p {
		font-size: 0.9375rem;
		line-height: 1.45;
	}

	.good {
		font-weight: 600;
		color: var(--color-accent);
	}

	.warn {
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-up) 8%, transparent);
		padding: 0.6rem 0.75rem;
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

	.quiet {
		font-size: 0.9375rem;
		color: var(--color-up);
	}

	.quiet:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
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

		.sheet {
			order: 2;
		}

		.actions {
			position: sticky;
			bottom: 0;
			z-index: 5;
			order: 3;
			margin-inline: -1.25rem;
			background: color-mix(in srgb, var(--color-raised) 96%, transparent);
			box-shadow: 0 -1px 0 rgb(0 0 0 / 0.08);
			padding: 0.85rem 1.25rem;
		}
	}

	/* above the tab bar on phones */
	@media (max-width: 640px) {
		.actions {
			bottom: calc(4.9rem + env(safe-area-inset-bottom));
		}
	}

	.receipt {
		padding: 1.1rem 1.25rem 1.25rem;
	}

	.receipt h2 {
		font-size: 1.0625rem;
		font-weight: 600;
	}

	.receipt h2.rest {
		margin-top: 1.75rem;
	}

	.hint {
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.lines {
		margin-top: 0.6rem;
	}

	.lines li {
		border-top: 1px solid rgb(60 60 67 / 0.12);
		padding: 0.7rem 0;
	}

	/* a guessed name or a line whose sums are off gets a soft tint, not a stripe */
	.lines li.guessed,
	.lines li.flagged {
		margin: 0 -0.6rem;
		border-radius: 10px;
		border-top-color: transparent;
		padding: 0.7rem 0.6rem;
	}

	.lines li.guessed {
		background: color-mix(in srgb, var(--color-accent) 7%, transparent);
	}

	.lines li.flagged {
		background: color-mix(in srgb, var(--color-up) 7%, transparent);
	}

	.lines li.guessed + li,
	.lines li.flagged + li {
		border-top-color: transparent;
	}

	.printed {
		font-size: 0.75rem;
		letter-spacing: 0.02em;
		color: var(--color-muted);
	}

	.line-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.2rem;
	}

	.line-row.small {
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	input,
	select {
		min-width: 0;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		color: var(--color-ink);
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
		font-weight: 400;
		color: var(--color-muted);
	}

	select {
		margin-left: -0.35rem;
		padding: 0.2rem 0.35rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	@media (hover: hover) {
		input:hover,
		select:hover {
			border-color: var(--color-line);
		}
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--color-accent);
		background: #fff;
	}

	.price,
	.amount,
	.sums dd {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.price {
		font-weight: 600;
	}

	.savings {
		font-weight: 600;
		color: var(--color-accent);
	}

	.issue {
		margin-top: 0.35rem;
		font-size: 0.875rem;
		color: var(--color-up);
	}

	.worked {
		margin-top: 0.3rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.sums {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem 1rem;
		margin-top: 0.75rem;
		border-top: 1px solid rgb(60 60 67 / 0.12);
		padding-top: 0.75rem;
		font-size: 0.9375rem;
	}

	.sums .grand {
		font-weight: 700;
	}
</style>
