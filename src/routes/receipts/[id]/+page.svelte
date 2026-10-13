<script lang="ts">
	import { longDay as day, money } from '../../../format';

	let { data, form } = $props();

	const channels: Record<string, string> = { in_store: 'In store', delivery: 'Delivery', pickup: 'Pickup', unknown: '' };

	const r = $derived(data.receipt);
	const allGood = $derived(data.math.lines_match_subtotal && data.math.totals_match !== false && !data.items.some((i) => i.issue));
	const subtotalPlusTax = $derived((r.subtotal_cents ?? 0) + (r.tax_cents ?? 0));
</script>

<svelte:head>
	<title>{r.store ?? 'Receipt'} · BillBuddy</title>
</svelte:head>

<div class="shell">
	<a href="/receipts" class="back">Back to receipts</a>

	<header class="summary">
		<div>
			<h1>{r.store ?? 'Receipt'}</h1>
			<p class="meta">{day(r.purchased_on)}{channels[r.channel ?? ''] ? ` · ${channels[r.channel ?? '']}` : ''}</p>
		</div>
		{#if r.total_cents !== null}<p class="total">{money(r.total_cents)}</p>{/if}
	</header>

	<div class="checks">
		{#if allGood}
			<p class="good">Everything adds up.</p>
		{:else}
			{#if data.math.expected === null}
				<p class="warn">We couldn't see the subtotal or total in the photo, so we can't double-check the items.</p>
			{:else if !data.math.lines_match_subtotal}
				<p class="warn">
					The items add up to {money(data.math.sum)}, but {r.subtotal_cents === null
						? `the total minus tax is ${money(data.math.expected)}`
						: `the receipt says ${money(data.math.expected)}`}. Check the lines below.
				</p>
			{/if}
			{#if data.math.totals_match === false}
				<p class="warn">Subtotal plus tax is {money(subtotalPlusTax)}, but the total says {money(r.total_cents)}.</p>
			{/if}
			{#if data.items.some((i) => i.issue)}
				<p class="warn">Some lines need a look. They're marked below.</p>
			{/if}
		{/if}
		{#if r.skipped_lines}
			<p class="note">{r.skipped_lines} {r.skipped_lines === 1 ? 'line was' : 'lines were'} skipped because {r.skipped_lines === 1 ? "it wasn't" : "they weren't"} a grocery item.</p>
		{/if}
	</div>

	{#if form?.problem}<p class="error" role="alert">{form.problem}</p>{/if}

	<form method="POST" action="?/confirm" id="confirm">
		<ul class="lines">
			{#each data.items as item (item.id)}
				<li class:flagged={item.issue}>
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
								placeholder="What is this item?"
								aria-label="Name for {item.raw_text}"
								maxlength="120"
								required
							/>
							<span class="price">{money(item.total_cents)}</span>
						</div>
						<div class="row small">
							<select name="category_{item.id}" aria-label="Category for {item.raw_text}">
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
							<p class="issue">{item.unit === 'ea' ? 'The quantity' : 'The weight'} times the price doesn't match the amount printed for this line.</p>
						{:else if item.issue === 'unreadable'}
							<p class="issue">We couldn't tell what this is. Add a name and we'll remember it next time.</p>
						{/if}
						{#if item.computed}
							<p class="hint">No amount was printed, so we worked it out from the weight and price.</p>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	</form>

	<div class="actions">
		<button form="confirm" class="primary">Looks right</button>
		<form method="POST" action="?/delete">
			<button class="quiet" onclick={(e) => !confirm('Delete this receipt? This cannot be undone.') && e.preventDefault()}>
				Delete receipt
			</button>
		</form>
	</div>
</div>

<style>
	.shell {
		margin: 0 auto;
		max-width: 46rem;
		padding: 1.5rem 1.25rem 4rem;
	}

	.back {
		display: inline-block;
		border: 1px solid rgb(43 38 32 / 0.3);
		border-radius: 999px;
		padding: 0.45rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-ink);
	}

	.summary {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.5rem;
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
		font-family: var(--font-mono);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-ink);
	}

	.checks {
		display: grid;
		gap: 0.5rem;
		margin-top: 1.25rem;
	}

	.checks p {
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		font-size: 0.95rem;
	}

	.good {
		background: rgb(71 106 80 / 0.15);
		color: var(--color-accent);
		font-weight: 600;
	}

	.warn {
		background: rgb(253 251 245 / 0.65);
		color: var(--color-ink);
	}

	.note {
		background: transparent;
		color: var(--color-muted);
	}

	.error {
		margin-top: 1rem;
		border-radius: 0.75rem;
		background: rgb(253 251 245 / 0.8);
		padding: 0.75rem 1rem;
		color: var(--color-up);
		font-weight: 600;
	}

	.lines {
		display: grid;
		gap: 0.6rem;
		margin-top: 1.5rem;
	}

	.lines li {
		border-radius: 0.875rem;
		background: var(--color-receipt);
		padding: 0.9rem 1rem;
		color: var(--color-receipt-ink);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
	}

	.lines li.flagged {
		box-shadow:
			0 0 0 2px rgb(148 69 42 / 0.45),
			0 1px 2px rgb(0 0 0 / 0.06);
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
		margin-top: 0.4rem;
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

	input {
		flex: 1;
		padding: 0.35rem 0.5rem;
		margin-left: -0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	select {
		padding: 0.2rem 0.35rem;
		margin-left: -0.35rem;
		font-size: 0.85rem;
		color: var(--color-receipt-muted);
	}

	input:hover,
	select:hover {
		border-color: var(--color-receipt-line);
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--color-accent);
		background: rgb(255 255 255 / 0.5);
	}

	.price {
		font-family: var(--font-mono);
		font-weight: 600;
		white-space: nowrap;
	}

	.savings {
		font-weight: 600;
		color: var(--color-receipt-down);
	}

	.amount {
		font-family: var(--font-mono);
		white-space: nowrap;
	}

	.issue {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: var(--color-receipt-up);
	}

	.hint {
		margin-top: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-receipt-muted);
	}

	/* stays in reach on long receipts; solid so it never smudges the line underneath */
	.actions {
		position: sticky;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.5rem;
		border-top: 1px dashed var(--color-line);
		padding: 0.9rem 0 calc(0.9rem + env(safe-area-inset-bottom));
		background: var(--color-bg);
	}

	.primary {
		border-radius: 999px;
		background: var(--color-ink);
		padding: 0.75rem 1.75rem;
		font-weight: 600;
		color: var(--color-receipt);
	}

	.quiet {
		color: var(--color-muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
