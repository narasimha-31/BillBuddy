<script lang="ts">
	let { firstName }: { firstName: string | null } = $props();

	let menu: HTMLDetailsElement;
	const initial = $derived((firstName ?? 'B').charAt(0).toUpperCase());

	// a <details> menu works with the keyboard and without JavaScript; this only closes it on an outside click
	function closeOutside(event: MouseEvent) {
		if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
	}
</script>

<svelte:window onclick={closeOutside} />

<div class="account">
	{#if firstName}<span class="hello">Hi {firstName}</span>{/if}
	<details bind:this={menu}>
		<summary aria-label="Account menu">
			<span class="initial">{initial}</span>
		</summary>
		<div class="menu">
			<form method="POST" action="/?/signout">
				<button>Sign out</button>
			</form>
			<form method="POST" action="/?/signout_everywhere">
				<button>Sign out of all devices</button>
			</form>
		</div>
	</details>
</div>

<style>
	.account {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.hello {
		color: var(--color-ink);
		white-space: nowrap;
	}

	/* the nav needs the room on phones; the initial still says whose account it is */
	@media (max-width: 480px) {
		.hello {
			display: none;
		}
	}

	details {
		position: relative;
	}

	summary {
		list-style: none;
		border-radius: 999px;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.initial {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		background: var(--color-brand);
		font-weight: 600;
		color: var(--color-receipt);
	}

	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 0.5rem);
		z-index: 10;
		display: grid;
		min-width: 13rem;
		border-radius: 0.75rem;
		background: var(--color-receipt);
		padding: 0.35rem;
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.08),
			0 12px 28px -10px rgb(0 0 0 / 0.35);
	}

	.menu button {
		width: 100%;
		border-radius: 0.5rem;
		padding: 0.6rem 0.75rem;
		text-align: left;
		font-size: 0.9rem;
		color: var(--color-receipt-ink);
	}

	@media (hover: hover) {
		.menu button:hover {
			background: rgb(46 48 44 / 0.06);
		}
	}

	.menu button:focus-visible {
		outline: 2px solid var(--color-accent);
	}
</style>
