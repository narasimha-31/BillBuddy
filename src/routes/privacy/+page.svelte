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
		['Cookies only keep you signed in.', 'No tracking or ad cookies, which is why there is no cookie banner.'],
		['Only you can see your receipts.', 'Locked to your account in the database itself. Delete your account and every receipt goes with it.']
	];
</script>

<svelte:head>
	<title>Privacy · BillBuddy</title>
</svelte:head>

<div class="screen">
	<header class="top">
		<Wordmark />
		<a href="/demo" class="demo">Try the demo</a>
	</header>

	<main>
		<h1 class="large-title">Private by design.</h1>
		<p class="lead">What happens to your receipts, in seven lines.</p>

		<ul class="group">
			{#each promises as [promise, detail] (promise)}
				<li>
					<h2>{promise}</h2>
					<p>{detail}</p>
				</li>
			{/each}
		</ul>

		<p class="end">That's it. Told you it was short.</p>
	</main>
</div>

<style>
	.screen {
		min-height: 100dvh;
		background: var(--color-raised);
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 auto;
		max-width: 44rem;
		padding: 0.9rem 1.25rem;
	}

	.demo {
		font-size: 0.9375rem;
		color: var(--color-accent);
	}

	main {
		margin: 0 auto;
		max-width: 44rem;
		padding: 2rem 1.25rem calc(4rem + env(safe-area-inset-bottom));
	}

	.lead {
		margin-top: 0.4rem;
		font-size: 1.0625rem;
		color: var(--color-muted);
	}

	ul {
		margin-top: 1.75rem;
	}

	li {
		padding: 1rem 1.1rem 1.05rem;
	}

	h2 {
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-ink);
	}

	li p {
		margin-top: 0.3rem;
		max-width: 60ch;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.end {
		margin: 1rem 1.1rem 0;
		font-size: 0.875rem;
		color: var(--color-muted);
	}
</style>
