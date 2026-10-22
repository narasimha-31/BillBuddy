<script lang="ts">
	import { onMount } from 'svelte';
	import { inView } from 'motion';
	import NumberFlow from '@number-flow/svelte';
	import GoogleButton from './GoogleButton.svelte';
	import PhoneTour from './PhoneTour.svelte';
	import SiteFooter from './SiteFooter.svelte';
	import Wordmark from './Wordmark.svelte';
	import { cartTotals, priceOf } from './store-prices';

	let { data } = $props();

	// Every price here is a sourced 2026 shelf price; every sum and gap is worked out below, in cents.
	const PACK_LB = 3;
	const pack = (store: string) => Math.round(priceOf(store, 'chicken')! * PACK_LB * 100);
	const slips = [
		{ store: 'Wegmans', printed: 'WEG BNLS SKNLS CHKN BRST', perLb: priceOf('Wegmans', 'chicken')!, cents: pack('Wegmans') },
		{ store: 'Target', printed: 'GG BNLS CHKN BRST', perLb: priceOf('Target', 'chicken')!, cents: pack('Target') }
	];
	const gap = slips[1].cents - slips[0].cents;


	const carts = cartTotals();
	const weekly = carts.at(-1)!.cents - carts[0].cents;
	const yearlyDollars = Math.round((weekly * 52) / 100);


	// the real numbers show by default; they only start from zero once the page can roll them in
	let gapShown = $state(gap);
	let cartShown = $state(carts.map((c) => c.cents));

	const promises = ['Your card number is never kept.', 'The photo is deleted once it’s read.', 'Nothing is sold or shared. Ever.', 'Store map: off until you turn it on. ZIP code only, never your address.'];

	// Number Flow renders differently on the server, so the plain price is drawn until the page is live
	let live = $state(false);
	let gapMark = $state<HTMLElement>();
	let cartList: HTMLElement;

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

		return () => {
			stopGap();
			stopCart();
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
		<h1>Know what you paid <span class="hl">last time.</span></h1>
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
		<h2>Same chicken. <span class="dear">{money.format(dollars(gap))} apart.</span></h2>
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

	<PhoneTour />

	<section class="cart">
		<h2>Same cart. <span class="dear">{money.format(dollars(weekly))} a week apart.</span></h2>
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
		<p class="year">Buy that every week and the gap is about <strong>${yearlyDollars} a year</strong>.</p>
		<div class="ask">
			<p>See which store is cheaper for you.</p>
			<GoogleButton />
		</div>
	</section>

	<section class="private">
		<h2>Private by design.</h2>
		<ul>
			{#each promises as promise (promise)}
				<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>{promise}</li>
			{/each}
		</ul>
		<a class="fine" href="/privacy">How we handle your receipts</a>
	</section>

	<section class="close">
		<h2>Start with your <span class="hl">last receipt.</span></h2>
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

	.sub {
		margin-top: 1.25rem;
		max-width: 32rem;
		font-size: 1.1875rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	@media (min-width: 1000px) {
	}

	.money {
		min-width: 4.5rem;
		text-align: right;
		font-size: 1.25rem;
		font-weight: 600;
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
		gap: 1.1rem 2.5rem;
		max-width: 52rem;
		margin-top: 2.25rem;
	}

	@media (min-width: 760px) {
		.private ul {
			grid-template-columns: 1fr 1fr;
		}
	}

	.private li {
		display: grid;
		grid-template-columns: 1.6rem minmax(0, 1fr);
		gap: 0.6rem;
		align-items: start;
		border-top: 1px solid var(--color-line);
		padding-top: 1.1rem;
		font-size: 1.125rem;
		font-weight: 500;
		line-height: 1.45;
		color: var(--color-ink);
	}

	.private li svg {
		width: 1.4rem;
		height: 1.4rem;
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* the words that carry each point: what you save in green, what it costs you in red */
	.hl,
	.year strong {
		color: var(--color-accent);
	}

	.dear {
		color: var(--color-up);
	}

	.year strong {
		font-weight: 650;
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
