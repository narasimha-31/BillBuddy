<script lang="ts">
	import { deserialize } from '$app/forms';
	import { canAdd, cannotOpen, isPdf, prepareUpload } from '../../receipts/prepare-photo';
	import Wordmark from '../../Wordmark.svelte';

	let { data } = $props();

	type State = 'sending' | 'sent' | 'duplicate' | 'failed';
	type Sent = { id: number; photo: string; state: State; note?: string };
	let sent = $state<Sent[]>([]);
	let closed = $state(false);
	let picker = $state<HTMLInputElement>();
	let camera = $state<HTMLInputElement>();
	let nextId = 0;

	const until = $derived(
		data.expiresAt ? new Date(data.expiresAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
	);

	const statusText: Record<State, string> = {
		sending: 'Sending',
		sent: 'On your computer',
		duplicate: 'Already added',
		failed: "Couldn't send"
	};

	async function send(files: FileList | null) {
		for (const file of [...(files ?? [])].filter(canAdd)) {
			sent.unshift({ id: nextId++, photo: isPdf(file) ? '' : URL.createObjectURL(file), state: 'sending' });
			const entry = sent[0];
			try {
				const { jpeg, hash } = await prepareUpload(file);
				if (!entry.photo) entry.photo = URL.createObjectURL(jpeg);
				const body = new FormData();
				body.set('photo', jpeg, 'receipt.jpg');
				body.set('hash', hash);
				const response = await fetch('?/upload', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
				const result = deserialize(await response.text());
				if (result.type === 'success') entry.state = 'sent';
				else if (result.type === 'failure' && result.status === 409) entry.state = 'duplicate';
				else {
					entry.state = 'failed';
					entry.note = result.type === 'failure' ? String(result.data?.problem ?? '') : 'try again';
					if (result.type === 'failure' && result.status === 403) closed = true;
				}
			} catch (problem) {
				entry.state = 'failed';
				entry.note = cannotOpen(problem, file);
			}
		}
		if (picker) picker.value = '';
		if (camera) camera.value = '';
	}
</script>

<svelte:head>
	<title>Add receipts · Pricetrail</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="screen">
	<main>
		<Wordmark />

		{#if data.expiresAt && !closed}
			<h1 class="large-title">Add receipts from this phone</h1>
			<p class="lead">Take a photo of each receipt. They show up on your computer, ready to read.</p>

			<input bind:this={picker} type="file" accept="image/*,application/pdf" multiple hidden onchange={(e) => send(e.currentTarget.files)} />
			<input bind:this={camera} type="file" accept="image/*" capture="environment" hidden onchange={(e) => send(e.currentTarget.files)} />
			<button class="pill-button take" onclick={() => camera?.click()}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
					<circle cx="12" cy="13" r="3.5" />
				</svg>
				Take a photo
			</button>
			<button class="choose" onclick={() => picker?.click()}>Choose photos or a PDF</button>
			<p class="small">This code works until {until}, for up to 10 photos.</p>

			{#if sent.length}
				<ul class="group" aria-live="polite">
					{#each sent as item (item.id)}
						<li class={item.state}>
							<img src={item.photo} alt="" />
							<span>
								<strong>{statusText[item.state]}</strong>
								{#if item.state === 'sent'}<small>It's read there in a few seconds.</small>{/if}
								{#if item.note}<small>{item.note}</small>{/if}
							</span>
							{#if item.state === 'sent'}
								<svg class="done" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<h1 class="large-title">This code has stopped working</h1>
			<p class="lead">
				Codes last 10 minutes and work on one phone only. Make a new one on your computer and scan it again.
			</p>
		{/if}
	</main>
</div>

<style>
	.screen {
		min-height: 100dvh;
		background: var(--color-raised);
	}

	main {
		margin: 0 auto;
		max-width: 28rem;
		padding: 1rem 1.25rem calc(3rem + env(safe-area-inset-bottom));
	}

	h1 {
		margin-top: 2.25rem;
	}

	.lead {
		margin-top: 0.5rem;
		font-size: 1.0625rem;
		line-height: 1.45;
		color: var(--color-muted);
	}

	.take {
		width: 100%;
		margin-top: 2rem;
		padding: 1rem 1.5rem;
		font-size: 1.0625rem;
		font-weight: 600;
	}

	.choose {
		width: 100%;
		margin-top: 0.6rem;
		border-radius: 999px;
		background: rgb(118 118 128 / 0.12);
		padding: 0.9rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-accent);
		-webkit-tap-highlight-color: transparent;
		transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.choose:active {
		transform: scale(0.97);
		transition-duration: 80ms;
	}

	.choose:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.choose,
		.choose:active {
			transition: none;
			transform: none;
		}
	}

	.take svg {
		width: 1.4rem;
		height: 1.4rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linejoin: round;
	}

	.small {
		margin-top: 0.75rem;
		text-align: center;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	ul {
		margin-top: 1.75rem;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.6rem 1rem;
		color: var(--color-ink);
	}

	img {
		flex: none;
		width: 2.75rem;
		height: 3.6rem;
		border-radius: 6px;
		object-fit: cover;
		box-shadow: 0 0 0 0.5px rgb(0 0 0 / 0.12);
	}

	/* the photo fades while it travels, then settles once it has arrived */
	.sending img {
		animation: sending 1.2s ease-in-out infinite alternate;
	}

	@keyframes sending {
		to {
			opacity: 0.45;
		}
	}

	li span {
		display: grid;
		flex: 1;
		gap: 0.1rem;
	}

	strong {
		font-weight: 500;
	}

	small {
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.done {
		width: 1.4rem;
		height: 1.4rem;
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.failed strong {
		color: var(--color-up);
	}

	@media (prefers-reduced-motion: reduce) {
		.sending img {
			animation: none;
		}
	}
</style>
