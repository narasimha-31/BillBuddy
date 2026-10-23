<script lang="ts">
	// big: the landing's large mark, where the stars inside the e read
	let { href = '/', big = false }: { href?: string; big?: boolean } = $props();
</script>

<a {href} class="wordmark" class:big aria-label="Billie home">
	<span aria-hidden="true">Billi</span><span class="e" aria-hidden="true"></span>
</a>

<style>
	.wordmark {
		display: inline-flex;
		align-items: baseline;
		font-family: var(--font-display);
		font-size: 1.55rem;
		font-weight: 650;
		letter-spacing: -0.022em;
		color: var(--color-ink);
	}

	.big {
		font-size: clamp(3rem, 9vw, 5.5rem);
		letter-spacing: -0.035em;
	}

	/* A backwards 3 at x-height, cut from a moving night sky. Everything is painted inside this one
	   box and clipped to the letter, so nothing it draws can reach past it. */
	.e {
		--shape: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='2 1.5 16.5 21'%3E%3Cpath d='M15.8 5.6C14.4 3.9 12.6 3.2 10.5 3.2 7.1 3.2 4.8 5.1 4.8 7.6S7 11.9 10 11.9M10 11.9C6.5 11.9 4 13.7 4 16.4 4 19.2 6.7 20.9 10.6 20.9 12.9 20.9 14.9 20.1 16.5 18.4' fill='none' stroke='white' stroke-width='3.3' stroke-linecap='round'/%3E%3C/svg%3E");
		position: relative;
		display: inline-block;
		width: 0.46em;
		height: 0.585em;
		margin-left: 0.035em;
		background:
			radial-gradient(circle at 32% 60%, rgb(143 123 255 / 0.7), transparent 55%),
			linear-gradient(135deg, #1b1446, #4b2a8f 30%, #9c2f7d 55%, #e0703f 75%, #9c2f7d 90%);
		background-size:
			100% 100%,
			300% 300%;
		-webkit-mask: var(--shape) center / 100% 100% no-repeat;
		mask: var(--shape) center / 100% 100% no-repeat;
	}

	/* the stars, a layer of their own so they twinkle without moving the sky */
	.e::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 26% 14%, #fff 0 0.022em, transparent 0.036em),
			radial-gradient(circle at 60% 10%, #fff 0 0.014em, transparent 0.026em),
			radial-gradient(circle at 80% 20%, #fff 0 0.018em, transparent 0.03em),
			radial-gradient(circle at 18% 33%, #fff 0 0.016em, transparent 0.028em),
			radial-gradient(circle at 42% 46%, #fff 0 0.024em, transparent 0.038em),
			radial-gradient(circle at 15% 66%, #fff 0 0.018em, transparent 0.03em),
			radial-gradient(circle at 30% 86%, #fff 0 0.022em, transparent 0.036em),
			radial-gradient(circle at 56% 92%, #fff 0 0.016em, transparent 0.028em),
			radial-gradient(circle at 82% 84%, #fff 0 0.02em, transparent 0.034em);
	}

	/* the sky drifts back and forth through the letter; the stars breathe */
	@media (prefers-reduced-motion: no-preference) {
		.e {
			animation: flow 8s ease-in-out infinite alternate;
		}

		.e::after {
			animation: twinkle 2.6s ease-in-out infinite alternate;
		}
	}

	@keyframes flow {
		from {
			background-position:
				0 0,
				0% 0%;
		}
		to {
			background-position:
				0 0,
				100% 100%;
		}
	}

	@keyframes twinkle {
		to {
			opacity: 0.35;
		}
	}

	.wordmark:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
		border-radius: 6px;
	}
</style>
