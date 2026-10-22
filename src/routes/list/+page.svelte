<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '../AppShell.svelte';
	import { money, storeName } from '../../format';

	let { data, form } = $props();

	let field = $state<HTMLInputElement>();
	const onList = $derived(new Set(data.list.map((name) => name.toLowerCase())));
	const quick = $derived(data.names.filter((name) => !onList.has(name.toLowerCase())).slice(0, 6));
	// the store that has the most of the list, at the lowest total
	const best = $derived(data.stores[0]?.store ?? null);
	const unit = (per: string | null) => (per === 'lb' ? '/lb' : '');
	// Safari's suggestion list takes the Enter that matches it, so the form is sent here instead
	let sent = false;
	const enterSends = (e: KeyboardEvent) => {
		if (e.key !== 'Enter') return;
		sent = false;
		setTimeout(() => !sent && field?.form?.requestSubmit());
	};
	const keepFocus = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
		await update();
		field?.focus();
	};
</script>

<svelte:head>
	<title>My list · Pricetrail</title>
</svelte:head>

<AppShell firstName={data.firstName}>
	<main>
		<h1 class="large-title">My list</h1>

		<form class="add" method="POST" action="?/add" use:enhance={keepFocus} onsubmit={() => (sent = true)}>
			<input name="name" aria-label="Add an item" bind:this={field} onkeydown={enterSends} list="bought" placeholder="Add an item, like milk" autocomplete="off" maxlength="60" required />
			<datalist id="bought">
				{#each data.names as name (name)}<option value={name}></option>{/each}
			</datalist>
			<button class="pill-button">Add</button>
		</form>
		{#if form?.problem}<p class="problem" role="alert">{form.problem}</p>{/if}

		{#if quick.length}
			<div class="quick" aria-label="Often bought">
				{#each quick as name (name)}
					<form method="POST" action="?/add" use:enhance>
						<button class="chip" name="name" value={name}>+ {name}</button>
					</form>
				{/each}
			</div>
		{/if}

		{#if data.list.length}
			{#if data.stores.length}
				<h2 class="list-label">Where to buy it</h2>
				<ul class="group">
					{#each data.stores as store (store.store)}
						<li class="row" class:best={store.store === best}>
							<span class="row-title">{storeName(store.store)}</span>
							<span class="row-sub">
								{store.has} of {data.items.length - data.unpriced.length} items{store.cheapest ? ` · cheapest for ${store.cheapest}` : ''}{store.missing.length ? ` · no ${store.missing.join(', ')}` : ''}
							</span>
							<span class="row-value">{money(store.cents)}</span>
						</li>
					{/each}
					{#if data.stores.length > 1 && data.split.stores > 1}
						<li class="row">
							<span class="row-title">Each at its cheapest store</span>
							<span class="row-sub">{data.split.stores} stores</span>
							<span class="row-value">{money(data.split.cents)}</span>
						</li>
					{/if}
				</ul>
				<p class="note">Your last price at each store. Weighed items count as one pound.</p>
			{/if}

			<div class="list-label-row">
				<h2 class="list-label">Items</h2>
				<form method="POST" action="?/clear" use:enhance><button>Clear list</button></form>
			</div>
			<ul class="group">
				{#each data.items as item (item.name)}
					<li class="row item">
						<span class="row-title">{item.name}</span>
						<span class="row-sub">
							{#if item.prices.length}
								{item.prices.length > 1 ? 'Cheapest' : 'Only'} at {storeName(item.prices[0].store)}{item.prices.length > 1 ? ` · up to ${money(item.prices.at(-1)!.cents)} elsewhere` : ''}
							{:else}
								No price yet, not on your receipts
							{/if}
						</span>
						<span class="row-value">{item.lowest === null ? '' : money(item.lowest) + unit(item.per)}</span>
						<form method="POST" action="?/remove" use:enhance>
							<button class="remove" name="name" value={item.name} aria-label="Remove {item.name}">
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">Add what you plan to buy. Pricetrail shows what it costs at each store you shop at, from your own receipts.</p>
		{/if}
	</main>
</AppShell>

<style>
	main {
		max-width: 40rem;
	}

	.add {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	/* 16px text: iOS Safari zooms the page on any smaller field */
	.add input {
		flex: 1;
		min-width: 0;
		border: 1px solid color-mix(in srgb, var(--color-sep) 18%, transparent);
		border-radius: 999px;
		background: var(--color-surface);
		padding: 0.65rem 1rem;
		font-size: 1rem;
		color: var(--color-ink);
	}

	.add input:focus {
		border-color: var(--color-accent);
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
	}

	.quick {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.chip {
		min-height: 2.25rem;
		border-radius: 999px;
		background: var(--color-surface);
		padding: 0.35rem 0.85rem;
		font-size: 0.9375rem;
		color: var(--color-ink);
		transition: transform var(--quick) var(--ease);
	}

	.chip:active {
		transform: scale(0.96);
	}

	.chip:focus-visible,
	.remove:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	main :global(.list-label) {
		margin-top: 1.5rem;
	}

	.best .row-title,
	.best .row-value {
		color: var(--color-accent);
		font-weight: 600;
	}

	.row-sub {
		white-space: normal;
	}

	.item {
		grid-template-columns: minmax(0, 1fr) auto 2.75rem;
	}

	.item form {
		grid-column: 3;
		grid-row: 1 / span 2;
	}

	.remove {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		margin-right: -0.75rem;
		border-radius: 999px;
		color: var(--color-muted);
	}

	.remove svg {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}

	.note,
	.empty,
	.problem {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		line-height: 1.45;
		color: var(--color-muted);
	}

	.empty {
		margin-top: 1.5rem;
		font-size: 0.9375rem;
	}

	.problem {
		color: var(--color-up);
	}
</style>
