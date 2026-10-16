<script lang="ts">
	import { onMount } from 'svelte';
	import { animate, inView } from 'motion';
	import NumberFlow from '@number-flow/svelte';
	import GoogleButton from './GoogleButton.svelte';
	import PhoneTour from './PhoneTour.svelte';
	import SiteFooter from './SiteFooter.svelte';
	import Wordmark from './Wordmark.svelte';
	import { cartTotals, comparisons, priceOf } from './store-prices';

	let { data } = $props();

	// Every price here is a sourced 2026 shelf price; every sum and gap is worked out below, in cents.
	const PACK_LB = 3;
	const pack = (store: string) => Math.round(priceOf(store, 'chicken')! * PACK_LB * 100);
	const slips = [
		{ store: 'Wegmans', printed: 'WEG BNLS SKNLS CHKN BRST', perLb: priceOf('Wegmans', 'chicken')!, cents: pack('Wegmans') },
		{ store: 'Target', printed: 'GG BNLS CHKN BRST', perLb: priceOf('Target', 'chicken')!, cents: pack('Target') }
	];
	const gap = slips[1].cents - slips[0].cents;

	const chicken = comparisons().find((c) => c.key === 'chicken')!.prices;
	const eggs = comparisons().find((c) => c.key === 'eggs')!.prices;

	const carts = cartTotals();
	const weekly = carts.at(-1)!.cents - carts[0].cents;
	const yearlyDollars = Math.round((weekly * 52) / 100);

	// what a Walmart receipt printed, and what BillBuddy understood
	const walmart = (product: Parameters<typeof priceOf>[1]) => priceOf('Walmart', product)!;
	const lines = [
		{ printed: 'GV LG EGGS 12CT', name: 'Large eggs, 12 ct', detail: 'Great Value', cents: Math.round(walmart('eggs') * 100) },
		{ printed: 'BANANAS', name: 'Bananas', detail: `2.10 lb at $${walmart('bananas').toFixed(2)}`, cents: Math.round(2.1 * walmart('bananas') * 100) },
		{ printed: 'GV WHL MLK GAL', name: 'Whole milk, 1 gal', detail: 'Great Value', cents: Math.round(walmart('milk') * 100) },
		{ printed: 'FRSH CHKN BRST BNLS', name: 'Chicken breast', detail: `1.62 lb at $${walmart('chicken').toFixed(2)}`, cents: Math.round(1.62 * walmart('chicken') * 100) }
	];

	// the real numbers show by default; they only start from zero once the page can roll them in
	let gapShown = $state(gap);
	let cartShown = $state(carts.map((c) => c.cents));

	const promises = ['Your card number is never kept.', 'The photo is deleted once it’s read.', 'Nothing is sold or shared. Ever.'];

	// Number Flow renders differently on the server, so the plain price is drawn until the page is live
	let live = $state(false);
	let gapMark = $state<HTMLElement>();
	let cartList: HTMLElement;
	let promiseList: HTMLElement;

	onMount(() => {
		live = true;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		gapShown = 0;
		cartShown = carts.map(() => 0);
		const stopGap = inView(gapMark!, () => {
			gapShown = gap;
		}, { amount: 0.8 });
		const stopCart = inView(cartList, () => {
			cartShown = carts.map((c) => c.cents);
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
			stopGap();
			stopCart();
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
	<div class="site-top">
		<Wordmark />
		<nav>
			<a href="/demo">Try the demo</a>
			<a href="/privacy">Privacy</a>
		</nav>
	</div>
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

	<section class="problem">
		<h2>Same chicken. {money.format(dollars(gap))} apart.</h2>
		<p class="sub">
			Three pounds of boneless chicken breast: {money.format(dollars(slips[0].cents))} at Wegmans, {money.format(
				dollars(slips[1].cents)
			)} at Target. You’d never know. The receipts end up in different drawers.
		</p>
		<div class="counter">
			<img
				src="/images/receipts-apart-2048.webp"
				srcset="/images/receipts-apart-1024.webp 1024w, /images/receipts-apart-2048.webp 2048w"
				sizes="(min-width: 1200px) 1120px, 92vw"
				width="2048"
				height="807"
				alt="Two crumpled grocery receipts lying apart on a kitchen counter"
				loading="lazy"
			/>
			<div class="slips">
				{#each slips as slip, i (slip.store)}
					<article class="slip" class:dear={i === 1}>
						<p class="slip-store">{slip.store}</p>
						<p class="slip-printed">{slip.printed}</p>
						<p class="slip-detail">{PACK_LB.toFixed(2)} lb at {money.format(slip.perLb)}/lb</p>
						<p class="slip-total">{money.format(dollars(slip.cents))}</p>
					</article>
					{#if i === 0}
						<p class="gap" bind:this={gapMark}>
							<span>+</span>{#if live}<NumberFlow value={dollars(gapShown)} format={usd} />{:else}{money.format(dollars(gap))}{/if}
						</p>
					{/if}
				{/each}
			</div>
		</div>
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
				<p class="store">Walmart · Oct 9</p>
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

	<PhoneTour />

	<section class="stores">
		<h2>Every store. One price.</h2>
		<p class="sub">
			Each store prints chicken its own way. BillBuddy lines them up as one product, so the cheaper store is plain to
			see.
		</p>
		<div class="card">
			<div class="card-head">
				<span>Chicken breast</span>
				<span class="unit">per lb · {PACK_LB} lb pack</span>
			</div>
			<ul>
				{#each chicken as row, i (row.store)}
					<li class:best={i === 0}>
						<span>{row.store}</span>
						{#if i === 0}<span class="tag">Cheapest</span>{/if}
						<span class="per">{money.format(row.price)}</span>
						<span class="money">{money.format(dollars(Math.round(row.price * PACK_LB * 100)))}</span>
					</li>
				{/each}
			</ul>
		</div>
		<p class="fact">
			Eggs are the extreme: {money.format(eggs[0].price)} a dozen at <span class="whole">{eggs[0].store}</span>,
			{money.format(eggs.at(-1)!.price)} at <span class="whole">{eggs.at(-1)!.store}</span>. Almost double.
		</p>
	</section>

	<section class="cart">
		<h2>Same cart. {money.format(dollars(weekly))} a week apart.</h2>
		<p class="sub">Milk, eggs, chicken, ground beef, peanut butter, pasta and bananas. One of each, at four big chains.</p>
		<ul class="totals" bind:this={cartList}>
			{#each carts as cart, i (cart.store)}
				<li class:best={i === 0}>
					<span class="who">{cart.store}{#if i === 0}<span class="tag">Cheapest</span>{/if}</span>
					<span class="meter"><span style:--size={cartShown[i] / carts.at(-1)!.cents}></span></span>
					<span class="money">
						{#if live}<NumberFlow value={dollars(cartShown[i])} format={usd} />{:else}{money.format(dollars(cart.cents))}{/if}
					</span>
				</li>
			{/each}
		</ul>
		<p class="year">Buy that every week and the gap is about ${yearlyDollars} a year.</p>
		<div class="ask">
			<p>See which store is cheaper for you.</p>
			<GoogleButton />
		</div>
	</section>

	<section class="private">
		<h2>Private by design.</h2>
		<ul bind:this={promiseList}>
			{#each promises as promise (promise)}<li>{promise}</li>{/each}
		</ul>
		<a class="fine" href="/privacy">How we handle your receipts</a>
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
	<span class="sources">
		Prices are typical 2026 shelf prices from published store price lists and local price trackers. Distances and the
		usual store belong to a sample shopper. Your own receipts replace all of it.
	</span>
	<SiteFooter />
</footer>

<style>
	.bar {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--color-bg) 85%, transparent);
		backdrop-filter: saturate(1.6) blur(18px);
	}

	nav {
		display: flex;
		margin-left: auto;
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

	.per {
		margin-left: auto;
		min-width: 3.5rem;
		text-align: right;
		color: var(--color-muted);
	}

	.money {
		min-width: 4.5rem;
		text-align: right;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.fact {
		margin: 2rem auto 0;
		max-width: 30rem;
		font-size: 1.1875rem;
		line-height: 1.5;
		color: var(--color-ink);
		text-wrap: balance;
	}

	.whole {
		white-space: nowrap;
	}

	/* the problem: the same chicken on two receipts that never meet */
	.problem {
		margin-top: clamp(6rem, 16vh, 10rem);
	}

	.counter {
		position: relative;
		margin-top: 2.5rem;
	}

	.counter img {
		width: 100%;
		height: auto;
		border-radius: 28px;
	}

	.slips {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.75rem 1.25rem;
		margin-top: -4rem;
		padding: 0 1rem;
	}

	.slip {
		width: min(100%, 16rem);
		border-radius: 20px;
		background: #fff;
		padding: 1rem 1.15rem;
		box-shadow: 0 24px 50px -24px rgb(0 0 0 / 0.3);
	}

	.slip-store {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted);
	}

	.slip-printed {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		letter-spacing: 0.02em;
		color: var(--color-muted);
	}

	.slip-detail {
		margin-top: 0.15rem;
		font-size: 0.9375rem;
		color: var(--color-ink);
	}

	.slip-total {
		margin-top: 0.35rem;
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-ink);
	}

	.dear .slip-total {
		color: var(--color-up);
	}

	.gap {
		display: flex;
		align-items: center;
		border-radius: 999px;
		background: #fff;
		padding: 0.5rem 1rem;
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--color-up);
		box-shadow: 0 12px 30px -14px rgb(0 0 0 / 0.3);
	}

	/* same cart, four chains: the bars grow with the totals as they roll in */
	.cart {
		padding-top: clamp(6rem, 16vh, 10rem);
		text-align: center;
	}

	.cart .sub {
		margin-inline: auto;
	}

	.totals {
		margin: 3rem auto 0;
		max-width: 40rem;
		border-radius: 24px;
		background: #fff;
		padding: 0.5rem 1.5rem;
		text-align: left;
		box-shadow: 0 24px 50px -28px rgb(0 0 0 / 0.25);
	}

	.totals li {
		display: grid;
		grid-template-columns: 9rem minmax(0, 1fr) 5.5rem;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0;
		font-size: 1.0625rem;
	}

	.totals li + li {
		border-top: 1px solid var(--color-receipt-line);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.meter {
		height: 0.55rem;
		border-radius: 999px;
		background: #ececf0;
	}

	.meter span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: #aeaeb2;
		transform-origin: left;
		transform: scaleX(var(--size));
		transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.best .meter span {
		background: var(--color-accent);
	}

	.totals .money {
		min-width: 0;
	}

	.year {
		margin-top: 1.75rem;
		font-family: var(--font-display);
		font-size: clamp(1.4rem, 2.6vw, 2rem);
		font-weight: 650;
		letter-spacing: -0.025em;
		color: var(--color-ink);
		text-wrap: balance;
	}

	.ask {
		display: grid;
		justify-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.ask p {
		font-size: 1.1875rem;
		color: var(--color-muted);
	}

	@media (max-width: 560px) {
		.totals {
			padding: 0.25rem 1rem;
		}

		.totals li {
			grid-template-columns: minmax(0, 1fr) 4.75rem;
			gap: 0.4rem 0.75rem;
		}

		.meter {
			grid-column: 1 / -1;
			grid-row: 2;
		}

		.card li {
			flex-wrap: wrap;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.meter span {
			transition: none;
		}
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

	footer :global(.site-footer) {
		flex-basis: 100%;
	}

	.sources {
		max-width: 40rem;
		line-height: 1.5;
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
