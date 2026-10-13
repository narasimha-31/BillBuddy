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
		color: var(--color-accent);
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
		background: rgb(253 251 245 / 0.55);
		color: var(--color-ink);
	}

	@media (hover: hover) {
		nav a:not([aria-current]):hover {
			color: var(--color-ink);
		}
	}

	@media (max-width: 480px) {
		.wordmark {
			font-size: 1.4rem;
		}

		nav a {
			padding: 0.4rem 0.65rem;
		}
	}
</style>
