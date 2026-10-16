<script lang="ts">
	// Up or down is said three ways, word, arrow and colour, so nobody depends on telling red from green
	let { up }: { up: boolean } = $props();
</script>

<svg class="trend" viewBox="0 0 24 24" aria-hidden="true">
	<path d={up ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M19 12l-7 7-7-7'} />
</svg>

<style>
	.trend {
		display: inline-block;
		width: 0.95em;
		height: 0.95em;
		margin-right: 0.15em;
		vertical-align: -0.12em;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
