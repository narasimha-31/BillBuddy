<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';

	// Turning the store map on: a ZIP code and one button, sent to Settings from wherever the map is.
	// Finding the stores on OpenStreetMap takes a few seconds, so the button says so while it works.
	let { zip = '', button = 'Show my stores on a map', ondone }: { zip?: string | null; button?: string; ondone?: () => void } = $props();

	let working = $state(false);
	let problem = $state('');

	const turnOn: SubmitFunction = () => {
		working = true;
		problem = '';
		return async ({ result }) => {
			working = false;
			if (result.type === 'success') {
				await invalidateAll();
				ondone?.();
			} else if (result.type === 'failure') problem = String(result.data?.mapProblem ?? 'That didn’t save. Try again.');
			else problem = 'That didn’t save. Try again.';
		};
	};
</script>

<form class="unlock" method="POST" action="/settings?/location" use:enhance={turnOn}>
	<input type="hidden" name="map" value="on" />
	<label class="zip">
		<span>Your ZIP code</span>
		<input name="zip" value={zip ?? ''} inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{'{'}5{'}'}" maxlength="5" placeholder="77036" required disabled={working} />
	</label>
	<button class="pill-button" disabled={working}>{working ? 'Finding your stores…' : button}</button>
	<p class="why">Only the ZIP is kept, never your address. It places your stores and is never sent anywhere. Turn it off any time in Settings, and it’s deleted.</p>
	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
</form>

<style>
	.unlock {
		display: grid;
		grid-template-columns: minmax(0, 9rem) auto;
		align-items: end;
		justify-content: start;
		gap: 0.6rem 0.75rem;
	}

	.zip {
		display: grid;
		gap: 0.3rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	/* 16px text: iOS Safari zooms the page on any smaller field */
	.zip input {
		width: 100%;
		border: 1px solid rgb(60 60 67 / 0.18);
		border-radius: 10px;
		background: #fff;
		padding: 0.55rem 0.75rem;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.08em;
		color: var(--color-ink);
		transition:
			border-color var(--quick) var(--ease),
			box-shadow var(--quick) var(--ease);
	}

	.zip input:focus {
		border-color: var(--color-accent);
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
	}

	.why,
	.problem {
		grid-column: 1 / -1;
		max-width: 40ch;
		font-size: 0.8125rem;
		line-height: 1.45;
	}

	.why {
		color: var(--color-muted);
	}

	.problem {
		color: var(--color-danger);
	}
</style>
