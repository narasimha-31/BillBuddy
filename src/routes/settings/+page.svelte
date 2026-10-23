<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import AppShell from '../AppShell.svelte';
	import DisplayChoices from '../DisplayChoices.svelte';
	import MapUnlock from '../MapUnlock.svelte';
	import { leaveApp } from '../../app-visit';
	import { downloadData } from './download-data';

	let { data, form } = $props();

	// follows the saved value, and flips at once on a tap so the note under the switch never lags
	let keepPhotos = $derived(data.keepPhotos);

	let withPhotos = $state(false);
	let downloading = $state(false);
	let photosDone = $state(0);
	let photosOf = $state(0);
	let downloadProblem = $state('');
	async function download() {
		downloading = true;
		downloadProblem = '';
		photosOf = 0;
		try {
			await downloadData(keepPhotos && withPhotos, (done, of) => ([photosDone, photosOf] = [done, of]));
		} catch {
			downloadProblem = "The download didn't finish. Try again in a moment.";
		} finally {
			downloading = false;
		}
	}
	let typed = $state('');
	let changingZip = $state(false);

	// Safari fires change and then submit on Enter; the same amount goes out once
	let sentBudget: FormDataEntryValue | null = null;
	const savedBudget = $derived(data.budgetCents ? String(data.budgetCents / 100) : '');
	// what is typed, back in step whenever a save comes back
	let budget = $derived(savedBudget);
	let budgetSaved = $state(false);
	let savedTimer: ReturnType<typeof setTimeout>;
	const saveBudget: SubmitFunction = ({ formData, cancel }) => {
		if (formData.get('budget') === sentBudget) return cancel();
		sentBudget = formData.get('budget');
		return async ({ update, result }) => {
			if (result.type !== 'success') sentBudget = null;
			await update({ reset: false });
			if (result.type !== 'success') return;
			budgetSaved = true;
			clearTimeout(savedTimer);
			savedTimer = setTimeout(() => (budgetSaved = false), 2000);
		};
	};
</script>

<svelte:head>
	<title>Settings · Billie</title>
</svelte:head>

<AppShell firstName={data.firstName}>
	<main>
		<h1 class="large-title">Settings</h1>

		<div class="columns">
		<div class="column">
		<form method="POST" action="?/budget" use:enhance={saveBudget}>
			<h2 class="list-label">Budget</h2>
			<ul class="group">
				<li>
					<label class="row">
						<span class="row-title">Monthly groceries</span>
						<span class="budget">
							<span aria-hidden="true">$</span>
							<input name="budget" inputmode="decimal" autocomplete="off" placeholder="None" maxlength="10" value={budget} oninput={(e) => (budget = e.currentTarget.value)} onchange={(e) => e.currentTarget.form?.requestSubmit()} />
							<button class="save-budget" class:saved={budgetSaved} disabled={budget.trim() === savedBudget}>{budgetSaved ? 'Saved' : 'Save'}</button>
						</span>
						<span class="row-sub">Home shows what is left this month. Leave it empty for no budget.</span>
					</label>
				</li>
			</ul>
			{#if form?.budgetProblem}<p class="problem budget-problem" role="alert">{form.budgetProblem}</p>{/if}
		</form>


		<!-- a switch applies the moment it flips, as in iOS; without JavaScript the Save button does it -->
		<form method="POST" action="?/save" use:enhance={() => async ({ update }) => update({ reset: false })}>
			<h2 class="list-label">What Billie keeps</h2>
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

		<h2 class="list-label">Display</h2>
		<DisplayChoices display={data.display} />

		<ul class="group tour-again">
			<li>
				<form method="POST" action="?/tour_again">
					<button class="row">Show the tour of Home again</button>
				</form>
			</li>
			<li><a class="row" href="/feedback?from=/settings">Send feedback or report a bug</a></li>
		</ul>
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
				<form method="POST" action="/?/signout_everywhere" use:enhance={leaveApp}>
					<button class="row action">Sign out of all devices</button>
				</form>
			</li>
		</ul>

		<h2 class="list-label">Your data</h2>
		<ul class="group">
			{#if keepPhotos}
				<li>
					<label class="row">
						<span class="row-title">Include photos</span>
						<input class="switch" type="checkbox" role="switch" bind:checked={withPhotos} />
						<span class="row-sub">A .zip with the spreadsheet and every kept photo.</span>
					</label>
				</li>
			{/if}
			<li>
				<button class="row action" onclick={download} disabled={downloading}>
					<span class="row-title">{downloading ? (photosOf ? `Getting photos, ${photosDone} of ${photosOf}…` : 'Getting your data ready…') : 'Download my data'}</span>
					<span class="row-sub">An Excel file with every receipt, item and your list.</span>
				</button>
			</li>
		</ul>
		{#if downloadProblem}<p class="problem" role="alert">{downloadProblem}</p>{/if}

		<!-- the one step that can't be undone stays folded until asked for -->
		<details class="delete-account group" open={!!form?.problem}>
			<summary class="row">Delete account…</summary>
		<form class="danger" method="POST" action="?/delete_account" use:enhance={leaveApp}>
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
		</details>
		</div>
		</div>
	</main>
</AppShell>

<style>
	/* the ZIP row: its value, then the action that changes it */
	.zip-row {
		grid-template-columns: minmax(0, 1fr) auto auto;
	}

	/* one line: the label, the ZIP and Change share a baseline */
	.zip-row .row-value,
	.zip-row .row-link {
		grid-row: 1;
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

	.budget {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		color: var(--color-muted);
	}

	/* 16px text: iOS Safari zooms the page on any smaller field */
	.budget input {
		width: 4.75rem;
		border: 1px solid color-mix(in srgb, var(--color-sep) 18%, transparent);
		border-radius: 10px;
		background: var(--color-surface);
		padding: 0.4rem 0.6rem;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
		color: var(--color-ink);
	}

	.budget input:focus {
		border-color: var(--color-accent);
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
	}

	.save-budget {
		position: relative;
		margin-left: 0.4rem;
		border-radius: 999px;
		background: var(--color-accent-fill);
		padding: 0.4rem 0.9rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #fff;
		transition:
			opacity var(--quick) var(--ease),
			transform var(--quick) var(--ease);
	}

	.save-budget:active {
		transform: scale(0.96);
	}

	.save-budget:disabled:not(.saved) {
		opacity: 0.4;
	}

	/* a 44px reach */
	.save-budget::after {
		content: '';
		position: absolute;
		inset: -6px -4px;
	}

	.budget-problem {
		margin: 0.5rem 1rem 0;
		font-size: 0.8125rem;
		color: var(--color-up);
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

	/* an action, not a page: no chevron */
	.action::after {
		content: none;
	}

	.action .row-title {
		color: inherit;
	}

	.action:disabled {
		opacity: 0.7;
	}

	.problem {
		margin: 0.5rem 1rem 0;
		font-size: 0.9375rem;
		color: var(--color-danger);
	}

	.delete-account {
		margin-top: 1.75rem;
	}

	.tour-again {
		margin-top: 1rem;
	}

	.delete-account summary {
		list-style: none;
		color: var(--color-danger);
		cursor: pointer;
	}

	.delete-account summary::-webkit-details-marker {
		display: none;
	}

	.delete-account[open] summary {
		border-bottom: 1px solid color-mix(in srgb, var(--color-sep) 14%, transparent);
	}

	@media (hover: hover) {
		.action:hover {
			background: color-mix(in srgb, var(--color-shade) 2.5%, transparent);
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
