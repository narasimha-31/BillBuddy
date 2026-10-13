<script lang="ts">
	import { deserialize } from '$app/forms';
	import { preparePhoto } from '../../receipts/prepare-photo';

	let { data } = $props();

	type State = 'sending' | 'sent' | 'duplicate' | 'failed';
	type Sent = { id: number; name: string; state: State; note?: string };
	let sent = $state<Sent[]>([]);
	let closed = $state(false);
	let picker = $state<HTMLInputElement>();
	let nextId = 0;

	const until = $derived(
		data.expiresAt ? new Date(data.expiresAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
	);

	const statusText: Record<State, string> = {
		sending: 'sending',
		sent: 'sent to your computer',
		duplicate: 'already added',
		failed: "couldn't send"
	};

	async function send(files: FileList | null) {
		for (const file of [...(files ?? [])].filter((f) => f.type.startsWith('image/'))) {
			sent.unshift({ id: nextId++, name: file.name, state: 'sending' });
			const entry = sent[0];
			try {
				const { jpeg, hash } = await preparePhoto(file);
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
			} catch {
				entry.state = 'failed';
				entry.note = 'this photo format could not be opened';
			}
		}
		if (picker) picker.value = '';
	}
</script>

<svelte:head>
	<title>Add receipts · BillBuddy</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<p class="wordmark"><span>B</span>ill<span>B</span>uddy</p>

	{#if data.expiresAt && !closed}
		<h1>Add receipts from this phone</h1>
		<p class="lead">Take a photo of each receipt. They show up on your computer, ready to read.</p>

		<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={(e) => send(e.currentTarget.files)} />
		<button class="take" onclick={() => picker?.click()}>Take or choose a photo</button>
		<p class="small">This code works until {until}, for up to 10 photos.</p>

		{#if sent.length}
			<ul aria-live="polite">
				{#each sent as item (item.id)}
					<li class={item.state}>
						<span class="name">{item.name}</span>
						<span>{statusText[item.state]}{item.note ? `: ${item.note}` : ''}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<h1>This code has stopped working</h1>
		<p class="lead">
			Codes last 10 minutes and work on one phone only. Make a new one on your computer and scan it again.
		</p>
	{/if}
</main>

<style>
	main {
		margin: 0 auto;
		max-width: 28rem;
		padding: 2rem 1.25rem 4rem;
		text-align: center;
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
		color: var(--color-brand);
	}

	h1 {
		margin-top: 2rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-ink);
	}

	.lead {
		margin-top: 0.5rem;
		color: var(--color-muted);
	}

	.take {
		width: 100%;
		margin-top: 2rem;
		border-radius: 999px;
		background: var(--color-ink);
		padding: 1.1rem 1.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-receipt);
	}

	.small {
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: var(--color-muted);
	}

	ul {
		display: grid;
		gap: 0.5rem;
		margin-top: 1.5rem;
		text-align: left;
	}

	li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-radius: 0.75rem;
		background: rgb(253 251 245 / 0.6);
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		color: var(--color-ink);
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sent {
		color: var(--color-accent);
	}

	.failed {
		color: var(--color-up);
	}
</style>
