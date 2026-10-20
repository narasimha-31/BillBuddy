<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '../AppShell.svelte';
	import DisplayChoices from '../DisplayChoices.svelte';
	import MapUnlock from '../MapUnlock.svelte';
	import { storeName } from '../../format';
	import { clearToasts } from '../../toasts.svelte';

	let { data, form } = $props();

	// follows the saved value, and flips at once on a tap so the note under the switch never lags
	let keepPhotos = $derived(data.keepPhotos);
	let typed = $state('');
	let changingZip = $state(false);
</script>

<svelte:head>
	<title>Settings · BillBuddy</title>
</svelte:head>

<AppShell firstName={data.firstName}>
	<main>
		<h1 class="large-title">Settings</h1>

		<div class="columns">
		<div class="column">
		<!-- a switch applies the moment it flips, as in iOS; without JavaScript the Save button does it -->
		<form method="POST" action="?/save" use:enhance={() => async ({ update }) => update({ reset: false })}>
			<h2 class="list-label">What BillBuddy keeps</h2>
			<ul class="group">
				<li>
					<label class="row">
						<span class="row-title">Receipt photos</span>
						<input
							class="switch"
							type="checkbox"
							role="switch"
							name="keep_photos"
							checked={keepPhotos}
							onchange={(e) => {
								keepPhotos = e.currentTarget.checked;
								e.currentTarget.form?.requestSubmit();
							}}
						/>
						<span class="row-sub">
							{keepPhotos ? 'Kept with each receipt. Turning this off deletes them.' : 'Deleted once a receipt is read.'}
						</span>
					</label>
				</li>
			</ul>
			<noscript><button class="pill-button save">Save</button></noscript>
		</form>

		<h2 class="list-label" id="store-map">Store map</h2>
		<ul class="group">
			{#if data.map.on}
				<li>
					<form method="POST" action="?/location" use:enhance={() => async ({ update }) => update({ reset: false })}>
						<label class="row">
							<span class="row-title">Show my stores on a map</span>
							<input class="switch" type="checkbox" role="switch" name="map" checked onchange={(e) => e.currentTarget.form?.requestSubmit()} />
							<span class="row-sub">Prices shows each branch you shop at with what you paid there. Turning this off deletes your ZIP and every store’s place.</span>
						</label>
					</form>
				</li>
				<li class="row zip-row">
					<span class="row-title">ZIP code</span>
					<span class="row-value">{data.map.zip}</span>
					<button class="row-link" type="button" aria-expanded={changingZip} onclick={() => (changingZip = !changingZip)}>{changingZip ? 'Cancel' : 'Change'}</button>
				</li>
				{#if changingZip}
					<li class="inset"><MapUnlock zip={data.map.zip} button="Save ZIP" ondone={() => (changingZip = false)} /></li>
				{/if}
			{:else}
				<li class="row">
					<span class="row-title">Show my stores on a map</span>
					<span class="row-sub">See every branch you shop at, with what you paid at each one and which is nearest. Off until you turn it on.</span>
				</li>
				<li class="inset"><MapUnlock button="Turn on the store map" /></li>
			{/if}
		</ul>

		{#if data.map.on && data.stores.length}
			<h2 class="list-label">Your stores</h2>
			<ul class="group">
				{#each data.stores as store (store.id)}
					<li class="row">
						<span class="row-title">{storeName(store.name)}</span>
						<span class="row-sub">
							{store.visits} {store.visits === 1 ? 'receipt' : 'receipts'} ·
							{#if store.branches === 0}not on the map yet{:else if store.branches === 1}1 branch{:else}{store.branches} branches{/if}{store.guessed ? ' · some are guesses' : ''}
						</span>
					</li>
				{/each}
			</ul>
		{/if}

		<h2 class="list-label">Display</h2>
		<DisplayChoices display={data.display} />
		</div>

		<div class="column">
		<h2 class="list-label first">Account</h2>
		<ul class="group">
			{#if data.email}
				<li class="row">
					<span class="row-title">{data.email}</span>
					<span class="row-sub">Signed in</span>
				</li>
			{/if}
			<li>
				<form method="POST" action="/?/signout_everywhere" onsubmit={clearToasts}>
					<button class="row action">Sign out of all devices</button>
				</form>
			</li>
		</ul>

		<h2 class="list-label">Delete account</h2>
		<form class="danger surface" method="POST" action="?/delete_account" use:enhance>
			<p>
				Deletes every receipt, price and photo, then your account. This can't be undone. Type <strong>DELETE</strong> to
				confirm.
			</p>
			<div class="confirm">
				<input name="confirm" bind:value={typed} autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Type DELETE to confirm" />
				<button class="delete" disabled={typed.trim() !== 'DELETE'}>Delete account</button>
			</div>
			{#if form?.problem}<p class="problem" role="alert">{form.problem}</p>{/if}
		</form>
		</div>
		</div>
	</main>
</AppShell>

<style>
	/* the ZIP row: its value, then the action that changes it */
	.zip-row {
		grid-template-columns: minmax(0, 1fr) auto auto;
	}

	.row-link {
		grid-column: 3;
		grid-row: 1 / span 2;
		border-radius: 8px;
		padding: 0.2rem 0.4rem;
		margin-right: -0.4rem;
		font-size: 0.9375rem;
		color: var(--color-accent);
		transition: background-color var(--quick) var(--ease);
	}

	.row-link:hover {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}

	.row-link:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.inset {
		padding: 0.25rem 1rem 1rem;
	}

	main {
		max-width: 40rem;
	}

	/* a laptop has room for two columns: what is kept and how it looks, then the account */
	@media (min-width: 1024px) {
		main {
			max-width: none;
		}

		.columns {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: start;
			gap: 2.5rem;
		}

		.list-label.first {
			margin-top: 0;
		}
	}

	h1 {
		margin-bottom: 1.5rem;
	}

	.list-label {
		margin-top: 1.75rem;
	}

	form:first-of-type .list-label {
		margin-top: 0;
	}

	label.row {
		cursor: pointer;
	}

	.row-sub {
		max-width: 30rem;
		white-space: normal;
	}

	/* the switch sits at the end of its row, beside the title and the note */
	.row :global(.switch) {
		grid-column: 2;
		grid-row: 1 / span 2;
	}

	.save {
		margin-top: 1rem;
	}

	.action {
		width: 100%;
		text-align: left;
		color: var(--color-accent);
	}

	@media (hover: hover) {
		.action:hover {
			background: rgb(0 0 0 / 0.025);
		}
	}

	.danger {
		padding: 1rem;
	}

	.danger p {
		font-size: 0.9375rem;
		line-height: 1.45;
		color: var(--color-muted);
	}

	.danger strong {
		font-weight: 600;
		color: var(--color-ink);
	}

	.confirm {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.9rem;
	}

	/* 16px text: iOS Safari zooms the page on any smaller input */
	.confirm input {
		flex: 1 1 10rem;
		min-width: 0;
		border-radius: 10px;
		background: var(--color-raised);
		padding: 0.6rem 0.8rem;
		font-size: 1rem;
		letter-spacing: 0.04em;
		color: var(--color-ink);
	}

	.confirm input:focus-visible {
		outline: 2px solid var(--color-danger);
		outline-offset: 1px;
	}

	.delete {
		border-radius: 999px;
		background: var(--color-danger);
		padding: 0.6rem 1.2rem;
		font-weight: 500;
		color: #fff;
	}

	.delete:disabled {
		background: color-mix(in srgb, var(--color-danger) 35%, transparent);
		cursor: not-allowed;
	}

	.danger .problem {
		margin-top: 0.6rem;
		color: var(--color-danger);
	}
</style>
