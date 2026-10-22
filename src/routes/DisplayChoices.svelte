<script lang="ts">
	import { enhance } from '$app/forms';
	import { applyDisplay, displayFromForm, TEXT_SIZES, type Display } from '../display';

	let { display }: { display: Display } = $props();

	const LABELS: Record<Display['text'], string> = { standard: 'Standard', large: 'Large', larger: 'Larger' };
	let chosen = $derived(display);
	let problem = $state('');

	// a choice shows at once and saves behind it; if the save fails the page goes back to what was saved
	function save(form: HTMLFormElement) {
		chosen = displayFromForm(new FormData(form));
		applyDisplay(chosen, document.documentElement);
		form.requestSubmit();
	}
</script>

<form
	class="display"
	method="POST"
	action="/settings?/display"
	use:enhance={() =>
		async ({ result }) => {
			problem = result.type === 'success' ? '' : 'That choice did not save. Try again.';
			if (result.type !== 'success') applyDisplay(display, document.documentElement);
		}}
>
	<ul class="group">
		<li class="row text">
			<span class="row-title" id="text-size">Text size</span>
			<div class="segmented" role="radiogroup" aria-labelledby="text-size">
				{#each TEXT_SIZES as size (size)}
					<label class:on={chosen.text === size}>
						<input type="radio" name="text_size" value={size} checked={chosen.text === size} onchange={(e) => save(e.currentTarget.form!)} />
						<span style:font-size={size === 'standard' ? '0.875rem' : size === 'large' ? '1rem' : '1.125rem'}>{LABELS[size]}</span>
					</label>
				{/each}
			</div>
		</li>
		<li>
			<label class="row">
				<span class="row-title">More contrast</span>
				<input class="switch" type="checkbox" role="switch" name="more_contrast" checked={chosen.contrast} onchange={(e) => save(e.currentTarget.form!)} />
				<span class="row-sub">Darker grey text and stronger lines.</span>
			</label>
		</li>
		<li>
			<label class="row">
				<span class="row-title">Colour-blind friendly colours</span>
				<input class="switch" type="checkbox" role="switch" name="colorblind" checked={chosen.palette === 'colorblind'} onchange={(e) => save(e.currentTarget.form!)} />
				<span class="row-sub">Blue for cheaper and orange for up, in place of green and red.</span>
			</label>
		</li>
	</ul>
	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}
	<noscript><button class="pill-button save">Save</button></noscript>
</form>

<style>
	label.row {
		cursor: pointer;
	}

	.row :global(.switch) {
		grid-column: 2;
		grid-row: 1 / span 2;
	}

	.row-sub {
		white-space: normal;
	}

	.text {
		grid-template-columns: minmax(0, 1fr);
		gap: 0.6rem;
	}

	/* the iOS segmented control, made of real radio buttons */
	.segmented {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 2px;
		border-radius: 9px;
		background: rgb(118 118 128 / 0.12);
		padding: 2px;
	}

	.segmented label {
		display: grid;
		place-items: center;
		min-height: 2.25rem;
		border-radius: 7px;
		font-weight: 500;
		color: var(--color-ink);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color var(--standard) var(--ease),
			box-shadow var(--standard) var(--ease),
			transform var(--standard) var(--ease);
	}

	.segmented label.on {
		background: var(--color-surface);
		box-shadow:
			0 3px 8px rgb(0 0 0 / 0.12),
			0 3px 1px rgb(0 0 0 / 0.04);
	}

	.segmented label:active {
		transform: scale(0.96);
		transition-duration: var(--quick);
	}

	.segmented input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.segmented label:has(input:focus-visible) {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	.problem {
		margin: 0.5rem 1rem 0;
		font-size: 0.875rem;
		color: var(--color-up);
	}

	.save {
		margin-top: 0.75rem;
	}
</style>
