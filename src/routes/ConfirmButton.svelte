<script lang="ts">
	import type { Snippet } from 'svelte';

	// A button inside a form that asks first. The browser's own dialog gives focus, Escape and screen readers;
	// the form is only sent from the dialog's own button.
	let { question, detail, yes, class: className, children }: { question: string; detail?: string; yes: string; class?: string; children: Snippet } = $props();

	let dialog: HTMLDialogElement;
	let trigger: HTMLButtonElement;

	function go() {
		dialog.close();
		trigger.form?.requestSubmit();
	}
</script>

<button type="button" class={className} bind:this={trigger} onclick={() => dialog.showModal()}>{@render children()}</button>
<dialog bind:this={dialog} class="confirm" aria-labelledby="confirm-question" onclick={(e) => e.target === dialog && dialog.close()}>
	<p id="confirm-question" class="question">{question}</p>
	{#if detail}<p class="detail">{detail}</p>{/if}
	<div class="buttons">
		<!-- svelte-ignore a11y_autofocus -->
		<button type="button" autofocus onclick={() => dialog.close()}>Cancel</button>
		<button type="button" class="danger" onclick={go}>{yes}</button>
	</div>
</dialog>

<style>
	.confirm {
		width: min(18rem, calc(100vw - 2rem));
		margin: auto;
		border: 0;
		border-radius: 16px;
		background: #fff;
		padding: 1.25rem 1.25rem 1rem;
		color: var(--color-ink);
		text-align: center;
		box-shadow: 0 24px 60px -16px rgb(0 0 0 / 0.35);
	}

	.confirm[open] {
		animation: pop var(--standard) var(--ease);
	}

	.confirm::backdrop {
		background: rgb(0 0 0 / 0.3);
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(1.06);
		}
	}

	.question {
		font-size: 1.0625rem;
		font-weight: 600;
	}

	.detail {
		margin-top: 0.35rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-top: 1.1rem;
	}

	.buttons button {
		min-height: 2.75rem;
		border-radius: 12px;
		background: rgb(118 118 128 / 0.12);
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-ink);
		transition: transform var(--standard) var(--ease);
	}

	.buttons button:active {
		transform: scale(0.97);
		transition-duration: var(--quick);
	}

	.buttons .danger {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		font-weight: 600;
		color: var(--color-danger);
	}

	.buttons button:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.confirm[open] {
			animation: none;
		}
	}
</style>
