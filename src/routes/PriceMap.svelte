<script lang="ts">
	import { slide } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { directionsTo, isOld, itemPins, streetOf, townOf, type Pin, type Placed } from '../branches';
	import { shortMiles, type Point } from '../distance';
	import { money, shortDay, storeName } from '../format';
	import type { History } from '../price-history';
	import MapUnlock from './MapUnlock.svelte';
	import StoreMap from './StoreMap.svelte';

	// Where each branch sold this item, or a locked picture of a map until the shopper turns it on.
	// Picking a pin filters the price list to that store; its details open the store sheet.
	let {
		map,
		places,
		stores,
		history,
		only = $bindable(null),
		onstore,
		demo = false
	}: {
		map: { on: boolean; zip: string | null; you: Point | null };
		places: Placed[];
		stores: { id: string; name: string }[];
		history: History;
		only?: string | null;
		onstore?: (storeId: string) => void;
		demo?: boolean;
	} = $props();

	let opening = $state(false);
	let withAway = $state(false);
	let picked = $state<string | null>(null);

	const per = $derived(history.per === 'lb' ? '/lb' : '');
	const pins = $derived(itemPins(places, history.visits, withAway));
	const pin = $derived(pins.find((p) => `${p.storeId}@${p.key}` === picked) ?? null);
	// away stores that sold this item, so the offer to show them only appears when it adds something
	const awayCount = $derived(new Set(itemPins(places, history.visits, true).filter((p) => p.away && p.cents !== null).map((p) => p.storeId)).size);
	// stores this item was bought at that have no branch on the map yet
	const missing = $derived(history.stores.map((s) => s.store).filter((name) => !places.some((p) => p.name === name)).map((name) => stores.find((s) => s.name === name)).filter((s) => s !== undefined));
	const mapPins = $derived(
		pins.map((p) => ({
			id: `${p.storeId}@${p.key}`,
			lat: p.lat,
			lng: p.lng,
			label: p.cents === null ? null : `${money(p.cents)}${per}`,
			title: `${storeName(p.name)}${streetOf(p.address) ? `, ${streetOf(p.address)}` : ''}`,
			cheapest: p.cheapest,
			guess: p.guess
		}))
	);
	const still = $derived(prefersReducedMotion.current);

	// The answer in words: the nearest branch that has sold it to the shopper, and the cheapest one,
	// or one line when they are the same branch. Without the map, only the cheapest price paid.
	const sold = $derived(pins.filter((p) => p.cents !== null && !p.away));
	const nearestPin = $derived(sold.find((p) => p.nearest) ?? null);
	const cheapestPin = $derived(sold.find((p) => p.cheapest) ?? null);
	const idOf = (p: Pin) => `${p.storeId}@${p.key}`;
	const answers = $derived.by(() => {
		if (!nearestPin) return [];
		if (!cheapestPin || idOf(cheapestPin) === idOf(nearestPin)) return [{ label: cheapestPin ? 'Nearest and cheapest' : 'Nearest that has it', pin: nearestPin }];
		return [
			{ label: 'Nearest that has it', pin: nearestPin },
			{ label: 'Cheapest near you', pin: cheapestPin }
		];
	});
	const cheapestPaid = $derived(history.visits.reduce((low, v) => (v.unitCents < low.unitCents ? v : low), history.visits[0]));

	// another item clears the pick; a filter cleared from the chips clears it too
	const product = $derived(history.name);
	$effect.pre(() => {
		void product;
		picked = null;
	});
	$effect.pre(() => {
		if (only === null) picked = null;
	});

	function pick(id: string) {
		if (picked === id) {
			picked = null;
			only = null;
			return;
		}
		picked = id;
		only = pins.find((p) => `${p.storeId}@${p.key}` === id)?.name ?? null;
	}
</script>

{#snippet answer(label: string, store: string, where: string, cents: number, date: string | null, point: Pin | null)}
	<div class="answer">
		<span class="label">{label}</span>
		{#if point}
			<button type="button" class="store" onclick={() => pick(idOf(point))}>{store}<span class="where">{` · ${where}`}</span></button>
		{:else}
			<span class="store">{store}</span>
		{/if}
		<span class="paid">{money(cents)}{per}<span class="when" class:old={isOld(date)}>{` · ${date ? (isOld(date) ? `last there ${shortDay(date)}` : shortDay(date)) : 'no date'}`}</span></span>
		{#if point}<a class="go" href={directionsTo(point)} target="_blank" rel="noopener">Directions</a>{/if}
	</div>
{/snippet}

{#if map.on}
	{#if answers.length}
		<div class="answers">
			{#each answers as line (line.label)}
				{@const where = [streetOf(line.pin.address), shortMiles(line.pin.miles)].filter(Boolean).join(' · ')}
				{@render answer(line.label, storeName(line.pin.name) ?? line.pin.name, where, line.pin.cents!, line.pin.date, line.pin)}
			{/each}
			{#if sold.length > 1}<p class="count">Bought at {sold.length} of your stores nearby</p>{/if}
		</div>
	{/if}
	<div class="price-map">
		<div class="frame">
			<StoreMap you={map.you} pins={mapPins} selected={picked} onpick={pick} label="Where you bought {history.name}" />
		</div>
		<div class="under">
			{#if pin}
				<p class="picked" transition:slide={{ duration: still ? 0 : 200 }}>
					<span class="where">
						{[storeName(pin.name), streetOf(pin.address), pin.away ? (townOf(pin.address) ?? 'away') : shortMiles(pin.miles), pin.guess ? 'probably' : null].filter(Boolean).join(' · ')}
					</span>
					{#if onstore}<button type="button" class="link" onclick={() => onstore(pin.storeId)}>Store details</button>{/if}
				</p>
			{:else}
				<p class="hint">
					{#if pins.some((p) => p.cents !== null)}Tap a price to see only that store.{:else}No branch on the map sold this yet.{/if}
				</p>
			{/if}
			{#if awayCount && !demo}
				<button type="button" class="link quiet" onclick={() => (withAway = !withAway)}>
					{withAway ? 'Home area only' : `${awayCount} ${awayCount === 1 ? 'store' : 'stores'} away from home · Show`}
				</button>
			{/if}
			{#each missing as store (store.id)}
				<p class="missing">
					{storeName(store.name)} isn’t on the map yet.
					{#if onstore}<button type="button" class="link" onclick={() => onstore(store.id)}>Add it</button>{/if}
				</p>
			{/each}
		</div>
	</div>
{:else}
	{#if cheapestPaid && history.stores.length > 1}
		<div class="answers">
			{@render answer('Lowest you’ve paid', storeName(cheapestPaid.store) ?? 'Unknown store', '', cheapestPaid.unitCents, cheapestPaid.date, null)}
		</div>
	{/if}
	<!-- locked: a picture of a map, never a real one, until the shopper turns it on -->
	<div class="locked">
		<div class="picture" aria-hidden="true"></div>
		{#if opening}
			<div class="sheet" transition:slide={{ duration: still ? 0 : 260 }}>
				<p class="title">Where you paid what</p>
				<MapUnlock ondone={() => (opening = false)} />
			</div>
		{:else}
			<div class="ask">
				<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
				<p class="title">See your stores on a map</p>
				<p class="sub">Each branch with what you paid there, and which is nearest.</p>
				<button type="button" class="pill-button" onclick={() => (opening = true)}>Show my stores on a map</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.price-map,
	.locked {
		margin: 0.75rem -0.5rem 0;
	}

	/* the answer, in words, before the map: label, store, what was paid and when, a way there */
	.answers {
		display: grid;
		gap: 0.15rem;
		margin-top: 1rem;
	}

	.answer {
		display: grid;
		grid-template-columns: 10.5rem minmax(0, 1fr) auto auto;
		align-items: baseline;
		gap: 0.25rem 1rem;
		padding: 0.35rem 0;
		font-size: 0.9375rem;
	}

	.label {
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.answer .store {
		overflow: hidden;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 600;
		color: var(--color-ink);
	}

	button.store {
		border-radius: 6px;
		transition: color var(--quick) var(--ease);
	}

	button.store:hover {
		color: var(--color-accent);
	}

	button.store:focus-visible,
	.go:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.answer .where {
		font-weight: 400;
		color: var(--color-muted);
	}

	.paid {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.when {
		font-weight: 400;
		color: var(--color-ink);
	}

	.when.old {
		color: var(--color-muted);
	}

	.go {
		font-size: 0.875rem;
		color: var(--color-accent);
		white-space: nowrap;
	}

	.go:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.count {
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	/* on a phone each answer stacks: the label, the store, then price and the way there */
	@media (max-width: 640px) {
		.answer {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: 'label label' 'store store' 'paid go';
			gap: 0.1rem 0.75rem;
			padding: 0.5rem 0;
		}

		.answer + .answer {
			border-top: 1px solid rgb(60 60 67 / 0.12);
		}

		.label {
			grid-area: label;
		}

		.answer .store {
			grid-area: store;
			white-space: normal;
		}

		.paid {
			grid-area: paid;
		}

		.go {
			grid-area: go;
		}
	}

	.frame {
		overflow: hidden;
		height: 13rem;
		border-radius: 14px;
		box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.08);
		isolation: isolate;
	}

	.under {
		display: grid;
		justify-items: start;
		gap: 0.35rem;
		padding: 0.6rem 0.25rem 0;
		font-size: 0.875rem;
	}

	.picked {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.75rem;
	}

	.hint,
	.missing {
		color: var(--color-muted);
	}

	.link {
		border-radius: 6px;
		color: var(--color-accent);
		transition: opacity var(--quick) var(--ease);
	}

	.link:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.link:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.link.quiet {
		font-size: 0.8125rem;
	}

	/* the locked map: our own drawn streets, softened, with the ask resting on top */
	.locked {
		position: relative;
		overflow: hidden;
		border-radius: 14px;
		background: #f2f2f4;
		box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.08);
	}

	.picture {
		position: absolute;
		inset: 0;
		background: url('/images/street-map.webp') center / cover;
		opacity: 0.8;
		filter: saturate(0.7) blur(0.6px);
		transform: scale(1.04);
	}

	.ask,
	.sheet {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 0.35rem;
		padding: 1.75rem 1.25rem 1.5rem;
		text-align: center;
		background: radial-gradient(closest-side, rgb(255 255 255 / 0.92), rgb(255 255 255 / 0.6) 70%, transparent);
	}

	.sheet {
		justify-items: stretch;
		text-align: left;
		margin: 0.75rem;
		border-radius: 14px;
		background: rgb(255 255 255 / 0.94);
		box-shadow:
			0 10px 30px -10px rgb(0 0 0 / 0.25),
			0 0 0 0.5px rgb(0 0 0 / 0.06);
		padding: 1rem 1.1rem 1.1rem;
	}

	.ask svg {
		width: 1.6rem;
		height: 1.6rem;
		fill: none;
		stroke: var(--color-ink);
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.title {
		font-family: var(--font-display);
		font-size: 1.0625rem;
		font-weight: 650;
		letter-spacing: -0.01em;
	}

	.sub {
		max-width: 30ch;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.ask .pill-button {
		margin-top: 0.6rem;
	}

	@media (max-width: 480px) {
		.price-map,
		.locked {
			margin-inline: -0.25rem;
		}

		.frame {
			height: 10rem;
		}
	}
</style>
