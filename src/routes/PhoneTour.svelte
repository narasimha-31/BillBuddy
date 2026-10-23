<script lang="ts">
	import { onMount } from 'svelte';
	import { priceOf } from './store-prices';

	// the sample shopper's stores; the distance and the usual store are theirs, the prices are sourced
	const chicken = (['Wegmans', 'Aldi', 'Walmart', 'Target'] as const).map((store) => ({ store, price: priceOf(store, 'chicken')! }));
	const tags: Record<string, string> = { Aldi: 'Nearest · 0.8 mi', Walmart: 'Your usual' };

	const lines = [
		{ printed: 'GV LG EGGS 12CT', name: 'Large eggs, 12 ct', price: priceOf('Walmart', 'eggs')! },
		{ printed: 'GV WHL MLK GAL', name: 'Whole milk, 1 gal', price: priceOf('Walmart', 'milk')! },
		{ printed: 'FRSH CHKN BRST BNLS', name: 'Chicken breast', price: priceOf('Walmart', 'chicken')! },
		{ printed: 'GV PNT BTR CRMY 16Z', name: 'Creamy peanut butter', price: priceOf('Walmart', 'peanutButter')! }
	];

	const linesCents = lines.reduce((sum, line) => sum + Math.round(line.price * 100), 0);
	const saving = Math.round(priceOf('Walmart', 'chicken')! * 100) - Math.round(chicken[0].price * 100);

	const steps = [
		{ title: 'Snap the receipt.', text: 'Take a photo at the checkout or at home. It’s read in about ten seconds.' },
		{ title: 'Every line, in plain words.', text: 'Store shorthand becomes the name you’d say out loud, with the price printed next to it.' },
		{ title: 'Then see where it’s cheaper.', text: 'Every store you shop, side by side, with the nearest one and the one you use most.' },
		{ title: 'Find it on the map.', text: 'Your stores on one map, each with what you paid there. Off until you turn it on.' }
	];

	// three of the sample stores as price tags on the street drawing; the cheapest is first
	const pins = [
		{ ...chicken[0], x: 66, y: 30 },
		{ ...chicken[1], x: 27, y: 55 },
		{ ...chicken[2], x: 74, y: 70 }
	];

	let active = $state(0);
	let blocks = $state<HTMLElement[]>([]);
	let fit = $state<HTMLElement>();
	let scale = $state(1);

	const PHONE = { width: 300, height: 640 };

	onMount(() => {
		// the step crossing the middle of the screen drives the phone
		const watch = new IntersectionObserver(
			(seen) => {
				for (const entry of seen) if (entry.isIntersecting) active = blocks.indexOf(entry.target as HTMLElement);
			},
			{ rootMargin: '-45% 0px -45% 0px' }
		);
		for (const block of blocks) watch.observe(block);

		// the whole phone shrinks evenly to fit the room it has, so its screen never gets squashed
		const measure = new ResizeObserver(() => {
			if (!fit?.clientHeight) return;
			scale = Math.min(1, (fit.clientHeight - 16) / PHONE.height, (fit.clientWidth - 16) / PHONE.width);
		});
		if (fit) measure.observe(fit);

		return () => {
			watch.disconnect();
			measure.disconnect();
		};
	});

	const money = (dollars: number) => `$${dollars.toFixed(2)}`;
</script>

{#snippet screen(step: number)}
	<div class="status">
		<span>10:24</span>
		<span class="island"></span>
		<span class="battery"></span>
	</div>
	{#if step === 0}
		<div class="reading">
			<img src="/images/receipts-flat-1024.webp" alt="" loading="lazy" />
			<div class="frame"><span class="beam"></span></div>
			<p class="toast"><span class="spinner"></span>Reading your receipt</p>
		</div>
	{:else if step === 1}
		<div class="app">
			<p class="back">Receipts</p>
			<p class="title">Walmart</p>
			<p class="meta">Oct 9 · {lines.length} items</p>
			<ul class="list">
				{#each lines as line (line.printed)}
					<li>
						<span class="printed">{line.printed}</span>
						<span class="name">{line.name}</span>
						<span class="value">{money(line.price)}</span>
					</li>
				{/each}
			</ul>
			<div class="note">
				<p class="good">Everything adds up.</p>
				<p class="sum"><span>Total</span><span>{money(linesCents / 100)}</span></p>
			</div>
		</div>
	{:else if step === 2}
		<div class="app">
			<p class="back">Prices</p>
			<p class="title">Chicken breast</p>
			<p class="meta">Last price at each store, per lb</p>
			<ul class="list">
				{#each chicken as row, i (row.store)}
					<li class:best={i === 0}>
						<span class="name">{row.store}</span>
						<span class="value">{money(row.price)}</span>
						<span class="tags">
							{#if i === 0}<em class="cheapest">Cheapest</em>{/if}
							{#if tags[row.store]}<em>{tags[row.store]}</em>{/if}
						</span>
					</li>
				{/each}
			</ul>
			<div class="note">
				<p class="save">{money(saving / 100)} a lb less at {chicken[0].store}</p>
				<p>than at Walmart, your usual store.</p>
			</div>
		</div>
	{:else}
		<div class="app mapped">
			<p class="back">Prices</p>
			<p class="title">Chicken breast</p>
			<div class="streets">
				<img src="/images/street-map.webp" alt="" loading="lazy" />
				<span class="you" style:left="44%" style:top="64%"></span>
				{#each pins as pin, i (pin.store)}
					<span class="tag-pin" class:best={i === 0} style:left="{pin.x}%" style:top="{pin.y}%">{money(pin.price)}</span>
				{/each}
			</div>
			<div class="note">
				<p class="save">{chicken[0].store} · 1.2 mi</p>
				<p>Cheapest near you, {money(chicken[0].price)} a lb.</p>
			</div>
		</div>
	{/if}
	<div class="tabs" aria-hidden="true"><span>Home</span><span class:on={step < 2}>Receipts</span><span class:on={step >= 2}>Prices</span></div>
{/snippet}

<section class="tour" aria-label="How Billi works">
	<div class="pin" aria-hidden="true">
		<div class="captions">
			{#each steps as step, i (step.title)}
				<div class="caption" class:on={active === i}>
					<h3>{step.title}</h3>
					<p class="say">{step.text}</p>
				</div>
			{/each}
		</div>
		<div class="fit" bind:this={fit}>
			<div class="phone" style:--scale={scale}>
				{#each steps as _, i (i)}
					<div class="screen layer" class:on={active === i}>{@render screen(i)}</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="steps">
		{#each steps as step, i (step.title)}
			<div class="step" class:on={active === i} bind:this={blocks[i]}>
				<h3>{step.title}</h3>
				<p class="say">{step.text}</p>
				<div class="phone still" aria-hidden="true"><div class="screen">{@render screen(i)}</div></div>
			</div>
		{/each}
	</div>
</section>

<style>
	.tour {
		display: grid;
		margin: clamp(6rem, 16vh, 10rem) auto 0;
		max-width: 76rem;
		padding: 0 1.25rem;
	}

	h3 {
		font-family: var(--font-display);
		font-size: clamp(1.9rem, 3.6vw, 3rem);
		font-weight: 650;
		letter-spacing: -0.035em;
		line-height: 1.05;
		text-wrap: balance;
		color: var(--color-ink);
	}

	.say {
		margin-top: 1rem;
		max-width: 26rem;
		font-size: 1.1875rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	.step + .step {
		margin-top: 5rem;
	}

	/* reduced motion: each step carries its own still screen */
	.pin {
		display: none;
	}

	.still {
		margin: 2rem auto 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.still {
			display: none;
		}

		/* pinned just below the page's frosted bar while the steps scroll past */
		.pin {
			--bar: 4rem;
			display: flex;
			flex-direction: column;
			position: sticky;
			top: var(--bar);
			height: calc(100svh - var(--bar));
		}

		/* the phone is placed out of flow, so only the free space sets its size, never the phone itself */
		.fit {
			position: relative;
			flex: 1;
			min-height: 0;
		}

		.pin .phone {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%) scale(var(--scale, 1));
		}

		.step + .step {
			margin-top: 0;
		}

		/* room after the last step, so the phone stays pinned while that step is read */
		.steps {
			padding-bottom: 20svh;
		}
	}

	/* phones: the caption sits above the pinned phone and changes with it; the steps are only scroll marks */
	@media (max-width: 999px) and (prefers-reduced-motion: no-preference) {
		.tour {
			grid-template-columns: minmax(0, 1fr);
		}

		.pin,
		.steps {
			grid-area: 1 / 1;
		}

		.pin {
			--bar: 3.75rem;
			z-index: 1;
		}

		.captions {
			display: grid;
			flex: none;
			padding-top: 0.75rem;
			text-align: center;
		}

		.caption {
			grid-area: 1 / 1;
			opacity: 0;
			transform: translateY(8px);
			transition:
				opacity 400ms cubic-bezier(0.16, 1, 0.3, 1),
				transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
		}

		.caption.on {
			opacity: 1;
			transform: none;
		}

		.caption h3 {
			font-size: clamp(1.6rem, 7vw, 2.1rem);
		}

		.caption .say {
			margin: 0.5rem auto 0;
			max-width: 22rem;
			font-size: 1rem;
			line-height: 1.45;
		}

		.step {
			min-height: 85svh;
			opacity: 0;
			pointer-events: none;
		}
	}

	/* wide screens: text beside the pinned phone, Apple product-page style */
	@media (min-width: 1000px) and (prefers-reduced-motion: no-preference) {
		/* text and phone sit together in the middle, not at opposite ends of the page */
		.tour {
			grid-template-columns: minmax(0, 30rem) auto;
			justify-content: center;
			gap: clamp(4rem, 8vw, 8rem);
		}

		.steps {
			grid-column: 1;
			grid-row: 1;
		}

		.pin {
			grid-column: 2;
			grid-row: 1;
			width: 340px;
		}

		.captions {
			display: none;
		}

		.step {
			display: flex;
			flex-direction: column;
			justify-content: center;
			min-height: 80vh;
			opacity: 0.25;
			transition: opacity 500ms cubic-bezier(0.16, 1, 0.3, 1);
		}

		.step.on {
			opacity: 1;
		}
	}

	/* A current large flagship handset drawn in CSS: a brushed titanium rim with side buttons,
	   a thin black bezel and a pill camera cutout. No maker's logo or name. */
	.phone {
		position: relative;
		width: 300px;
		height: 640px;
		border-radius: 56px;
		background: linear-gradient(135deg, #d9d6d0 0%, #8f8c87 22%, #c8c5bf 48%, #77746f 74%, #cfccc6 100%);
		padding: 4px;
		box-shadow:
			0 50px 90px -35px rgb(0 0 0 / 0.4),
			0 0 0 0.5px rgb(0 0 0 / 0.25);
	}

	/* the side buttons sit just outside the rim: power on the right, action and volume on the left */
	.phone::before,
	.phone::after {
		content: '';
		position: absolute;
		width: 3px;
		border-radius: 2px;
		background: linear-gradient(90deg, #77746f, #c8c5bf);
	}

	.phone::before {
		right: -3px;
		top: 180px;
		height: 88px;
	}

	.phone::after {
		left: -3px;
		top: 118px;
		height: 30px;
		background: #a9a6a0;
		box-shadow:
			0 50px 0 0 #a9a6a0,
			0 100px 0 0 #a9a6a0;
	}

	.screen {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		height: 100%;
		border: 7px solid #0b0b0c;
		border-radius: 52px;
		background: var(--color-raised);
		font-size: 13px;
	}

	.layer {
		position: absolute;
		inset: 4px;
		height: auto;
		opacity: 0;
		transform: scale(0.97);
		transition:
			opacity 450ms cubic-bezier(0.16, 1, 0.3, 1),
			transform 450ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.layer.on {
		opacity: 1;
		transform: none;
	}

	/* the time and battery sit either side of the pill-shaped camera cutout */
	.status {
		position: relative;
		display: flex;
		flex: none;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		padding: 0 26px 0 30px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.island {
		position: absolute;
		top: 10px;
		left: 50%;
		width: 88px;
		height: 26px;
		border-radius: 999px;
		background: #0b0b0c;
		transform: translateX(-50%);
	}

	.battery {
		position: relative;
		width: 22px;
		height: 11px;
		border: 1.5px solid rgb(29 29 31 / 0.45);
		border-radius: 3.5px;
	}

	.battery::before {
		content: '';
		position: absolute;
		inset: 1.5px 4px 1.5px 1.5px;
		border-radius: 1.5px;
		background: var(--color-ink);
	}

	.battery::after {
		content: '';
		position: absolute;
		top: 2.5px;
		right: -4px;
		width: 2px;
		height: 4px;
		border-radius: 0 1px 1px 0;
		background: rgb(29 29 31 / 0.45);
	}

	/* the photo is pinned inside its box, so it can never push the tab bar off the screen */
	.reading {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		margin: 6px 12px 0;
		border-radius: 22px;
		background: #e9e7e2;
	}

	.reading img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 33% 50%;
		transform: scale(1.55);
		transform-origin: 50% 32%;
	}

	/* document-scan corners around the receipt, as the iOS camera draws them */
	.frame {
		--corner: #fff;
		position: absolute;
		inset: 7% 17% 22%;
		background:
			linear-gradient(var(--corner), var(--corner)) top left / 22px 3px,
			linear-gradient(var(--corner), var(--corner)) top left / 3px 22px,
			linear-gradient(var(--corner), var(--corner)) top right / 22px 3px,
			linear-gradient(var(--corner), var(--corner)) top right / 3px 22px,
			linear-gradient(var(--corner), var(--corner)) bottom left / 22px 3px,
			linear-gradient(var(--corner), var(--corner)) bottom left / 3px 22px,
			linear-gradient(var(--corner), var(--corner)) bottom right / 22px 3px,
			linear-gradient(var(--corner), var(--corner)) bottom right / 3px 22px;
		background-repeat: no-repeat;
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.35));
	}

	.beam {
		position: absolute;
		left: 6px;
		right: 6px;
		top: 0;
		height: 3px;
		border-radius: 3px;
		background: #34c77b;
		box-shadow: 0 0 18px 4px rgb(52 199 123 / 0.5);
		animation: scan 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
	}

	@keyframes scan {
		to {
			top: calc(100% - 3px);
		}
	}

	.toast {
		position: absolute;
		left: 50%;
		bottom: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.86);
		backdrop-filter: blur(16px);
		padding: 8px 14px;
		font-weight: 600;
		white-space: nowrap;
		color: var(--color-ink);
		transform: translateX(-50%);
	}

	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgb(0 0 0 / 0.15);
		border-top-color: var(--color-accent);
		border-radius: 999px;
		animation: spin 800ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.app {
		flex: 1;
		min-height: 0;
		padding: 4px 14px 0;
	}

	.back {
		color: var(--color-accent);
	}

	.back::before {
		content: '';
		display: inline-block;
		width: 7px;
		height: 7px;
		margin-right: 5px;
		border-bottom: 2px solid currentColor;
		border-left: 2px solid currentColor;
		transform: translateY(-1px) rotate(45deg);
	}

	.title {
		margin-top: 4px;
		font-family: var(--font-display);
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--color-ink);
	}

	.meta {
		color: var(--color-muted);
	}

	.list {
		margin-top: 12px;
		overflow: hidden;
		border-radius: 12px;
		background: #fff;
	}

	.list li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1px 8px;
		padding: 9px 12px;
	}

	.list li + li {
		border-top: 1px solid rgb(60 60 67 / 0.14);
	}

	.printed {
		grid-column: 1 / -1;
		font-size: 10.5px;
		letter-spacing: 0.02em;
		color: var(--color-muted);
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
		color: var(--color-ink);
	}

	.value {
		color: var(--color-ink);
	}

	.best .value {
		font-weight: 600;
		color: var(--color-accent);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		grid-column: 1 / -1;
	}

	.tags:empty {
		display: none;
	}

	.tags em {
		border-radius: 999px;
		background: rgb(118 118 128 / 0.12);
		padding: 1px 7px;
		font-size: 10.5px;
		font-style: normal;
		font-weight: 600;
		color: var(--color-muted);
	}

	.tags .cheapest {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
	}

	.note {
		margin-top: 12px;
		border-radius: 12px;
		background: #fff;
		padding: 10px 12px;
		color: var(--color-muted);
	}

	.good,
	.save {
		font-weight: 600;
		color: var(--color-accent);
	}

	.save {
		font-family: var(--font-display);
		font-size: 17px;
		letter-spacing: -0.01em;
	}

	.sum {
		display: flex;
		justify-content: space-between;
		margin-top: 4px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.tabs {
		flex: none;
		display: flex;
		justify-content: space-around;
		margin: 10px 14px 14px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.9);
		padding: 10px 0;
		font-size: 10.5px;
		font-weight: 500;
		color: var(--color-muted);
		box-shadow: 0 6px 18px -8px rgb(0 0 0 / 0.25);
	}

	.tabs .on {
		color: var(--color-accent);
	}

	.mapped {
		display: flex;
		flex-direction: column;
	}

	.streets {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		margin-top: 8px;
		border-radius: 16px;
		background: #ecebe6;
	}

	.streets img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.you {
		position: absolute;
		width: 12px;
		height: 12px;
		margin: -6px 0 0 -6px;
		border: 2.5px solid #fff;
		border-radius: 999px;
		background: #0a84ff;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.3);
	}

	/* a price tag standing on its point, as on the real map */
	.tag-pin {
		position: absolute;
		translate: -50% calc(-100% - 6px);
		border-radius: 999px;
		background: #fff;
		padding: 3px 8px;
		font-size: 12px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.18);
		transform-origin: 50% 100%;
		transition:
			scale 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 350ms,
			background-color 300ms ease-out 350ms,
			color 300ms ease-out 350ms;
	}

	.tag-pin::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		margin-left: -5px;
		border: 5px solid transparent;
		border-top-color: #fff;
		transition: border-top-color 300ms ease-out 350ms;
	}

	/* when the map step arrives, the cheapest tag grows and turns green */
	.on .tag-pin.best {
		z-index: 1;
		scale: 1.18;
		background: var(--color-cheaper);
		color: #fff;
	}

	.on .tag-pin.best::after {
		border-top-color: var(--color-cheaper);
	}

	.mapped .note {
		margin-bottom: 4px;
	}

	@media (prefers-reduced-motion: reduce) {
		.beam,
		.spinner {
			animation: none;
		}

		.tag-pin,
		.tag-pin::after {
			transition: none;
		}
	}
</style>
