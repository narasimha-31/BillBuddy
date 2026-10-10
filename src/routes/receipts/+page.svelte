<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preparePhoto } from './prepare-photo';

	let { data } = $props();

	type Upload = { id: number; name: string; state: 'working' | 'added' | 'duplicate' | 'failed'; note?: string };
	let uploads = $state<Upload[]>([]);
	let dragging = $state(false);
	let picker: HTMLInputElement;
	let nextId = 0;

	const waiting = $derived(data.receipts.filter((r) => r.status !== 'saved'));
	const saved = $derived(data.receipts.filter((r) => r.status === 'saved'));
	const initial = $derived((data.firstName ?? 'B').charAt(0).toUpperCase());

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
				const response = await fetch('?/upload', {
					method: 'POST',
					body,
					headers: { 'x-sveltekit-action': 'true' }
				});
				const result = deserialize(await response.text());
				if (result.type === 'success') entry.state = 'added';
				else if (result.type === 'failure' && result.status === 409) entry.state = 'duplicate';
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

	function dropped(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (event.dataTransfer) add(event.dataTransfer.files);
	}

	const statusText: Record<Upload['state'], string> = {
		working: 'getting it ready',
		added: 'added',
		duplicate: 'already added',
		failed: 'did not upload'
	};
</script>

<svelte:head>
	<title>Receipts · BillBuddy</title>
</svelte:head>

<div class="shell">
	<header class="top">
		<a href="/receipts" class="wordmark"><span>B</span>ill<span>B</span>uddy</a>
		<div class="who">
			{#if data.firstName}<span class="hello">Hi {data.firstName}</span>{/if}
			<span class="initial" aria-hidden="true">{initial}</span>
			<form method="POST" action="/?/signout">
				<button class="link">Sign out</button>
			</form>
		</div>
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

			{#if waiting.length}
				<section>
					<h2>Waiting to be read</h2>
					<ul class="list">
						{#each waiting as receipt (receipt.id)}
							<li>
								<span class="paper-icon" aria-hidden="true"></span>
								<span>Receipt photo</span>
								<span class="status">{receipt.status === 'failed' ? 'could not be read' : 'waiting'}</span>
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
								<span class="paper-icon" aria-hidden="true"></span>
								<span>{receipt.store ?? 'Receipt'}</span>
								<span class="status">{receipt.purchased_on ?? ''}</span>
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

	.who {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.hello {
		color: var(--color-ink);
	}

	.initial {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		background: var(--color-accent);
		font-weight: 600;
		color: var(--color-receipt);
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

	.uploads .added {
		color: var(--color-accent);
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
