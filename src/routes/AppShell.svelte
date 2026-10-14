<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import AccountMenu from './AccountMenu.svelte';
	import Wordmark from './Wordmark.svelte';

	let { firstName, fit = false, children }: { firstName: string | null; fit?: boolean; children: Snippet } = $props();

	const links = [
		{ href: '/home', label: 'Home', icon: 'M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z' },
		{ href: '/receipts', label: 'Receipts', icon: 'M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21zM9 8h6M9 12h6M9 16h4' },
		{ href: '/prices', label: 'Prices', icon: 'M3.5 12.5 11 5h8v8l-7.5 7.5a1.5 1.5 0 0 1-2.1 0L3.5 14.6a1.5 1.5 0 0 1 0-2.1zM15.5 8.5h.01' }
	];
	const current = (href: string) => page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

<div class="app" class:fit>
	<header class="top">
		<div class="top-inner">
			<Wordmark href="/home" />
			<nav aria-label="Main">
				{#each links as link (link.href)}
					<a href={link.href} aria-current={current(link.href) ? 'page' : undefined}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d={link.icon} /></svg>
						<span>{link.label}</span>
					</a>
				{/each}
			</nav>
			<AccountMenu {firstName} />
		</div>
	</header>

	<div class="page">
		{@render children()}
	</div>
</div>

<style>
	/* signed-in pages sit on Apple's grouped grey, so white lists and cards read as surfaces */
	.app {
		min-height: 100dvh;
		background: var(--color-raised);
	}

	.top {
		position: sticky;
		top: 0;
		z-index: 20;
		background: color-mix(in srgb, var(--color-raised) 82%, transparent);
		backdrop-filter: saturate(1.8) blur(20px);
		box-shadow: 0 1px 0 rgb(0 0 0 / 0.06);
	}

	.top-inner {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0 auto;
		max-width: 76rem;
		padding: 0.7rem 1.25rem;
	}

	.page {
		margin: 0 auto;
		max-width: 76rem;
		padding: 1.75rem 1.25rem 4rem;
	}

	/* on a laptop a fitted page is exactly one screen tall; its own lists scroll instead of the page */
	@media (min-width: 1024px) and (min-height: 600px) {
		.app.fit {
			display: flex;
			flex-direction: column;
			height: 100dvh;
		}

		.app.fit .page {
			display: flex;
			flex: 1;
			flex-direction: column;
			width: 100%;
			min-height: 0;
			padding-bottom: 1.5rem;
		}
	}

	/* a segmented control on wide screens */
	nav {
		display: flex;
		gap: 2px;
		margin: 0 auto;
		border-radius: 10px;
		background: rgb(118 118 128 / 0.12);
		padding: 2px;
	}

	nav a {
		display: flex;
		align-items: center;
		border-radius: 8px;
		padding: 0.35rem 1.1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-ink);
		transition: background-color 200ms;
	}

	nav a[aria-current='page'] {
		background: #fff;
		box-shadow:
			0 3px 8px rgb(0 0 0 / 0.12),
			0 3px 1px rgb(0 0 0 / 0.04);
	}

	nav a:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	nav svg {
		display: none;
	}

	/* on phones the same links become a tab bar along the bottom, where the thumb reaches */
	@media (max-width: 640px) {
		/* a blur on the header would pin the fixed tab bar to the header instead of the screen */
		.top {
			backdrop-filter: none;
			background: var(--color-raised);
		}

		.page {
			padding-bottom: calc(6rem + env(safe-area-inset-bottom));
		}

		.top-inner :global(.account) {
			margin-left: auto;
		}

		nav {
			position: fixed;
			inset: auto 0 0;
			z-index: 20;
			margin: 0;
			border-radius: 0;
			background: color-mix(in srgb, var(--color-raised) 96%, transparent);
			backdrop-filter: saturate(1.8) blur(20px);
			box-shadow: 0 -1px 0 rgb(0 0 0 / 0.08);
			padding: 0.35rem 0.5rem calc(0.35rem + env(safe-area-inset-bottom));
		}

		nav a {
			flex: 1;
			flex-direction: column;
			gap: 0.15rem;
			border-radius: 0;
			padding: 0.3rem 0;
			font-size: 0.6875rem;
			color: var(--color-muted);
		}

		nav a[aria-current='page'] {
			background: none;
			box-shadow: none;
			color: var(--color-accent);
		}

		nav svg {
			display: block;
			width: 1.6rem;
			height: 1.6rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 1.7;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}
</style>
