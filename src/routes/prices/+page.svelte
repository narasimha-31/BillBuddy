<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { storeTags } from '../../store-facts';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import AppShell from '../AppShell.svelte';
	import ItemPicker from '../ItemPicker.svelte';
	import PriceHistory from '../PriceHistory.svelte';

	let { data } = $props();

	// the chip lights up at once; the history follows when the server answers
	let picked = $state<string | null>(null);
	const selected = $derived(picked ?? data.selected ?? '');

	let history = $state<HTMLElement>();

	// Where the shopper is stays in this page's memory: it is never sent or saved. Only the choice to
	// use it is remembered on this device, so the browser can be asked again on the next visit.
	const REMEMBER = 'billbuddy-nearest';
	let here = $state<{ lat: number; lng: number } | null>(null);
	let locating = $state(false);
	let locateProblem = $state('');
	const anyPoint = $derived(data.places.some((p) => p.lat !== null));
	// nearest among the stores that sold this item; the usual store is the same for every item
	const sold = $derived(new Set(data.history?.stores.map((s) => s.store) ?? []));
	const tags = $derived(storeTags(data.places.filter((p) => sold.has(p.name)), data.usual, here));

	function locate() {
		locating = true;
		locateProblem = '';
		navigator.geolocation.getCurrentPosition(
			(found) => {
				here = { lat: found.coords.latitude, lng: found.coords.longitude };
				locating = false;
				try {
					localStorage.setItem(REMEMBER, 'on');
				} catch {
					// private windows refuse storage; the button simply shows again next time
				}
			},
			(failed) => {
				locating = false;
				locateProblem = failed.code === failed.PERMISSION_DENIED ? 'Location is off for this site in your browser.' : 'Couldn’t find where you are. Try again.';
			},
			{ maximumAge: 600_000, timeout: 10_000 }
		);
	}

	function forget() {
		here = null;
		try {
			localStorage.removeItem(REMEMBER);
		} catch {
			// nothing was stored
		}
	}

	onMount(() => {
		let remembered = false;
		try {
			remembered = localStorage.getItem(REMEMBER) === 'on';
		} catch {
			// storage blocked: start with location off
		}
		if (remembered && anyPoint && 'geolocation' in navigator) locate();
	});

	// on a phone the history sits below the list, so it is brought into view once it arrives
	async function pick(name: string) {
		picked = name;
		await goto(`?item=${encodeURIComponent(name)}`, { replaceState: true, noScroll: true, keepFocus: true });
		// on a phone, picking from an aisle below the history brings the history back into view
		const top = history?.getBoundingClientRect().top ?? 0;
		if (matchMedia('(max-width: 959px)').matches && (top < 0 || top > innerHeight * 0.6))
			history?.scrollIntoView({ behavior: prefersReducedMotion.current ? 'auto' : 'smooth' });
	}
</script>

<svelte:head>
	<title>Prices · BillBuddy</title>
</svelte:head>

<AppShell fit firstName={data.firstName}>
	<main>
		<div class="head">
			<div>
				<h1 class="large-title">Prices</h1>
				<p class="ask">What did I pay last time?</p>
			</div>
			{#if anyPoint}
				<div class="near">
					{#if here}
						<button class="place on" onclick={forget}>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
							Nearest shown · Turn off
						</button>
					{:else}
						<button class="place" onclick={locate} disabled={locating}>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
							{locating ? 'Finding you…' : 'Show nearest store'}
						</button>
					{/if}
					{#if locateProblem}<p class="problem" role="alert">{locateProblem}</p>{/if}
				</div>
			{/if}
		</div>

		{#if data.products.length}
			<div class="columns">
				<div class="picker">
					<ItemPicker items={data.products} bind:selected={() => selected, pick} />
				</div>
				<div class="history scroll-area" bind:this={history}>
					{#key data.selected}
						{#if data.history}
							<div in:fade={{ duration: 250 }}>
								<PriceHistory history={data.history} {tags} />
							</div>
						{/if}
					{/key}
				</div>
			</div>
		{:else}
			<p class="lead">
				Your prices show up here once a receipt is read. <a href="/home">Add a receipt</a> or
				<a href="/demo">see how it looks</a> with a sample shopper.
			</p>
		{/if}
	</main>
</AppShell>

<style>
	.ask {
		margin-top: 0.3rem;
		font-size: 1.0625rem;
		color: var(--color-muted);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem 1.5rem;
	}

	.near {
		display: grid;
		justify-items: end;
		gap: 0.3rem;
	}

	.place {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 999px;
		background: #fff;
		padding: 0.5rem 0.95rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-accent);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
	}

	.place.on {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		box-shadow: none;
	}

	.place:disabled {
		color: var(--color-muted);
	}

	.place:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.place svg {
		width: 1.1rem;
		height: 1.1rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
	}

	.problem {
		font-size: 0.8125rem;
		color: var(--color-up);
	}

	@media (max-width: 640px) {
		.near {
			justify-items: start;
		}
	}

	.columns {
		display: grid;
		gap: 2rem;
		margin-top: 1.5rem;
	}

	/* on a phone the price comes straight after the items tapped most; the aisles follow it */
	@media (max-width: 959px) {
		.columns {
			display: flex;
			flex-direction: column;
			gap: 0;
		}

		.picker {
			display: contents;
		}

		.history {
			order: 2;
			margin-top: 1.5rem;
		}

		.picker > :global(h2:nth-of-type(2)),
		.picker > :global(.aisles) {
			order: 3;
		}
	}

	.history {
		scroll-margin-top: 5rem;
	}

	/* the history stays in view while the list beside it is browsed */
	@media (min-width: 960px) {
		.columns {
			grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
			align-items: start;
			gap: 3rem;
		}

		.history {
			position: sticky;
			top: 1.5rem;
		}
	}

	.lead {
		margin-top: 0.5rem;
		color: var(--color-muted);
	}

	.lead a {
		color: var(--color-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	/* on a laptop the page is one screen tall; the item list and the history each scroll on their own */
	@media (min-width: 1024px) and (min-height: 600px) {
		main {
			display: flex;
			flex: 1;
			flex-direction: column;
			min-height: 0;
		}

		.columns {
			flex: 1;
			min-height: 0;
			grid-template-rows: minmax(0, 1fr);
			align-items: stretch;
		}

		/* search and the most bought stay put; only the aisles (or the search results) scroll */
		.picker {
			display: flex;
			flex-direction: column;
			min-height: 0;
			padding: 3px 0 0 3px;
		}

		.picker > :global(*) {
			flex: none;
		}

		.picker > :global(.aisles),
		.picker > :global(.found),
		.history {
			flex: 0 1 auto;
			position: static;
		}
	}
</style>
