<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { money, shortDay, storeName } from '../../format';
	import AppShell from '../AppShell.svelte';
	import ReceiptUploader from '../ReceiptUploader.svelte';
	import { post, problems, readReceipt } from './reading';

	let { data } = $props();

	let uploader: ReceiptUploader;
	let reading = $state<string[]>([]);
	const busy = (id: string, on: boolean) => (reading = on ? [...reading, id] : reading.filter((r) => r !== id));

	// receipts sent from a phone arrive as pending rows; this page checks for them and reads each once
	let phone = $state<{ qr: string; expiresAt: string; since: string } | null>(null);
	let phoneExpired = $state(false);
	const handled = new Set<string>();
	let fromPhone = $state(0);
	const phoneUntil = $derived(
		phone ? new Date(phone.expiresAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
	);

	async function showPhoneCode() {
		const since = new Date().toISOString();
		const result = await post('phone', new FormData());
		if (result.type !== 'success' || !result.data) return;
		for (const r of data.receipts) handled.add(r.id);
		phoneExpired = false;
		fromPhone = 0;
		phone = { ...(result.data as { qr: string; expiresAt: string }), since };
	}

	$effect(() => {
		if (!phone) return;
		const { expiresAt, since } = phone;
		const timer = setInterval(async () => {
			await invalidateAll();
			const arrived = data.receipts.filter((r) => r.status === 'pending' && r.created_at >= since && !handled.has(r.id));
			for (const r of arrived) {
				handled.add(r.id);
				fromPhone++;
				await uploader.readArrived(r.id);
			}
			if (arrived.length) await invalidateAll();
			// one last check after the code expires, then stop
			if (Date.now() > Date.parse(expiresAt) + 5000) {
				clearInterval(timer);
				phone = null;
				phoneExpired = true;
			}
		}, 4000);
		return () => clearInterval(timer);
	});

	const review = $derived(data.receipts.filter((r) => r.status === 'review'));
	// a read that was cut off (the server stopped mid-way) can be started again after two minutes,
	// the same window the database uses before it lets another read claim the receipt
	const stillReading = (r: { status: string; processing_at: string | null }) =>
		r.status === 'processing' && r.processing_at !== null && Date.now() - Date.parse(r.processing_at) < 120_000;
	const waiting = $derived(data.receipts.filter((r) => ['pending', 'processing'].includes(r.status) || (r.status === 'failed' && r.problem === 'error')));
	const unreadable = $derived(data.receipts.filter((r) => r.status === 'failed' && r.problem !== 'error'));
	const saved = $derived(data.receipts.filter((r) => r.status === 'saved'));

	// read receipts by the month they were bought, newest first, each month with its total
	const months = $derived.by(() => {
		const groups = new Map<string, typeof saved>();
		const newest = [...saved].sort((a, b) => (b.purchased_on ?? '').localeCompare(a.purchased_on ?? ''));
		for (const r of newest) {
			const key = r.purchased_on?.slice(0, 7) ?? '';
			groups.set(key, [...(groups.get(key) ?? []), r]);
		}
		return [...groups].map(([key, receipts]) => ({
			key,
			label: key ? new Date(`${key}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'No date printed',
			receipts,
			totalCents: receipts.reduce((sum, r) => sum + (r.total_cents ?? 0), 0)
		}));
	});

	async function readAgain(id: string) {
		busy(id, true);
		try {
			await readReceipt(id);
		} finally {
			busy(id, false);
		}
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Receipts · BillBuddy</title>
</svelte:head>

<AppShell fit firstName={data.firstName}>

	<div class="columns">
		<main>
			<h1>Receipts</h1>

			<div class="scroll">
				<ReceiptUploader bind:this={uploader} today={data.today} dailyLimit={data.dailyLimit} onreading={busy} />

				{#if review.length}
					<section>
						<h2>Needs a quick look</h2>
						<ul class="list">
							{#each review as receipt (receipt.id)}
								<li>
									<a href="/receipts/{receipt.id}" class="open">
										<span class="paper-icon" aria-hidden="true"></span>
										<span class="who">
											<span class="store">{storeName(receipt.store) ?? 'Store not printed'}</span>
											<span class="when">{shortDay(receipt.purchased_on)}</span>
										</span>
										<span class="status">Check the amounts</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if waiting.length}
					<section>
						<h2>Waiting to be read</h2>
						<ul class="list">
							{#each waiting as receipt (receipt.id)}
								<li>
									<span class="paper-icon" aria-hidden="true"></span>
									<span>Receipt photo</span>
									{#if reading.includes(receipt.id) || stillReading(receipt)}
										<span class="status">reading</span>
									{:else}
										<button class="read-now" onclick={() => readAgain(receipt.id)}>Read now</button>
									{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if unreadable.length}
					<section>
						<h2>Couldn't read</h2>
						<ul class="list">
							{#each unreadable as receipt (receipt.id)}
								<li>
									<span class="paper-icon" aria-hidden="true"></span>
									<span>
										Receipt photo
										<span class="status reason">{problems[receipt.problem ?? ''] ?? "Couldn't be read."}</span>
									</span>
									<form method="POST" action="/receipts/{receipt.id}?/delete">
										<button class="remove" onclick={(e) => !confirm('Remove this receipt?') && e.preventDefault()}>Remove</button>
									</form>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if !data.receipts.length}
					<p class="empty">No receipts yet. Your first one takes a few seconds.</p>
				{/if}

				{#each months as month (month.key)}
					<section>
						<h2 class="month">{month.label}<span>{money(month.totalCents)}</span></h2>
						<ul class="list">
							{#each month.receipts as receipt (receipt.id)}
								<li>
									<a href="/receipts/{receipt.id}" class="open">
										<span class="paper-icon" aria-hidden="true"></span>
										<span class="who">
											<span class="store">{storeName(receipt.store) ?? 'Store not printed'}</span>
											<span class="when">{shortDay(receipt.purchased_on)}{receipt.channel === 'delivery' ? ' · delivery' : ''}</span>
										</span>
										<span class="amount">{money(receipt.total_cents)}</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		</main>

		<aside>
			<div class="card for-mouse phone">
				<h2>Use your phone</h2>
				{#if phone}
					<div class="code">
						<div class="qr" role="img" aria-label="QR code for adding receipts from your phone">{@html phone.qr}</div>
						<div>
							<p>Point your phone camera at the code. It works until {phoneUntil}.</p>
							{#if fromPhone}<p class="arrived">{fromPhone} {fromPhone === 1 ? 'receipt' : 'receipts'} received</p>{/if}
							<button class="link" onclick={() => (phone = null)}>Hide the code</button>
						</div>
					</div>
				{:else}
					<p>
						{phoneExpired
							? 'That code has expired. Make a new one any time.'
							: 'Snap receipts with your phone and they show up here.'}
					</p>
					<button class="pill" onclick={showPhoneCode}>Show a code</button>
				{/if}
			</div>
			<div class="card">
				<h2>Good photo, good reading</h2>
				<ul>
					<li>Lay it flat in good light.</li>
					<li>Fit the whole receipt in the frame.</li>
					<li>Smooth out folds, they hide prices.</li>
				</ul>
			</div>
			<div class="card">
				<h2>Your privacy</h2>
				<ul>
					<li>Card details are never saved.</li>
					<li>Photos are deleted once read.</li>
					<li>Location is removed on your device.</li>
				</ul>
				<a href="/privacy" class="link">The fine print</a>
			</div>
		</aside>
	</div>
</AppShell>

<style>
	.link {
		color: var(--color-muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.columns {
		display: grid;
		gap: 2.5rem;
		margin-top: 2rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.pill {
		border-radius: 999px;
		background: var(--color-ink);
		padding: 0.6rem 1.25rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-on-ink);
	}

	/* a phone can't scan a code shown on itself */
	@media (pointer: coarse) {
		.for-mouse {
			display: none;
		}
	}

	section {
		margin-top: 2rem;
	}

	.list {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.list li {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.9rem;
		border-radius: 0.75rem;
		background: var(--color-receipt);
		padding: 0.85rem 1rem;
		color: var(--color-receipt-ink);
		box-shadow: 0 0 0 1px var(--color-receipt-line);
	}

	/* a whole row that opens the receipt */
	.list li:has(> .open) {
		display: block;
		padding: 0;
	}

	.open {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.9rem;
		border-radius: 0.75rem;
		padding: 0.85rem 1rem;
		transition: background-color 150ms;
	}

	@media (hover: hover) {
		.open:hover {
			background: var(--color-raised);
		}
	}

	.paper-icon {
		width: 1.25rem;
		height: 1.6rem;
		border: 1.5px solid var(--color-receipt-muted);
		border-radius: 2px;
	}

	.status {
		font-size: 0.8rem;
		color: var(--color-receipt-muted);
	}

	.who {
		display: grid;
		min-width: 0;
	}

	.store {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 550;
	}

	.when {
		font-size: 0.8rem;
		color: var(--color-receipt-muted);
	}

	.amount {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}

	.month {
		display: flex;
		justify-content: space-between;
		padding-right: 1rem;
	}

	.month span {
		font-family: var(--font-mono);
		font-weight: 400;
		color: var(--color-muted);
	}

	.reason {
		display: block;
		margin-top: 0.15rem;
	}

	.remove {
		font-size: 0.8rem;
		color: var(--color-receipt-muted);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.read-now {
		border-radius: 999px;
		background: var(--color-receipt-ink);
		padding: 0.35rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-receipt);
	}

	.empty {
		margin-top: 1.5rem;
		color: var(--color-muted);
	}

	aside {
		display: grid;
		align-content: start;
		gap: 0.75rem;
	}

	.card {
		border-radius: 1rem;
		background: var(--color-raised);
		padding: 1rem 1.25rem;
	}

	.card ul {
		display: grid;
		gap: 0.3rem;
		margin: 0.5rem 0 0;
		padding-left: 1.1rem;
		list-style: disc;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.card .link {
		display: inline-block;
		margin-top: 0.75rem;
		font-size: 0.875rem;
	}

	.phone p {
		margin-top: 0.6rem;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.phone .pill {
		margin-top: 0.9rem;
	}

	.code {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	.code p:first-child {
		margin-top: 0;
	}

	.qr {
		flex: none;
		width: 8.5rem;
		border-radius: 0.75rem;
		background: var(--color-receipt);
		padding: 0.5rem;
	}

	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	.phone .arrived {
		font-weight: 600;
		color: var(--color-accent);
	}

	.scroll {
		margin-top: 1.25rem;
	}

	@media (min-width: 1024px) {
		.columns {
			grid-template-columns: minmax(0, 1fr) 22rem;
			gap: 3rem;
		}
	}

	/* the heading stays put and the drop zone and receipt lists scroll under it; the side cards are sized to fit */
	@media (min-width: 1024px) and (min-height: 600px) {
		.columns {
			flex: 1;
			min-height: 0;
			grid-template-rows: minmax(0, 1fr);
		}

		main {
			display: flex;
			flex-direction: column;
			min-height: 0;
		}

		.scroll {
			flex: 1;
			min-height: 0;
			padding-right: 0.5rem;
			overflow-y: auto;
			scrollbar-gutter: stable;
			scrollbar-width: thin;
			scrollbar-color: var(--color-line) transparent;
		}
	}
</style>
