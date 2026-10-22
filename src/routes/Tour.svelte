<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	type Stop = { target: string; title: string; text: string; icon: string };
	let { stops, onclose }: { stops: Stop[]; onclose: () => void } = $props();

	let at = $state(0);
	let hole = $state<{ x: number; y: number; w: number; h: number } | null>(null);
	let card = $state<HTMLElement>();
	let next = $state<HTMLButtonElement>();
	let place = $state({ x: 16, y: 16 });
	const still = $derived(prefersReducedMotion.current);
	const PAD = 8;
	const GAP = 14;
	// a spot taller than this share of the screen leaves no room for the card above or below it
	const TALL = 0.45;
	let tall = false;
	// the phone's tab bar floats over the bottom of the screen
	const floor = () => innerHeight - (innerWidth <= 640 ? 100 : GAP);

	function frame() {
		const el = document.querySelector(stops[at].target);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		const box = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
		// a tall spot is lit only down to the card, which then sits at the bottom
		if (tall && card) box.h = Math.max(48, Math.min(box.h, floor() - card.offsetHeight - GAP - box.y));
		return box;
	}

	// the card sits under the lit spot when it fits, else over it, and never off the screen
	function settleCard() {
		if (!hole || !card) return;
		const w = card.offsetWidth, h = card.offsetHeight;
		const below = hole.y + hole.h + GAP;
		const y = tall ? floor() - h : below + h < floor() ? below : Math.max(GAP, hole.y - GAP - h);
		const x = Math.min(Math.max(GAP, hole.x), innerWidth - w - GAP);
		place = { x, y };
	}

	async function go(to: number) {
		if (to >= stops.length) return onclose();
		at = to;
		const el = document.querySelector(stops[at].target);
		if (!el) return go(to + 1);
		const r = el.getBoundingClientRect();
		tall = r.height > innerHeight * TALL;
		// a spot off screen scrolls into view first (a tall one to the top), then the light moves to it
		if (tall ? Math.abs(r.top - 80) > 4 : r.top < 70 || r.bottom > innerHeight - 90) {
			if (tall) scrollBy({ top: r.top - 80, behavior: still ? 'auto' : 'smooth' });
			else el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
			await new Promise((done) => setTimeout(done, still ? 0 : 420));
		}
		hole = frame();
		await tick();
		settleCard();
		next?.focus({ preventScroll: true });
	}

	function follow() {
		hole = frame();
		settleCard();
	}

	onMount(() => {
		go(0);
		addEventListener('resize', follow);
		addEventListener('scroll', follow, { passive: true });
		return () => {
			removeEventListener('resize', follow);
			removeEventListener('scroll', follow);
		};
	});

	function keys(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
		else if (event.key === 'ArrowRight') go(at + 1);
		else if (event.key === 'ArrowLeft' && at > 0) go(at - 1);
	}
</script>

<svelte:window onkeydown={keys} />

<div class="tour" class:still role="dialog" aria-modal="true" aria-labelledby="tour-title">
	{#if hole}
		<div class="hole" style:left="{hole.x}px" style:top="{hole.y}px" style:width="{hole.w}px" style:height="{hole.h}px"></div>
	{/if}
	<div class="card" bind:this={card} style:left="{place.x}px" style:top="{place.y}px" class:ready={hole}>
		{#key at}
			<div class="body">
				<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={stops[at].icon} /></svg></span>
				<div>
					<h2 id="tour-title">{stops[at].title}</h2>
					<p aria-live="polite">{stops[at].text}</p>
				</div>
			</div>
		{/key}
		<div class="foot">
			<span class="dots" aria-label="Stop {at + 1} of {stops.length}">
				{#each stops as _, i (i)}<span class:on={i === at} class:done={i < at}></span>{/each}
			</span>
			<button type="button" class="skip" onclick={onclose}>{at === stops.length - 1 ? 'Close' : 'Skip'}</button>
			<button type="button" class="pill-button next" bind:this={next} onclick={() => go(at + 1)}>{at === stops.length - 1 ? 'Start' : 'Next'}</button>
		</div>
	</div>
</div>

<style>
	.tour {
		position: fixed;
		inset: 0;
		z-index: 100;
		--glide: 520ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	/* the lit window: everything around it dims, and its rim glows in the theme's colour */
	.hole {
		position: fixed;
		border-radius: 20px;
		box-shadow:
			0 0 0 200vmax rgb(4 6 10 / 0.62),
			0 0 0 1.5px color-mix(in srgb, var(--color-accent) 85%, transparent),
			0 0 28px 2px color-mix(in srgb, var(--color-accent) 40%, transparent);
		pointer-events: none;
		transition:
			left var(--glide),
			top var(--glide),
			width var(--glide),
			height var(--glide);
		animation: breathe 2.8s ease-in-out infinite;
	}

	@keyframes breathe {
		50% {
			box-shadow:
				0 0 0 200vmax rgb(4 6 10 / 0.62),
				0 0 0 1.5px var(--color-accent),
				0 0 40px 6px color-mix(in srgb, var(--color-accent) 50%, transparent);
		}
	}

	.card {
		position: fixed;
		width: min(22rem, calc(100vw - 28px));
		border-radius: 20px;
		background: var(--color-surface);
		padding: 1.1rem 1.1rem 0.9rem;
		color: var(--color-ink);
		box-shadow:
			0 18px 40px rgb(0 0 0 / 0.28),
			0 0 0 1px color-mix(in srgb, var(--color-sep) 12%, transparent);
		opacity: 0;
		transition:
			left var(--glide),
			top var(--glide),
			opacity var(--glide);
	}

	.card.ready {
		opacity: 1;
	}

	.body {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.85rem;
		animation: arrive 360ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(6px);
			filter: blur(3px);
		}
	}

	.icon {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
	}

	.icon svg {
		width: 1.35rem;
		height: 1.35rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	h2 {
		font-family: var(--font-display);
		font-size: 1.0625rem;
		font-weight: 650;
		letter-spacing: -0.01em;
	}

	p {
		margin-top: 0.2rem;
		font-size: 0.9375rem;
		line-height: 1.4;
		color: var(--color-muted);
	}

	.foot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.dots {
		display: flex;
		flex: 1;
		gap: 5px;
	}

	.dots span {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-sep) 25%, transparent);
		transition:
			width var(--glide),
			background-color var(--glide);
	}

	.dots .done {
		background: color-mix(in srgb, var(--color-accent) 45%, transparent);
	}

	.dots .on {
		width: 18px;
		background: var(--color-accent);
	}

	.skip {
		min-height: 2.75rem;
		padding: 0 0.75rem;
		font-size: 0.9375rem;
		color: var(--color-muted);
	}

	.next {
		min-height: 2.75rem;
		padding: 0.55rem 1.2rem;
		font-size: 0.9375rem;
	}

	.still .hole,
	.still .card,
	.still .body,
	.still .dots span {
		transition: none;
		animation: none;
	}
</style>
