<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { money, shortDay, storeName } from '../../format';
	import { storeMatches } from '../../store-search';
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

	// searching filters by store name only, never by what is on the receipts
	let storeQuery = $state('');
	const searching = $derived(storeQuery.trim().length > 0);
	const shown = $derived(saved.filter((r) => storeMatches(storeName(r.store), storeQuery)));
	const shownStores = $derived([...new Set(shown.map((r) => storeName(r.store)))]);
	const shownCents = $derived(shown.reduce((sum, r) => sum + (r.total_cents ?? 0), 0));

	// read receipts by the month they were bought, newest first, each month with its total
	const months = $derived.by(() => {
		const groups = new Map<string, typeof shown>();
		const newest = [...shown].sort((a, b) => (b.purchased_on ?? '').localeCompare(a.purchased_on ?? ''));
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
			<h1 class="large-title">Receipts</h1>

			<div class="upload surface">
				<ReceiptUploader bind:this={uploader} uploads={data.uploads} dailyLimit={data.dailyLimit} onreading={busy} />
			</div>

			{#if saved.length > 1}
				<div class="find">
					<label class="search">
						<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
						<input bind:value={storeQuery} type="search" placeholder="Search stores" aria-label="Search your receipts by store" />
						{#if storeQuery}
							<button class="clear" aria-label="Clear the search" onclick={() => (storeQuery = '')}>
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8 8 8M16 8l-8 8" /></svg>
							</button>
						{/if}
					</label>
					{#if searching}
						<p class="found" aria-live="polite">
							{#if shown.length}
								{shown.length} receipt{shown.length === 1 ? '' : 's'}{shownStores.length === 1 ? ` at ${shownStores[0]}` : ''} · {money(shownCents)}
							{:else}
								No receipts from a store called “{storeQuery.trim()}”.
							{/if}
						</p>
					{/if}
				</div>
			{/if}

			<div class="scroll scroll-area">
				{#if review.length}
					<section>
						<h2 class="list-label">Needs a quick look</h2>
						<ul class="group">
							{#each review as receipt (receipt.id)}
								<li>
									<a class="row" href="/receipts/{receipt.id}">
										<span class="row-title">{storeName(receipt.store) ?? 'Store not printed'}</span>
										<span class="row-value attention">Check the amounts</span>
										<span class="row-sub">{shortDay(receipt.purchased_on)}</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if waiting.length}
					<section>
						<h2 class="list-label">Waiting to be read</h2>
						<ul class="group">
							{#each waiting as receipt (receipt.id)}
								<li class="row">
									<span class="row-title">Receipt photo</span>
									<span class="row-value">
										{#if reading.includes(receipt.id) || stillReading(receipt)}
											<span class="status">Reading</span>
										{:else}
											<button class="small-button" onclick={() => readAgain(receipt.id)}>Read now</button>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if unreadable.length}
					<section>
						<h2 class="list-label">Couldn’t read</h2>
						<ul class="group">
							{#each unreadable as receipt (receipt.id)}
								<li class="row">
									<span class="row-title">Receipt photo</span>
									<span class="row-value">
										<form method="POST" action="/receipts/{receipt.id}?/delete">
											<button class="remove" onclick={(e) => !confirm('Remove this receipt?') && e.preventDefault()}>Remove</button>
										</form>
									</span>
									<span class="row-sub">{problems[receipt.problem ?? ''] ?? 'It couldn’t be read.'}</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if !data.receipts.length}
					<p class="empty surface">No receipts yet. Your first one takes a few seconds.</p>
				{/if}

				{#each months as month (month.key)}
					<section>
						<div class="list-label-row">
							<h2 class="list-label">{month.label}</h2>
							<span class="month-total">{money(month.totalCents)}</span>
						</div>
						<ul class="group">
							{#each month.receipts as receipt (receipt.id)}
								<li>
									<a class="row" href="/receipts/{receipt.id}">
										<span class="row-title">{storeName(receipt.store) ?? 'Store not printed'}</span>
										<span class="row-value">{money(receipt.total_cents)}</span>
										<span class="row-sub">{shortDay(receipt.purchased_on)}{receipt.channel === 'delivery' ? ' · Delivery' : ''}</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		</main>

		<aside>
			<div class="card surface for-wide phone">
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
					<button class="pill-button" onclick={showPhoneCode}>Show a code</button>
				{/if}
			</div>
			<div class="card surface">
				<h2>Good photo, good reading</h2>
				<ul>
					<li>Lay it flat in good light.</li>
					<li>Fit the whole receipt in the frame.</li>
					<li>Smooth out folds, they hide prices.</li>
				</ul>
			</div>
			<div class="card surface">
				<h2>Your privacy</h2>
				<ul>
					<li>Card details are never saved.</li>
					<li>Photos are deleted once read.</li>
					<li>Location is removed on your device.</li>
				</ul>
				<a href="/privacy" class="link">How we handle your receipts</a>
			</div>
		</aside>
	</div>
</AppShell>

<style>
	.columns {
		display: grid;
		gap: 2rem;
	}

	.upload {
		margin-top: 1.25rem;
		padding: 1rem;
	}

	section {
		margin-top: 1.75rem;
	}

	.scroll {
		margin-top: 0.25rem;
	}

	.find {
		flex: none;
		margin-top: 1.25rem;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 10px;
		background: rgb(118 118 128 / 0.12);
		padding: 0 0.75rem;
	}

	.search:focus-within {
		outline: 2px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
	}

	.search svg {
		width: 1.25rem;
		height: 1.25rem;
		flex: none;
		fill: none;
		stroke: var(--color-muted);
		stroke-width: 2;
		stroke-linecap: round;
	}

	/* 16px text: iOS Safari zooms the page on any smaller input */
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		padding: 0.6rem 0;
		font-size: 1rem;
		color: var(--color-ink);
		outline: none;
	}

	.search input::placeholder {
		color: var(--color-muted);
	}

	/* the browser's own blue cross is replaced by an iOS-style grey one */
	.search input::-webkit-search-cancel-button {
		-webkit-appearance: none;
	}

	.clear {
		display: grid;
		flex: none;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		background: rgb(118 118 128 / 0.45);
	}

	.clear svg {
		width: 0.9rem;
		height: 0.9rem;
		fill: none;
		stroke: #fff;
		stroke-width: 2.6;
		stroke-linecap: round;
	}

	.clear:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.found {
		margin: 0.5rem 1rem 0;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.attention {
		font-size: 0.9375rem;
		color: var(--color-up);
	}

	.status {
		font-size: 0.9375rem;
		color: var(--color-muted);
	}

	.small-button {
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		padding: 0.35rem 0.85rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-accent);
	}

	.remove {
		font-size: 0.9375rem;
		color: var(--color-up);
	}

	.month-total {
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
	}

	.empty {
		margin-top: 1.5rem;
		padding: 1rem 1.1rem;
		color: var(--color-muted);
	}

	aside {
		display: grid;
		align-content: start;
		gap: 1rem;
	}

	.card {
		padding: 1.1rem 1.25rem;
	}

	.card h2 {
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.card ul {
		display: grid;
		gap: 0.3rem;
		margin: 0.5rem 0 0;
		padding-left: 1.1rem;
		list-style: disc;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.link {
		display: inline-block;
		margin-top: 0.75rem;
		font-size: 0.9375rem;
		color: var(--color-accent);
	}

	.phone p {
		margin-top: 0.5rem;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.phone .pill-button {
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
		border-radius: 12px;
		background: #fff;
		padding: 0.4rem;
		box-shadow: 0 0 0 1px var(--color-line);
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

	/* a phone can't scan a code shown on itself; touch laptops still get it, so this goes by screen width */
	@media (max-width: 640px) {
		.for-wide {
			display: none;
		}
	}

	@media (min-width: 1024px) {
		.columns {
			grid-template-columns: minmax(0, 1fr) 22rem;
			gap: 2.5rem;
		}
	}

	/* the heading and drop zone stay put and only the receipt lists scroll; the side cards are sized to fit */
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

		.upload {
			display: flex;
			flex: none;
			flex-direction: column;
			max-height: 55%;
			min-height: 0;
		}

		.scroll {
			flex: 1;
			min-height: 0;
			margin-top: 0.5rem;
		}
	}
</style>
