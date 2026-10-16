<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '../AppShell.svelte';

	let { data, form } = $props();

	// follows the saved value, and flips at once on a tap so the note under the switch never lags
	let keepPhotos = $derived(data.keepPhotos);
	let typed = $state('');
</script>

<svelte:head>
	<title>Settings · BillBuddy</title>
</svelte:head>

<AppShell firstName={data.firstName}>
	<main>
		<h1 class="large-title">Settings</h1>

		<!-- a switch applies the moment it flips, as in iOS; without JavaScript the Save button does it -->
		<form method="POST" action="?/save" use:enhance={() => async ({ update }) => update({ reset: false })}>
			<h2 class="list-label">What BillBuddy keeps</h2>
			<ul class="group">
				<li>
					<label class="row">
						<span class="row-title">Store names</span>
						<input
							class="switch"
							type="checkbox"
							role="switch"
							name="keep_store_name"
							checked={data.keepStoreName}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
						<span class="row-sub">So you can see where a price was cheaper.</span>
					</label>
				</li>
				<li>
					<label class="row">
						<span class="row-title">Store addresses</span>
						<input
							class="switch"
							type="checkbox"
							role="switch"
							name="keep_store_location"
							checked={data.keepStoreAddress}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
						<span class="row-sub">Which branch you shopped at, as printed on the receipt. Turning this off deletes them.</span>
					</label>
				</li>
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

		<h2 class="list-label">Account</h2>
		<ul class="group">
			{#if data.email}
				<li class="row">
					<span class="row-title">{data.email}</span>
					<span class="row-sub">Signed in</span>
				</li>
			{/if}
			<li>
				<form method="POST" action="/?/signout_everywhere">
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
	</main>
</AppShell>

<style>
	main {
		max-width: 40rem;
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

	/* the iOS switch, drawn from a real checkbox so keyboard and screen readers work as usual */
	.switch {
		grid-column: 2;
		grid-row: 1 / span 2;
		position: relative;
		width: 51px;
		height: 31px;
		border-radius: 999px;
		background: rgb(120 120 128 / 0.16);
		appearance: none;
		cursor: pointer;
		transition: background-color 250ms;
	}

	.switch::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 27px;
		height: 27px;
		border-radius: 999px;
		background: #fff;
		box-shadow:
			0 3px 8px rgb(0 0 0 / 0.15),
			0 3px 1px rgb(0 0 0 / 0.06);
		transition: transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.switch:checked {
		background: var(--color-accent);
	}

	.switch:checked::after {
		transform: translateX(20px);
	}

	.switch:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
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
		outline: 2px solid var(--color-up);
		outline-offset: 1px;
	}

	.delete {
		border-radius: 999px;
		background: var(--color-up);
		padding: 0.6rem 1.2rem;
		font-weight: 500;
		color: #fff;
	}

	.delete:disabled {
		background: color-mix(in srgb, var(--color-up) 35%, transparent);
		cursor: not-allowed;
	}

	.danger .problem {
		margin-top: 0.6rem;
		color: var(--color-up);
	}
</style>
