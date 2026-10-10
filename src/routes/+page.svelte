<script lang="ts">
	import SampleReceipt from './SampleReceipt.svelte';

	let { data } = $props();
</script>

{#if data.email}
	<main class="mx-auto max-w-3xl px-5 py-10">
		<div class="flex items-baseline justify-between gap-4">
			<h1 class="wordmark text-3xl"><span class="text-accent">B</span>ill<span class="text-accent">B</span>uddy</h1>
			<form method="POST" action="?/signout">
				<button class="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
					Sign out
				</button>
			</form>
		</div>
		<p class="mt-1 text-sm text-muted">{data.email}</p>

		<div class="mt-10 border-t border-dashed border-line pt-10 text-center font-mono text-muted">
			NO RECEIPTS YET
		</div>
	</main>
{:else}
	<div class="surface" aria-hidden="true"></div>
	<main
		class="mx-auto grid max-w-5xl items-start gap-12 px-5 pt-14 pb-16 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:pt-20 xl:max-w-6xl xl:gap-24 2xl:max-w-7xl"
	>
		<div class="md:pt-10">
			<h1 class="wordmark text-center text-[clamp(3.5rem,8vw,8rem)] md:text-left">
				<span class="text-accent">B</span>ill<br /><span class="text-accent">B</span>uddy
			</h1>

			<div class="mt-8 max-w-md space-y-4 text-lg leading-relaxed text-muted xl:max-w-xl xl:text-xl">
				<p>Every time you shop, you get a receipt. Most of us throw it away or take a photo we never open again.</p>
				<p>
					BillBuddy keeps it for you. Snap the receipt and it reads every item, the price, the weight and
					the store.
				</p>
				<p class="text-ink">
					Next time you shop, search the item and see what you paid last time, where it was cheaper, and
					whether the price went up.
				</p>
			</div>

			{#if data.signInFailed}
				<p class="mt-6 font-mono text-sm text-up">SIGN-IN DIDN'T GO THROUGH. TRY AGAIN.</p>
			{/if}

			<form method="POST" action="?/google" class="mt-8">
				<button
					class="flex items-center gap-3 rounded-md bg-ink px-5 py-3 font-medium text-bg transition-transform hover:-translate-y-0.5 active:translate-y-0"
				>
					<svg viewBox="0 0 48 48" class="size-5 rounded-full bg-white p-0.5" aria-hidden="true">
						<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
						<path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
						<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
						<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
					</svg>
					Continue with Google
				</button>
			</form>
		</div>

		<div class="flex justify-center md:justify-end md:pt-4">
			<SampleReceipt />
		</div>
	</main>
{/if}

<style>
	/* opsz is left to font-optical-sizing: forcing it breaks glyph advances in WebKit */
	.wordmark {
		font-family: var(--font-display);
		font-weight: 700;
		font-synthesis: none;
		font-optical-sizing: auto;
		font-variation-settings: 'SOFT' 100;
		line-height: 0.95;
		letter-spacing: -0.01em;
	}

	/* paper grain under one warm light, kept still: moving it behind the title makes the text shimmer */
	.surface {
		position: fixed;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .27 0 0 0 0 .2 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	.surface::before {
		content: '';
		position: absolute;
		inset: -30%;
		background: radial-gradient(closest-side, rgb(255 250 235 / 0.55), transparent);
		transform: translate(-10%, -8%);
	}

	@media (prefers-color-scheme: dark) {
		.surface::before {
			background: radial-gradient(closest-side, rgb(255 236 200 / 0.05), transparent);
		}
	}
</style>
