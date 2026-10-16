<script lang="ts">
	import Wordmark from '../Wordmark.svelte';

	const promises = [
		['We never sell or share your data.', 'No ads, no trackers, no "partners". Your receipts are not a product.'],
		['Card details are never saved.', 'We keep the items, prices, store and date. The card digits, cash given and change stay on the paper.'],
		['The photo is deleted once it is read.', 'Unless you choose to keep it. What stays is the list of items, not the picture.'],
		[
			'The AI reads it and forgets it.',
			'Open models on Nebius read your receipt with zero data retention. Nothing is stored after the read, and nothing is used for training.'
		],
		[
			'Name lookups send only the printed line and the store.',
			'When a line like "CF ORGT SAUCE" is hard to read, the web search sees that line and "Walmart". Never you, your address or your city.'
		],
		[
			'Store addresses only if you turn them on.',
			'Then the address printed on the receipt goes to the US Census map lookup to place the store, and nothing about you does. Where you are, for the nearest store, is worked out on your own device and never sent.'
		],
		['Cookies only keep you signed in.', 'No tracking or ad cookies, which is why there is no cookie banner.'],
		['Only you can see your receipts.', 'Locked to your account in the database itself. Delete your account in Settings and every receipt goes with it.']
	];
</script>

<svelte:head>
	<title>Privacy · BillBuddy</title>
</svelte:head>

<div class="screen">
	<header class="top">
		<div class="top-inner">
			<Wordmark />
			<a href="/demo" class="demo">Try the demo</a>
		</div>
	</header>

	<main>
		<div class="intro">
			<h1 class="large-title">Private by design.</h1>
			<p class="lead">What happens to your receipts, line by line.</p>
			<p class="manage">You choose what’s kept in <a href="/settings">Settings</a>, once you’re signed in.</p>
		</div>

		<div class="promises">
			<ul class="group">
				{#each promises as [promise, detail] (promise)}
					<li>
						<h2>{promise}</h2>
						<p>{detail}</p>
					</li>
				{/each}
			</ul>
			<p class="end">That's it. Told you it was short.</p>
		</div>
	</main>
</div>

<style>
	.screen {
		min-height: 100dvh;
		background: var(--color-raised);
	}

	.top {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--color-raised) 82%, transparent);
		backdrop-filter: saturate(1.8) blur(20px);
	}

	.top-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 auto;
		max-width: 72rem;
		padding: 0.8rem 1.25rem;
	}

	.demo {
		font-size: 0.9375rem;
		color: var(--color-accent);
	}

	.demo:focus-visible,
	.manage a:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
		border-radius: 4px;
	}

	main {
		display: grid;
		gap: 1.75rem;
		margin: 0 auto;
		max-width: 72rem;
		padding: 2rem 1.25rem calc(4rem + env(safe-area-inset-bottom));
	}

	.lead {
		margin-top: 0.5rem;
		font-size: 1.1875rem;
		line-height: 1.45;
		color: var(--color-muted);
		text-wrap: balance;
	}

	.manage {
		margin-top: 1.25rem;
		font-size: 0.9375rem;
		color: var(--color-muted);
	}

	.manage a {
		color: var(--color-accent);
	}

	li {
		padding: 1.05rem 1.25rem 1.1rem;
	}

	h2 {
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-ink);
	}

	li p {
		margin-top: 0.3rem;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.end {
		margin: 1rem 1.25rem 0;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	/* laptops: the heading stays in view on the left while the promises fill the right */
	@media (min-width: 960px) {
		main {
			grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
			align-items: start;
			gap: 4rem;
			padding-top: 3.5rem;
		}

		.intro {
			position: sticky;
			top: 6rem;
		}

		.large-title {
			font-size: 2.75rem;
		}

		li {
			padding: 1.25rem 1.5rem 1.3rem;
		}
	}
</style>
