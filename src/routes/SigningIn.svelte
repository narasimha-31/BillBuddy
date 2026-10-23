<script lang="ts">
	import Wordmark from './Wordmark.svelte';
</script>

<div class="signing-in" role="status">
	<Wordmark href="/home" big />
	<p>Signing you in</p>
	<span class="bar" aria-hidden="true"></span>
</div>

<style>
	.signing-in {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		background: var(--color-bg, #fff);
		animation: in 180ms ease-out;
	}

	p {
		font-size: 0.9375rem;
		color: var(--color-muted);
	}

	.bar {
		position: relative;
		width: 7rem;
		height: 3px;
		overflow: hidden;
		border-radius: 3px;
		background: color-mix(in srgb, var(--color-ink) 8%, transparent);
	}

	.bar::after {
		content: '';
		position: absolute;
		inset: 0;
		width: 40%;
		border-radius: inherit;
		background: var(--color-accent);
		animation: slide 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes in {
		from {
			opacity: 0;
		}
	}

	@keyframes slide {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(250%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.signing-in,
		.bar::after {
			animation: none;
		}
	}
</style>
