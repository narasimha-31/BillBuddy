<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '../AppShell.svelte';
	import GoogleButton from '../GoogleButton.svelte';
	import SiteFooter from '../SiteFooter.svelte';
	import Wordmark from '../Wordmark.svelte';

	let { data, form } = $props();
	let kind = $state<'bug' | 'idea'>('bug');
</script>

<svelte:head>
	<title>Send feedback · Billie</title>
	<meta name="description" content="Tell the Billie team about a bug or an idea." />
</svelte:head>

{#snippet sendForm()}
	<main class="feedback">
		<h1 class="large-title">Send feedback</h1>
		{#if form?.sent}
			<div class="group thanks" role="status">
				<p class="row-title">Thanks, it's with us.</p>
				<p class="row-sub">We read every one.</p>
				<a class="pill-button" href={data.from || '/home'}>Done</a>
			</div>
		{:else}
			<form method="POST" action="?/send" use:enhance>
				<fieldset class="kinds">
					<legend class="list-label">What is it?</legend>
					<label class:on={kind === 'bug'}><input type="radio" name="kind" value="bug" bind:group={kind} />Something's broken</label>
					<label class:on={kind === 'idea'}><input type="radio" name="kind" value="idea" bind:group={kind} />An idea</label>
				</fieldset>
				<label class="list-label" for="message">{kind === 'bug' ? 'What happened, and what did you expect?' : 'What would make Billie better?'}</label>
				<textarea id="message" name="message" class="group" rows="6" maxlength="2000" required></textarea>
				<input type="hidden" name="page" value={data.from} />
				{#if form?.problem}<p class="problem" role="alert">{form.problem}</p>{/if}
				<button class="pill-button">Send</button>
			</form>
		{/if}
	</main>
{/snippet}

{#if data.signedIn}
	<AppShell firstName={data.firstName}>{@render sendForm()}</AppShell>
{:else}
	<div class="screen">
		<header class="top"><Wordmark /></header>
		<main class="feedback">
			<h1 class="large-title">Send feedback</h1>
			<p class="lead">Sign in first, so we can keep spam out and get back to you.</p>
			<GoogleButton />
		</main>
		<footer class="bottom"><SiteFooter /></footer>
	</div>
{/if}

<style>
	.feedback {
		display: grid;
		gap: 1rem;
		max-width: 36rem;
		padding-bottom: 3rem;
	}

	.screen .feedback {
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}

	.screen > .top,
	.screen > .bottom {
		max-width: 36rem;
		margin: 0 auto;
		padding: 1.25rem;
	}

	form {
		display: grid;
		gap: 0.6rem;
	}

	.kinds {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.6rem;
		border: 0;
		padding: 0;
	}

	.kinds legend {
		margin-bottom: 0.45rem;
	}

	.kinds label {
		position: relative;
		border-radius: 999px;
		background: var(--color-surface);
		padding: 0.6rem 1.1rem;
		font-size: 0.9375rem;
		color: var(--color-ink);
		cursor: pointer;
		transition: background-color 150ms, color 150ms;
	}

	.kinds label.on {
		background: var(--color-accent-fill);
		color: #fff;
	}

	.kinds input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.kinds label:has(input:focus-visible) {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	textarea {
		width: 100%;
		border: 0;
		padding: 0.9rem 1rem;
		font: inherit;
		font-size: 1rem;
		color: var(--color-ink);
		resize: vertical;
	}

	textarea:focus-visible {
		outline: 2px solid var(--color-accent);
	}

	form .pill-button {
		justify-self: start;
		margin-top: 0.4rem;
	}

	.problem {
		color: var(--color-danger);
		font-size: 0.9375rem;
	}

	.thanks {
		display: grid;
		gap: 0.35rem;
		justify-items: start;
		padding: 1.1rem 1rem;
	}

	.thanks .pill-button {
		margin-top: 0.75rem;
	}

	.lead {
		color: var(--color-muted);
	}
</style>
