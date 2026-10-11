<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AccountMenu from '../AccountMenu.svelte';
	import { preparePhoto } from './prepare-photo';

	let { data } = $props();

	type State = 'working' | 'reading' | 'saved' | 'review' | 'duplicate' | 'failed' | 'paused';
	type Upload = { id: number; name: string; state: State; note?: string };
	let uploads = $state<Upload[]>([]);
	let reading = $state<string[]>([]);
	let dragging = $state(false);
	let picker: HTMLInputElement;
	let nextId = 0;

	const review = $derived(data.receipts.filter((r) => r.status === 'review'));
	const waiting = $derived(data.receipts.filter((r) => ['pending', 'processing'].includes(r.status) || (r.status === 'failed' && r.problem === 'error')));
	const unreadable = $derived(data.receipts.filter((r) => r.status === 'failed' && r.problem !== 'error'));
	const saved = $derived(data.receipts.filter((r) => r.status === 'saved'));

	const problems: Record<string, string> = {
		not_a_receipt: "that doesn't look like a receipt",
		handwritten: "handwritten bills can't be read",
		no_lines: 'no items found on it',
		bad_photo: "the photo couldn't be opened"
	};

	async function post(action: string, body: FormData) {
		const response = await fetch(`?/${action}`, { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
		return deserialize(await response.text());
	}

	// reads a receipt that is already uploaded; returns the state to show for it
	async function read(id: string): Promise<{ state: State; note?: string }> {
		reading = [...reading, id];
		try {
			const body = new FormData();
			body.set('id', id);
			const result = await post('process', body);
			if (result.type !== 'success' || !result.data) return { state: 'failed', note: 'try again in a moment' };
			const outcome = result.data as { status: string; problem?: string; skipped?: number };
			if (outcome.status === 'saved') return { state: 'saved', note: outcome.skipped ? `${outcome.skipped} line skipped` : undefined };
			if (outcome.status === 'review') return { state: 'review' };
			if (outcome.status === 'paused') return { state: 'paused' };
			if (outcome.status === 'busy') return { state: 'reading', note: 'already being read' };
			return { state: 'failed', note: problems[outcome.problem ?? ''] ?? 'try again' };
		} finally {
			reading = reading.filter((r) => r !== id);
		}
	}

	async function add(files: Iterable<File>) {
		const batch = [...files].filter((f) => f.type.startsWith('image/'));
		for (const file of batch) {
			const upload: Upload = { id: nextId++, name: file.name, state: 'working' };
			uploads.unshift(upload);
			const entry = uploads.find((u) => u.id === upload.id)!;
			try {
				const { jpeg, hash } = await preparePhoto(file);
				const body = new FormData();
				body.set('photo', jpeg, 'receipt.jpg');
				body.set('hash', hash);
				const result = await post('upload', body);
				if (result.type === 'success' && result.data?.id) {
					entry.state = 'reading';
					Object.assign(entry, await read(String(result.data.id)));
				} else if (result.type === 'failure' && result.status === 409) entry.state = 'duplicate';
				else {
					entry.state = 'failed';
					entry.note = result.type === 'failure' ? String(result.data?.problem ?? '') : 'try again';
				}
			} catch {
				entry.state = 'failed';
				entry.note = 'this photo format could not be opened';
			}
		}
		if (batch.length) await invalidateAll();
	}

	async function readAgain(id: string) {
		await read(id);
		await invalidateAll();
	}

	function dropped(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (event.dataTransfer) add(event.dataTransfer.files);
	}

	const statusText: Record<State, string> = {
		working: 'getting it ready',
		reading: 'reading',
		saved: 'read',
		review: 'read, check a few lines',
		duplicate: 'already added',
		failed: "couldn't read",
		paused: "reading is paused for today, it's saved in your list"
	};
</script>

<svelte:head>
	<title>Receipts · BillBuddy</title>
</svelte:head>

<div class="shell">
	<header class="top">
		<a href="/receipts" class="wordmark"><span>B</span>ill<span>B</span>uddy</a>
		<AccountMenu firstName={data.firstName} />
	</header>

	<div class="columns">
		<main>
			<h1>Receipts</h1>

			<button
				type="button"
				class="drop"
				class:dragging
				onclick={() => picker.click()}
				ondragover={(e) => {
					e.preventDefault();
					dragging = true;
				}}
				ondragleave={() => (dragging = false)}
				ondrop={dropped}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M4 7h3l2-3h6l2 3h3v13H4z" />
					<circle cx="12" cy="13" r="4" />
				</svg>
				<strong class="for-mouse">Drop receipt photos here</strong>
				<strong class="for-touch">Add a receipt</strong>
				<span class="pill for-mouse">Choose photos</span>
				<span class="pill for-touch">Take or choose a photo</span>
			</button>
			<input
				bind:this={picker}
				type="file"
				accept="image/*"
				multiple
				hidden
				onchange={(e) => {
					add(e.currentTarget.files ?? []);
					e.currentTarget.value = '';
				}}
			/>

			<p class="limits">
				{data.today} of {data.dailyLimit} receipts today · photos up to 5 MB
			</p>

			{#if uploads.length}
				<ul class="uploads" aria-live="polite">
					{#each uploads as upload (upload.id)}
						<li class={upload.state}>
							<span class="name">{upload.name}</span>
							<span>{statusText[upload.state]}{upload.note ? `: ${upload.note}` : ''}</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if review.length}
				<section>
					<h2>Needs a quick look</h2>
					<ul class="list">
						{#each review as receipt (receipt.id)}
							<li>
								<a href="/receipts/{receipt.id}" class="open">
									<span class="paper-icon" aria-hidden="true"></span>
									<span>{receipt.store ?? 'Receipt'}{receipt.purchased_on ? ` · ${receipt.purchased_on}` : ''}</span>
									<span class="status">check a few lines</span>
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
								{#if reading.includes(receipt.id) || receipt.status === 'processing'}
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
								<span>Receipt photo</span>
								<span class="status">{problems[receipt.problem ?? ''] ?? 'unreadable'}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if !data.receipts.length && !uploads.length}
				<p class="empty">No receipts yet. Your first one takes a few seconds.</p>
			{/if}

			{#if saved.length}
				<section>
					<h2>Read</h2>
					<ul class="list">
						{#each saved as receipt (receipt.id)}
							<li>
								<a href="/receipts/{receipt.id}" class="open">
									<span class="paper-icon" aria-hidden="true"></span>
									<span>{receipt.store ?? 'Receipt'}</span>
									<span class="status">{receipt.purchased_on ?? ''}</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</main>

		<aside>
			<div class="card">
				<h2>Good photo, good reading</h2>
				<ul>
					<li>Lay the receipt flat in good light.</li>
					<li>Get the whole receipt in the frame, top to bottom.</li>
					<li>Crumpled? Smooth it out first, folds hide prices.</li>
				</ul>
			</div>
			<div class="card">
				<h2>Your privacy</h2>
				<ul>
					<li>Card details are never saved.</li>
					<li>The photo is deleted once it is read.</li>
					<li>Location is stripped before it leaves your device.</li>
				</ul>
				<a href="/privacy" class="link">The fine print</a>
			</div>
		</aside>
	</div>
</div>

<style>
	.shell {
		margin: 0 auto;
		max-width: 90rem;
		padding: 1.5rem 1.25rem 4rem;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px dashed var(--color-line);
		padding-bottom: 1.25rem;
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 700;
		font-synthesis: none;
		font-variation-settings: 'SOFT' 100;
		color: var(--color-ink);
	}

	.wordmark span {
		color: var(--color-accent);
	}




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

	.drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		margin-top: 1.25rem;
		border: 2px dashed rgb(43 38 32 / 0.3);
		border-radius: 1rem;
		background: rgb(253 251 245 / 0.55);
		padding: 3rem 1.5rem;
		color: var(--color-ink);
		transition:
			background-color 150ms,
			border-color 150ms;
	}

	.drop.dragging {
		border-color: var(--color-accent);
		background: rgb(253 251 245 / 0.85);
	}

	.drop svg {
		width: 2.5rem;
		height: 2.5rem;
		fill: none;
		stroke: var(--color-muted);
		stroke-width: 1.5;
		stroke-linejoin: round;
	}

	.drop strong {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.pill {
		border-radius: 999px;
		background: var(--color-ink);
		padding: 0.6rem 1.25rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-receipt);
	}

	.for-touch {
		display: none;
	}

	@media (pointer: coarse) {
		.for-touch {
			display: inline;
		}
		.for-mouse {
			display: none;
		}
	}

	@media (hover: hover) {
		.drop:hover {
			border-color: rgb(43 38 32 / 0.55);
			background: rgb(253 251 245 / 0.8);
		}
	}

	.uploads {
		display: grid;
		gap: 0.4rem;
		margin-top: 1rem;
		font-size: 0.875rem;
	}

	.uploads li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-radius: 0.5rem;
		background: rgb(253 251 245 / 0.5);
		padding: 0.6rem 0.9rem;
		color: var(--color-muted);
	}

	.uploads .name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-ink);
	}


	.uploads .failed {
		color: var(--color-up);
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
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
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
			background: rgb(46 48 44 / 0.04);
		}
	}

	.paper-icon {
		width: 1.25rem;
		height: 1.6rem;
		border: 1.5px solid var(--color-receipt-muted);
		border-radius: 2px;
	}

	.status {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-receipt-muted);
	}

	.limits {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		color: var(--color-muted);
	}

	.read-now {
		border-radius: 999px;
		background: var(--color-receipt-ink);
		padding: 0.35rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-receipt);
	}

	.uploads .saved,
	.uploads .review {
		color: var(--color-accent);
	}

	.empty {
		margin-top: 1.5rem;
		color: var(--color-muted);
	}

	aside {
		display: grid;
		align-content: start;
		gap: 1rem;
	}

	.card {
		border-radius: 1rem;
		background: rgb(253 251 245 / 0.6);
		padding: 1.25rem 1.4rem;
	}

	.card ul {
		display: grid;
		gap: 0.5rem;
		margin: 0.75rem 0 0;
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

	@media (min-width: 1024px) {
		.shell {
			padding: 2rem 2.5rem 4rem;
		}
		.columns {
			grid-template-columns: minmax(0, 1fr) 22rem;
			gap: 3rem;
		}
		.drop {
			padding: 4.5rem 2rem;
		}
	}
</style>
