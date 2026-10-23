<script lang="ts">
	// big: shown large enough for the stars inside the e to read, so they drift
	let { href = '/', big = false }: { href?: string; big?: boolean } = $props();
	const id = $props.id();

	// the stars inside the e, in its own 20 x 24 box
	const STARS = [
		[6.2, 4.4, 0.55],
		[11.5, 3.6, 0.35],
		[14.6, 5.2, 0.45],
		[4.9, 8.3, 0.4],
		[8.4, 10.9, 0.6],
		[6.8, 12.6, 0.35],
		[4.3, 14.4, 0.45],
		[6.6, 18.8, 0.55],
		[10.9, 20.4, 0.4],
		[14.8, 19.2, 0.5],
		[8, 3.6, 0.3],
		[5.4, 16.6, 0.3]
	];
</script>

<a {href} class="wordmark" class:big aria-label="Billie home">
	<span class="name" aria-hidden="true">Billi</span><svg class="e" viewBox="2 1.5 16.5 21" aria-hidden="true">
		<defs>
			<!-- the stroke of a backwards 3, used as a window onto the sky -->
			<mask id="{id}-shape" maskUnits="userSpaceOnUse">
				<path d="M15.8 5.6C14.4 3.9 12.6 3.2 10.5 3.2 7.1 3.2 4.8 5.1 4.8 7.6S7 11.9 10 11.9M10 11.9C6.5 11.9 4 13.7 4 16.4 4 19.2 6.7 20.9 10.6 20.9 12.9 20.9 14.9 20.1 16.5 18.4" fill="none" stroke="#fff" stroke-width="3.3" stroke-linecap="round" />
			</mask>
			<!-- reflected, so sliding it one full period is seamless -->
			<linearGradient id="{id}-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="20" y2="24" spreadMethod="reflect">
				<stop offset="0" stop-color="#1b1446" />
				<stop offset="0.45" stop-color="#4b2a8f" />
				<stop offset="0.75" stop-color="#9c2f7d" />
				<stop offset="1" stop-color="#e0703f" />
			</linearGradient>
			<radialGradient id="{id}-glow" cx="0.35" cy="0.55" r="0.45">
				<stop offset="0" stop-color="#8f7bff" stop-opacity="0.75" />
				<stop offset="1" stop-color="#8f7bff" stop-opacity="0" />
			</radialGradient>
		</defs>
		<g mask="url(#{id}-shape)">
			<rect class="sky" x="-40" y="-48" width="60" height="72" fill="url(#{id}-sky)" />
			<rect class="glow" x="0" y="0" width="20" height="24" fill="url(#{id}-glow)" />
			<g class="stars">
				{#each STARS as [x, y, r], i (i)}
					<circle cx={x} cy={y} {r} style:--i={i} />
				{/each}
			</g>
		</g>
	</svg>
</a>

<style>
	.wordmark {
		display: inline-flex;
		align-items: baseline;
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 650;
		letter-spacing: -0.022em;
		color: var(--color-ink);
	}

	.big {
		font-size: clamp(3rem, 9vw, 5.5rem);
		letter-spacing: -0.035em;
	}

	/* the e sits on the baseline at x-height, like the letters beside it */
	.e {
		width: 0.46em;
		height: 0.585em;
		margin-left: 0.035em;
		overflow: visible;
	}

	.stars circle {
		fill: #fff;
		opacity: 0.85;
	}

	/* the sky slides through the letter at every size; large, the stars drift and twinkle out of step */
	@media (prefers-reduced-motion: no-preference) {
		.sky {
			animation: flow 9s linear infinite;
		}

		.glow {
			animation: drift 6s ease-in-out infinite alternate;
		}

		.stars circle {
			animation: twinkle 3.2s ease-in-out infinite;
			animation-delay: calc(var(--i) * -0.55s);
		}

		.big .stars {
			animation: drift 14s ease-in-out infinite alternate;
		}

	}

	@keyframes flow {
		to {
			transform: translate(40px, 48px);
		}
	}

	@keyframes drift {
		to {
			transform: translate(1.6px, -1.2px);
		}
	}

	@keyframes twinkle {
		50% {
			opacity: 0.25;
		}
	}

	.wordmark:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
		border-radius: 6px;
	}
</style>
