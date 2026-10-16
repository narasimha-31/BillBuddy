<script lang="ts" module>
	// set by the page being left, read by the page arriving: only a tap between pages eases the new
	// one in, never a first load or a refresh
	let arrivedByTap = false;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import AccountMenu from './AccountMenu.svelte';
	import Wordmark from './Wordmark.svelte';

	let { firstName, fit = false, children }: { firstName: string | null; fit?: boolean; children: Snippet } = $props();

	const links = [
		{ href: '/home', label: 'Home', icon: 'M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z' },
		{ href: '/receipts', label: 'Receipts', icon: 'M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21zM9 8h6M9 12h6M9 16h4' },
		{ href: '/prices', label: 'Prices', icon: 'M3.5 12.5 11 5h8v8l-7.5 7.5a1.5 1.5 0 0 1-2.1 0L3.5 14.6a1.5 1.5 0 0 1 0-2.1zM15.5 8.5h.01' }
	];
	const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);
	// The tab follows the tap at once: while the next page's data loads, the link being opened is
	// already the selected one, instead of nothing changing until the server answers.
	const path = $derived(navigating.to?.url.pathname ?? page.url.pathname);
	const selected = $derived(links.findIndex((link) => under(path, link.href)));

	const entering = arrivedByTap;
	arrivedByTap = false;
	beforeNavigate(({ to }) => {
		arrivedByTap = to?.route.id !== page.route.id;
	});

	// the pill starts where it belongs, and only slides once the page is on screen
	let ready = $state(false);
	onMount(() => requestAnimationFrame(() => (ready = true)));
</script>

<div class="app" class:fit>
	<header class="top">
		<div class="site-top">
			<Wordmark href="/home" />
			<nav aria-label="Main" class:ready style:--selected={selected}>
				{#if selected >= 0}<span class="pill" aria-hidden="true"></span>{/if}
				{#each links as link, i (link.href)}
					<a href={link.href} aria-current={under(page.url.pathname, link.href) ? 'page' : undefined} class:on={i === selected}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d={link.icon} /></svg>
						<span>{link.label}</span>
					</a>
				{/each}
			</nav>
			<AccountMenu {firstName} />
		</div>
	</header>

	<div class="page" class:entering>
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

	/* arriving by a tab: the page comes into focus rather than appearing, in under a quarter second */
	.page.entering {
		animation: page-in 240ms cubic-bezier(0.32, 0.72, 0, 1) backwards;
	}

	@keyframes page-in {
		from {
			opacity: 0;
			transform: translateY(6px);
			filter: blur(3px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.page.entering {
			animation: none;
		}

		nav.ready .pill,
		nav a {
			transition: none;
		}

		nav a:active {
			transform: none;
		}
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

	/* a segmented control on wide screens: equal segments, so one pill can slide between them */
	nav {
		--pad: 2px;
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 0 auto;
		border-radius: 10px;
		background: rgb(118 118 128 / 0.12);
		padding: var(--pad);
	}

	/* The selection is one pill that moves, on the iOS curve: quick to leave, soft to land. It is
	   placed without motion on arrival and only slides between taps. */
	.pill {
		position: absolute;
		top: var(--pad);
		bottom: var(--pad);
		left: var(--pad);
		width: calc((100% - 2 * var(--pad)) / 3);
		border-radius: 8px;
		background: #fff;
		box-shadow:
			0 3px 8px rgb(0 0 0 / 0.12),
			0 3px 1px rgb(0 0 0 / 0.04);
		transform: translateX(calc(var(--selected) * 100%));
	}

	nav.ready .pill {
		transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	nav a {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		padding: 0.35rem 1.1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-ink);
		-webkit-tap-highlight-color: transparent;
		transition:
			color 160ms,
			transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	/* pressed: a small give under the finger, at once, then it springs back */
	nav a:active {
		transform: scale(0.94);
		transition-duration: 160ms, 80ms;
	}

	nav a:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	nav svg {
		display: none;
	}

	/* on phones the same links become a floating tab bar, lifted clear of the home indicator
	   and the browser's own toolbar, the way iOS apps place it */
	@media (max-width: 640px) {
		/* a blur on the header would pin the fixed tab bar to the header instead of the screen */
		.top {
			backdrop-filter: none;
			background: var(--color-raised);
		}

		.page {
			padding-bottom: calc(7rem + env(safe-area-inset-bottom));
		}

		.site-top :global(.account) {
			margin-left: auto;
		}

		nav {
			--pad: 0.3rem;
			position: fixed;
			right: 1rem;
			bottom: calc(0.85rem + env(safe-area-inset-bottom));
			left: 1rem;
			z-index: 20;
			margin: 0;
			border-radius: 999px;
			background: color-mix(in srgb, #fff 78%, transparent);
			backdrop-filter: saturate(1.8) blur(22px);
			box-shadow:
				0 10px 30px -8px rgb(0 0 0 / 0.22),
				0 0 0 0.5px rgb(0 0 0 / 0.08);
		}

		.pill {
			border-radius: 999px;
			background: color-mix(in srgb, var(--color-accent) 12%, transparent);
			box-shadow: none;
		}

		nav a {
			flex: 1;
			flex-direction: column;
			gap: 0.1rem;
			border-radius: 999px;
			padding: 0.4rem 0 0.35rem;
			font-size: 0.6875rem;
			font-weight: 500;
			color: var(--color-muted);
		}

		nav a.on {
			color: var(--color-accent);
		}

		nav svg {
			display: block;
			width: 1.5rem;
			height: 1.5rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 1.7;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}
</style>
