<script lang="ts">
	// what each kind of pin on a map means, drawn like the pins themselves
	let { keys }: { keys: { kind: 'tag' | 'cheapest' | 'dot'; sample?: string; text: string }[] } = $props();
</script>

<ul class="legend">
	{#each keys as key (key.kind)}
		<li>
			<span class="key {key.kind}" aria-hidden="true">{key.sample ?? ''}</span>
			<span>{key.text}</span>
		</li>
	{/each}
</ul>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.key {
		flex: none;
		border-radius: 999px;
		background: var(--color-surface);
		padding: 0.1rem 0.45rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		box-shadow:
			0 1px 4px rgb(0 0 0 / 0.14),
			0 0 0 0.5px rgb(0 0 0 / 0.1);
	}

	.key.cheapest {
		background: var(--color-cheaper);
		color: #fff;
	}

	.key.dot {
		width: 12px;
		height: 12px;
		padding: 0;
		border: 2.5px solid #fff;
		background: color-mix(in srgb, var(--color-sep) 55%, transparent);
	}
</style>
