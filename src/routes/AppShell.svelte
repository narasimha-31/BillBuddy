<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import AccountMenu from './AccountMenu.svelte';

	let { firstName, fit = false, children }: { firstName: string | null; fit?: boolean; children: Snippet } = $props();

	const links = [
		{ href: '/receipts', label: 'Receipts' },
		{ href: '/prices', label: 'Prices' }
	];
</script>

<div class="shell" class:fit>
	<header class="top">
		<a href="/receipts" class="wordmark"><span>B</span>ill<span>B</span>uddy</a>
		<nav>
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a>
			{/each}
		</nav>
		<AccountMenu {firstName} />
	</header>

	{@render children()}
</div>

<style>
	/* every signed-in page shares this frame, so the header never moves between pages */
	.shell {
		margin: 0 auto;
		max-width: 90rem;
		padding: 1.5rem 1.25rem 4rem;
	}

	@media (min-width: 1024px) {
		.shell {
			padding: 2rem 2.5rem 4rem;
		}
	}

	/* on a laptop a fitted page is exactly one screen tall; its own lists scroll instead of the page */
	@media (min-width: 1024px) and (min-height: 600px) {
		.shell.fit {
			display: flex;
			flex-direction: column;
			height: 100dvh;
			padding-bottom: 1.5rem;
		}
	}

	.top {
		display: flex;
		align-items: center;
		gap: 1rem;
		border-bottom: 1px dashed var(--color-line);
		padding-bottom: 1.25rem;
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 700;
		font-synthesis: none;
		font-variation-settings: 'SOFT' 100;
		color: var(--color-ink);
	}

	.wordmark span {
		color: var(--color-brand);
	}

	nav {
		display: flex;
		gap: 0.25rem;
		margin-left: auto;
	}

	nav a {
		border-radius: 999px;
		padding: 0.45rem 0.9rem;
		font-weight: 500;
		color: var(--color-muted);
	}

	nav a[aria-current='page'] {
		background: var(--color-receipt);
		box-shadow: 0 0 0 1px var(--color-line);
		color: var(--color-ink);
	}

	@media (hover: hover) {
		nav a:not([aria-current]):hover {
			color: var(--color-ink);
		}
	}

	/* on phones the links move to a bar along the bottom, where the thumb reaches */
	@media (max-width: 640px) {
		.shell {
			padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
		}

		.wordmark {
			font-size: 1.4rem;
		}

		.top :global(.account) {
			margin-left: auto;
		}

		nav {
			position: fixed;
			inset: auto 0 0;
			z-index: 10;
			justify-content: space-around;
			margin: 0;
			border-top: 1px solid var(--color-line);
			background: var(--color-raised);
			padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom));
		}

		nav a {
			flex: 1;
			text-align: center;
			padding: 0.6rem 0.5rem;
		}
	}
</style>
