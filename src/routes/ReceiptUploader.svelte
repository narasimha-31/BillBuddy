<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { money, shortDay, storeName } from '../format';
	import { preparePhoto } from './receipts/prepare-photo';
	import { post, readReceipt, type Printed } from './receipts/reading';

	let {
		uploads,
		dailyLimit,
		onreading
	}: { uploads: { used: number; freesAt: string | null }; dailyLimit: number; onreading?: (id: string, busy: boolean) => void } = $props();

	// the time is shown in the browser's own timezone, so it is only written once the page is running there
	let opensAt = $state('');
	$effect(() => {
		opensAt =
			uploads.used >= dailyLimit && uploads.freesAt
				? new Date(uploads.freesAt).toLocaleTimeString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
				: '';
	});

	type State = 'preparing' | 'reading' | 'saved' | 'review' | 'duplicate' | 'failed' | 'paused';
	type Entry = { key: number; id?: string; photo: string | null; state: State; slow: boolean; note?: string; printed?: Printed };

	let entries = $state<Entry[]>([]);
	let dragging = $state(false);
	let picker: HTMLInputElement;
	let nextKey = 0;

	const SHOWN_LINES = 8;
	const SLOW_MS = 20_000;

	function begin(photo: string | null): Entry {
		const key = nextKey++;
		entries.unshift({ key, photo, state: photo ? 'preparing' : 'reading', slow: false });
		return entries.find((e) => e.key === key)!;
	}

	// reads an uploaded receipt and turns the entry into its printed result
	async function read(entry: Entry, id: string) {
		entry.id = id;
		entry.state = 'reading';
		onreading?.(id, true);
		const timer = setTimeout(() => (entry.slow = true), SLOW_MS);
		try {
			Object.assign(entry, await readReceipt(id));
		} finally {
			clearTimeout(timer);
			onreading?.(id, false);
			if (entry.photo) URL.revokeObjectURL(entry.photo);
			entry.photo = null;
		}
	}

	// a receipt sent from the phone is already uploaded; it gets the same scan and print here
	export async function readArrived(id: string) {
		await read(begin(null), id);
	}

	async function add(files: Iterable<File>) {
		const batch = [...files].filter((f) => f.type.startsWith('image/'));
		for (const file of batch) {
			const entry = begin(URL.createObjectURL(file));
			try {
				const { jpeg, hash } = await preparePhoto(file);
				const body = new FormData();
				body.set('photo', jpeg, 'receipt.jpg');
				body.set('hash', hash);
				const result = await post('upload', body);
				if (result.type === 'success' && result.data?.id) await read(entry, String(result.data.id));
				else {
					entry.state = result.type === 'failure' && result.status === 409 ? 'duplicate' : 'failed';
					entry.note = result.type === 'failure' && result.status !== 409 ? String(result.data?.problem ?? '') : undefined;
				}
			} catch {
				entry.state = 'failed';
				entry.note = 'This photo format could not be opened.';
			} finally {
				if (entry.photo && entry.state !== 'reading') URL.revokeObjectURL(entry.photo);
			}
		}
		if (batch.length) await invalidateAll();
	}

	function dropped(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (event.dataTransfer) add(event.dataTransfer.files);
	}

	const messages: Partial<Record<State, string>> = {
		duplicate: 'You already added this receipt.',
		failed: "Couldn't read this one.",
		paused: "Reading isn't available right now. The photo is saved in your list to try again."
	};
</script>

<div class="uploader">
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
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
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
		{uploads.used} of {dailyLimit} receipts in the last 24 hours.
		{opensAt ? `The next one opens ${opensAt}.` : 'Photos up to 5 MB.'}
	</p>

	{#if entries.length}
		<ul class="entries" aria-live="polite">
			{#each entries as entry (entry.key)}
				<li>
					{#if entry.state === 'preparing' || entry.state === 'reading'}
						<div class="scanning">
							<div class="thumb" aria-hidden="true">
								{#if entry.photo}<img src={entry.photo} alt="" />{:else}<span class="blank"></span>{/if}
								<span class="beam"></span>
							</div>
							<div>
								<p class="title">{entry.state === 'preparing' ? 'Getting the photo ready' : 'Reading your receipt'}</p>
								<p class="sub">
									{entry.note ?? (entry.slow ? 'Still reading. Long receipts take a bit longer.' : 'This takes about 10 seconds.')}
								</p>
							</div>
						</div>
					{:else if entry.printed}
						{@const p = entry.printed}
						<div class="shadow">
							<article class="printout torn print-feed">
								<header>
									<span>{storeName(p.store) ?? 'Receipt'}</span>
									<span>{shortDay(p.date)}</span>
								</header>
								<ul>
									{#each p.lines.slice(0, SHOWN_LINES) as line, i (i)}
										<li class="line-in" style:--delay="{350 + i * 90}ms">
											<span>{line.name}</span>
											<span>{money(line.totalCents)}</span>
										</li>
									{/each}
								</ul>
								{#if p.lines.length > SHOWN_LINES}
									<p class="more line-in" style:--delay="{350 + SHOWN_LINES * 90}ms">and {p.lines.length - SHOWN_LINES} more</p>
								{/if}
								<footer class="line-in" style:--delay="{450 + Math.min(p.lines.length, SHOWN_LINES) * 90}ms">
									<span>Total</span>
									<span>{money(p.totalCents)}</span>
									<span class="check" class:off={!p.matches}>
										{p.matches ? 'The items add up to the total.' : "The items don't add up to the total yet."}
									</span>
									<a href="/receipts/{entry.id}">{entry.state === 'review' ? 'Check the amounts' : 'Open receipt'}</a>
								</footer>
							</article>
						</div>
					{:else}
						<p class="message" class:bad={entry.state === 'failed'}>
							{messages[entry.state] ?? ''}{entry.note ? ` ${entry.note}` : ''}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		border: 1.5px dashed var(--color-line);
		border-radius: 1rem;
		background: var(--color-raised);
		padding: 2.25rem 1.5rem;
		color: var(--color-ink);
		transition:
			background-color 150ms,
			border-color 150ms;
	}

	.drop.dragging {
		border-color: var(--color-brand);
		background: var(--color-receipt);
	}

	@media (hover: hover) {
		.drop:hover {
			border-color: var(--color-brand);
			background: var(--color-receipt);
		}
	}

	.drop:focus-visible,
	.printout a:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	.drop svg {
		width: 2.25rem;
		height: 2.25rem;
		fill: none;
		stroke: var(--color-ink);
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
		padding: 0.55rem 1.2rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-on-ink);
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

	.limits {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		color: var(--color-muted);
	}

	.entries {
		display: grid;
		gap: 1rem;
		margin-top: 1.25rem;
	}

	/* the photo itself, with a soft line passing over it while the model reads */
	.scanning {
		display: flex;
		align-items: center;
		gap: 1rem;
		border-radius: 0.9rem;
		background: var(--color-raised);
		padding: 0.75rem;
	}

	.thumb {
		position: relative;
		flex: none;
		width: 4.5rem;
		height: 6rem;
		overflow: hidden;
		border-radius: 0.4rem;
		background: var(--color-receipt);
		box-shadow: 0 0 0 1px var(--color-line);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: grayscale(0.3);
	}

	.blank {
		position: absolute;
		inset: 0.6rem;
		background: repeating-linear-gradient(var(--color-line) 0 2px, transparent 2px 9px);
	}

	.beam {
		position: absolute;
		inset: 0 0 auto;
		height: 2px;
		background: #9fb0ee;
		box-shadow: 0 0 10px 3px rgb(159 176 238 / 0.65);
		animation: scan 1.8s ease-in-out infinite alternate;
	}

	@keyframes scan {
		from {
			transform: translateY(0.25rem);
		}
		to {
			transform: translateY(5.6rem);
		}
	}

	.title {
		font-weight: 600;
		color: var(--color-ink);
	}

	.sub {
		margin-top: 0.15rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	/* the result prints out as a till receipt */
	.shadow {
		max-width: 26rem;
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.08)) drop-shadow(0 8px 14px rgb(0 0 0 / 0.12));
	}

	.printout {
		background: var(--color-receipt);
		padding: 1.1rem 1.25rem 1.6rem;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--color-receipt-ink);
	}

	.printout header,
	.printout li,
	.printout footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.printout header {
		border-bottom: 1px dashed var(--color-receipt-line);
		padding-bottom: 0.6rem;
		font-weight: 700;
	}

	.printout ul {
		display: grid;
		gap: 0.3rem;
		padding: 0.6rem 0;
	}

	.printout li span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.printout li span:last-child,
	.printout footer span:nth-child(2) {
		font-variant-numeric: tabular-nums;
	}

	.more {
		padding-bottom: 0.5rem;
		color: var(--color-receipt-muted);
	}

	.printout footer {
		flex-wrap: wrap;
		border-top: 1px dashed var(--color-receipt-line);
		padding-top: 0.6rem;
		font-weight: 700;
	}

	.check {
		flex-basis: 100%;
		font-family: var(--font-sans);
		font-weight: 400;
		color: var(--color-receipt-down);
	}

	.check.off {
		color: var(--color-receipt-up);
	}

	.printout a {
		font-family: var(--font-sans);
		font-weight: 500;
		color: var(--color-receipt-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.message {
		border-radius: 0.9rem;
		background: var(--color-raised);
		padding: 0.85rem 1rem;
		color: var(--color-muted);
	}

	.message.bad {
		color: var(--color-up);
	}

	@media (prefers-reduced-motion: reduce) {
		.beam {
			animation: none;
			transform: translateY(2.25rem);
		}
	}

	/* on a laptop the page is one screen tall: the drop zone stays put and the results scroll under it */
	@media (min-width: 1024px) and (min-height: 600px) {
		.uploader {
			display: flex;
			flex-direction: column;
			min-height: 0;
		}

		.drop,
		.limits {
			flex: none;
		}

		.entries {
			min-height: 0;
			overflow-y: auto;
			padding: 0 0.5rem 1rem 0;
			scrollbar-width: thin;
			scrollbar-color: var(--color-line) transparent;
		}
	}
</style>
