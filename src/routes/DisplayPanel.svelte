<script lang="ts">
	import { displayOf, type Display } from '../display';
	import DisplayChoices from './DisplayChoices.svelte';

	let panel: HTMLDetailsElement;
	let current = $state<Display | null>(null);

	// the page already carries the saved choices, so opening the panel needs no request
	function opened() {
		if (panel.open) current = displayOf(document.documentElement);
	}

	function closeOutside(event: MouseEvent) {
		if (panel?.open && !panel.contains(event.target as Node)) panel.open = false;
	}
</script>

<svelte:window onclick={closeOutside} onkeydown={(e) => e.key === 'Escape' && panel?.open && (panel.open = false)} />

<details class="display-panel" bind:this={panel} ontoggle={opened}>
	<summary aria-label="Text size and colours">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19 8.5 5h1L15 19M5 14.5h8M15.5 19l3.5-9 3.5 9M16.6 16.3h4.8" /></svg>
	</summary>
	<div class="panel">
		<p class="title">Text and colours</p>
		{#if current}<DisplayChoices display={current} />{/if}
		<a class="more" href="/settings">All settings</a>
	</div>
</details>

<style>
	/* laptops only: on a phone these choices live in Settings, never over the app. The panel lines
	   up with the end of the header (see AppShell), not with this button */
	.display-panel {
		display: none;
	}

	@media (min-width: 900px) and (hover: hover) {
		.display-panel {
			display: block;
		}
	}

	summary {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		list-style: none;
		color: var(--color-ink);
		transition:
			background-color var(--quick) var(--ease),
			transform var(--standard) var(--ease);
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover,
	details[open] summary {
		background: rgb(118 118 128 / 0.12);
	}

	summary:active {
		transform: scale(0.94);
		transition-duration: var(--quick);
	}

	summary:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	summary svg {
		width: 1.3rem;
		height: 1.3rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* the panel grows out of the corner its button sits in; closing is instant */
	.panel {
		position: absolute;
		top: calc(100% + 0.6rem);
		right: 0;
		z-index: 30;
		width: 22rem;
		border-radius: 18px;
		background: var(--color-raised);
		padding: 0.9rem 0.75rem 0.75rem;
		box-shadow:
			0 18px 40px -12px rgb(0 0 0 / 0.25),
			0 0 0 0.5px rgb(0 0 0 / 0.08);
		transform-origin: top right;
		animation: panel-in 200ms var(--ease);
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: scale(0.96) translateY(-4px);
		}
	}

	.title {
		margin: 0 0.25rem 0.6rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-muted);
	}

	.more {
		display: block;
		margin: 0.75rem 0.25rem 0;
		font-size: 0.875rem;
		color: var(--color-accent);
	}

	.more:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.panel {
			animation: none;
		}
	}
</style>
