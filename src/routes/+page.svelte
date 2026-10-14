<script lang="ts">
	import { onMount } from 'svelte';
	import { animate, inView } from 'motion';
	import NumberFlow from '@number-flow/svelte';
	import GoogleButton from './GoogleButton.svelte';
	import Wordmark from './Wordmark.svelte';

	let { data } = $props();

	// a sample shopper's last banana price at each store; the numbers roll in when the card is seen
	const stores = [
		{ name: 'Parivar Grocers', cents: 49 },
		{ name: 'H-E-B', cents: 50 },
		{ name: 'Fiesta Mart', cents: 59 }
	];
	// the real prices show by default; they only start from zero once the page can roll them in
	let shown = $state(stores.map((s) => s.cents));

	// what the receipt printed, and what BillBuddy understood
	const lines = [
		{ printed: 'FS BANANA LB-3037', name: 'Bananas', detail: '2.88 lb at $0.59', cents: 170 },
		{ printed: 'FS OKRA (BHINDI) 1LB', name: 'Okra', detail: '1.19 lb at $2.97', cents: 353 },
		{ printed: 'MARUCHAN RMN CHKN', name: 'Chicken ramen', detail: '3 at $0.50', cents: 150 },
		{ printed: 'HEB WHOLE MILK 64OZ', name: 'Whole milk', detail: 'half gallon', cents: 389 }
	];

	const promises = ['Your card number is never kept.', 'The photo is deleted once it’s read.', 'Nothing is sold or shared. Ever.'];

	// Number Flow renders differently on the server, so the plain price is drawn until the page is live
	let live = $state(false);
	let storesCard: HTMLElement;
	let promiseList: HTMLElement;

	onMount(() => {
		live = true;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		shown = stores.map(() => 0);
		const stopPrices = inView(storesCard, () => {
			shown = stores.map((s) => s.cents);
		}, { amount: 0.5 });

		// the promises arrive one after another, each settling on a spring
		const items = promiseList.querySelectorAll('li');
		items.forEach((li) => ((li as HTMLElement).style.opacity = '0'));
		const stopPromises = inView(promiseList, () => {
			items.forEach((li, i) =>
				animate(li, { opacity: [0, 1], transform: ['translateY(24px)', 'none'] }, { type: 'spring', bounce: 0, duration: 0.9, delay: i * 0.18 })
			);
		}, { amount: 0.4 });
		return () => {
			stopPrices();
			stopPromises();
		};
	});

	const dollars = (cents: number) => cents / 100;
	const usd = { style: 'currency', currency: 'USD' } as const;
	const money = new Intl.NumberFormat('en-US', usd);
</script>

<svelte:head>
	<title>BillBuddy · Know what you paid last time</title>
	<meta name="description" content="Snap any grocery receipt. BillBuddy remembers every price, at every store you shop." />
</svelte:head>

<header class="bar">
	<Wordmark />
	<nav>
		<a href="/demo">Try the demo</a>
		<a href="/privacy">Privacy</a>
	</nav>
</header>

<main>
	<section class="hero">
		<h1>Know what you paid last time.</h1>
		<p class="lead">Snap any grocery receipt. BillBuddy remembers every price, at every store you shop.</p>
		{#if data.signInFailed}<p class="failed" role="alert">Sign-in didn’t go through. Try again.</p>{/if}
		<div class="actions">
			<GoogleButton />
			<a class="quiet" href="/demo">Try the demo</a>
		</div>
		<figure class="photo">
			<img
				src="/images/hero-receipt-2048.webp"
				srcset="/images/hero-receipt-1024.webp 1024w, /images/hero-receipt-2048.webp 2048w"
				sizes="(min-width: 1200px) 1120px, 92vw"
				width="2048"
				height="1020"
				alt="A hand holding a long grocery receipt in a bright produce aisle"
				fetchpriority="high"
			/>
		</figure>
	</section>

	<section class="snap">
		<div class="copy">
			<h2>Crumpled. Faded. Abbreviated. Read anyway.</h2>
			<p>
				BillBuddy reads every line of a real receipt, turns store shorthand into plain names, and checks every total
				with simple math. It never guesses a price.
			</p>
		</div>
		<div class="stage">
			<img
				class="pile"
				src="/images/receipts-flat-2048.webp"
				srcset="/images/receipts-flat-1024.webp 1024w, /images/receipts-flat-2048.webp 2048w"
				sizes="(min-width: 1000px) 640px, 92vw"
				width="2048"
				height="1152"
				alt="Four long crumpled grocery receipts on a grey table"
				loading="lazy"
			/>
			<div class="readout">
				<p class="store">Fiesta Mart · Oct 2</p>
				<ul>
					{#each lines as line (line.printed)}
						<li>
							<span class="printed">{line.printed}</span>
							<span class="name">{line.name}</span>
							<span class="price">{money.format(dollars(line.cents))}</span>
							<span class="detail">{line.detail}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<section class="stores">
		<h2>Every store. One price.</h2>
		<p class="sub">The same bananas from three stores line up as one product, so you can see where they’re cheaper.</p>
		<div class="card" bind:this={storesCard}>
			<div class="card-head">
				<span>Bananas</span>
				<span class="unit">price per lb</span>
			</div>
			<ul>
				{#each stores as store, i (store.name)}
					<li class:best={i === 0}>
						<span>{store.name}</span>
						{#if i === 0}<span class="tag">Cheapest</span>{/if}
						<span class="money">
							{#if live}<NumberFlow value={dollars(shown[i])} format={usd} />{:else}{money.format(dollars(store.cents))}{/if}
						</span>
					</li>
				{/each}
			</ul>
			<p class="note">Sample prices from a sample shopper.</p>
		</div>
	</section>

	<section class="private">
		<h2>Private by design.</h2>
		<ul bind:this={promiseList}>
			{#each promises as promise (promise)}<li>{promise}</li>{/each}
		</ul>
		<a class="fine" href="/privacy">Read the fine print</a>
	</section>

	<section class="close">
		<h2>Start with your last receipt.</h2>
		<div class="actions">
			<GoogleButton />
			<a class="quiet" href="/demo">Try the demo</a>
		</div>
	</section>
</main>

<footer>
	<Wordmark />
	<span>Prices on this page come from a sample shopper.</span>
</footer>

<style>
	.bar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem max(1.25rem, calc((100% - 73.5rem) / 2));
		background: color-mix(in srgb, var(--color-bg) 85%, transparent);
		backdrop-filter: saturate(1.6) blur(18px);
	}

	nav {
		display: flex;
		gap: 1.5rem;
		font-size: 0.9375rem;
	}

	nav a,
	.quiet,
	.fine {
		color: var(--color-ink);
	}

	@media (hover: hover) {
		nav a:hover,
		.fine:hover {
			color: var(--color-accent);
		}
	}

	section {
		margin: 0 auto;
		max-width: 76rem;
		padding: 0 1.25rem;
	}

	h1,
	h2 {
		font-family: var(--font-display);
		font-weight: 650;
		letter-spacing: -0.035em;
		text-wrap: balance;
		color: var(--color-ink);
	}

	h1 {
		font-size: clamp(2.75rem, 7vw, 5.5rem);
		line-height: 1.02;
	}

	h2 {
		font-size: clamp(2.1rem, 4.6vw, 3.75rem);
		line-height: 1.05;
	}

	.hero {
		padding-top: clamp(3rem, 9vh, 6.5rem);
		text-align: center;
	}

	.lead {
		margin: 1.25rem auto 0;
		max-width: 34rem;
		font-size: clamp(1.15rem, 1.8vw, 1.4rem);
		line-height: 1.45;
		color: var(--color-muted);
		text-wrap: pretty;
	}

	.failed {
		margin-top: 1rem;
		color: var(--color-up);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.75rem 1.75rem;
		margin-top: 2rem;
	}

	.quiet {
		border-radius: 999px;
		padding: 0.75rem 1.25rem;
		font-size: 1.0625rem;
		font-weight: 500;
		box-shadow: inset 0 0 0 1px var(--color-line);
		transition: box-shadow 200ms;
	}

	@media (hover: hover) {
		.quiet:hover {
			box-shadow: inset 0 0 0 1px var(--color-ink);
		}
	}

	.quiet:focus-visible,
	nav a:focus-visible,
	.fine:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	.photo {
		margin-top: clamp(2.5rem, 7vh, 4.5rem);
	}

	.photo img {
		width: 100%;
		height: auto;
		border-radius: 28px;
		box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.25);
	}

	/* the photo settles from slightly smaller to full size as it scrolls into place */
	@supports (animation-timeline: view()) {
		@media (prefers-reduced-motion: no-preference) {
			.photo img {
				animation: settle linear both;
				animation-timeline: view();
				animation-range: entry 0% cover 45%;
			}

			.readout {
				animation: rise linear both;
				animation-timeline: view();
				animation-range: entry 10% cover 50%;
			}
		}
	}

	@keyframes settle {
		from {
			transform: scale(0.9);
			opacity: 0.6;
		}
	}

	@keyframes rise {
		from {
			transform: translateY(60px);
			opacity: 0;
		}
	}

	.snap {
		display: grid;
		gap: 2.5rem;
		margin-top: clamp(6rem, 16vh, 10rem);
	}

	.copy p,
	.sub {
		margin-top: 1.25rem;
		max-width: 32rem;
		font-size: 1.1875rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	.stage {
		position: relative;
	}

	.pile {
		width: 100%;
		height: auto;
		border-radius: 28px;
	}

	.readout {
		position: relative;
		margin: -5rem 1rem 0 auto;
		max-width: 26rem;
		border-radius: 22px;
		background: #fff;
		padding: 1.25rem 1.4rem;
		box-shadow: 0 24px 50px -20px rgb(0 0 0 / 0.28);
	}

	.store {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted);
	}

	.readout li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0 1rem;
		border-top: 1px solid var(--color-receipt-line);
		padding: 0.65rem 0;
	}

	.readout li:first-child {
		margin-top: 0.6rem;
	}

	.printed {
		grid-column: 1 / -1;
		font-size: 0.75rem;
		letter-spacing: 0.02em;
		color: var(--color-muted);
	}

	.name {
		font-weight: 600;
	}

	.detail {
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.price {
		grid-row: 2 / span 2;
		grid-column: 2;
		align-self: center;
		font-weight: 600;
	}

	@media (min-width: 1000px) {
		.snap {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			align-items: center;
			gap: 4rem;
		}

		.copy {
			position: sticky;
			top: 30vh;
			align-self: start;
		}
	}

	.stores {
		margin-top: clamp(6rem, 16vh, 10rem);
		max-width: none;
		background: var(--color-raised);
		padding: clamp(4.5rem, 12vh, 7.5rem) 1.25rem;
		text-align: center;
	}

	.stores .sub {
		margin-inline: auto;
	}

	.card {
		margin: 3rem auto 0;
		max-width: 30rem;
		border-radius: 24px;
		background: #fff;
		padding: 1.5rem 1.6rem 1.25rem;
		text-align: left;
		box-shadow: 0 24px 50px -28px rgb(0 0 0 / 0.25);
	}

	.card-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-size: 1.375rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.unit {
		font-size: 0.875rem;
		font-weight: 400;
		letter-spacing: 0;
		color: var(--color-muted);
	}

	.card li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border-top: 1px solid var(--color-receipt-line);
		padding: 0.95rem 0;
		font-size: 1.0625rem;
	}

	.card li:first-child {
		margin-top: 0.75rem;
	}

	.money {
		margin-left: auto;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.best .money {
		color: var(--color-accent);
	}

	.tag {
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		padding: 0.15rem 0.55rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-accent);
	}

	.note {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.private {
		padding-top: clamp(6rem, 16vh, 10rem);
	}

	.private ul {
		display: grid;
		gap: 1rem;
		margin-top: 2.5rem;
	}

	.private li {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 3.4vw, 2.75rem);
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1.15;
		color: var(--color-ink);
	}

	.fine {
		display: inline-block;
		margin-top: 2rem;
		font-size: 1.0625rem;
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	.close {
		padding: clamp(6rem, 16vh, 10rem) 1.25rem clamp(5rem, 12vh, 8rem);
		text-align: center;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 auto;
		max-width: 76rem;
		border-top: 1px solid var(--color-line);
		padding: 1.5rem 1.25rem 2.5rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	:global(::selection) {
		background: color-mix(in srgb, var(--color-accent) 22%, transparent);
	}
</style>
