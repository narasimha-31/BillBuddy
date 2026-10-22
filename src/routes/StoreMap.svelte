<script lang="ts" module>
	export type MapPin = {
		id: string;
		lat: number;
		lng: number;
		// the price on the pin, or null for a plain dot
		label: string | null;
		// what the label says, for deciding which of two touching tags stays put
		cents?: number | null;
		title: string;
		cheapest?: boolean;
		guess?: boolean;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { Map as LeafletMap, LayerGroup, Marker } from 'leaflet';
	import type { Point } from '../distance';

	let { you, pins, selected = null, onpick, label }: { you: Point | null; pins: MapPin[]; selected?: string | null; onpick?: (id: string) => void; label: string } = $props();

	let box: HTMLDivElement;
	let leaflet: typeof import('leaflet') | null = $state(null);
	let map: LeafletMap | null = null;
	let layer: LayerGroup | null = null;
	let framed = '';
	// store names come from receipts, so nothing from them reaches the page as markup
	const plain = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
	let priced: { marker: Marker; cents: number; id: string; label: string }[] = [];

	// Tags close enough to cover each other merge into one: the picked one, then the lower price, keeps its tag
	// and lists the others' prices after its own ("$2.10 · $2.44"); the others become dots at their true spots,
	// so every price stays readable and none sits away from its store. Redone after every zoom (pixels).
	const TAG_W = 62;
	const TAG_H = 32;
	function spread() {
		if (!map) return;
		const groups: { x: number; y: number; tag: HTMLElement; labels: string[]; cheapest: boolean }[] = [];
		const order = [...priced].sort((a, b) => Number(b.id === selected) - Number(a.id === selected) || a.cents - b.cents);
		for (const { marker, label } of order) {
			const tag = marker.getElement()?.querySelector<HTMLElement>('.price-pin');
			if (!tag) continue;
			const at = map.latLngToContainerPoint(marker.getLatLng());
			const near = groups.find((g) => Math.abs(g.x - at.x) < (TAG_W * (g.labels.length + 1)) / 2 && Math.abs(g.y - at.y) < TAG_H);
			if (near) {
				// a merged tag is white, so green never seems to cover the pricier stores; the first price leads
				near.labels.push(label);
				near.tag.innerHTML = `<b>${plain(near.labels[0])}</b> · ${near.labels.slice(1).map(plain).join(' · ')}`;
				near.tag.classList.remove('cheapest');
				near.tag.classList.toggle('merged-cheapest', near.cheapest);
			} else groups.push({ x: at.x, y: at.y, tag, labels: [label], cheapest: tag.classList.contains('cheapest') });
			tag.classList.toggle('priced', !near);
			tag.classList.toggle('dot', !!near);
			if (near) tag.textContent = '';
			else tag.textContent = label;
		}
	}


	// Leaflet and its styles load only where a map is shown. On a phone the strip never captures a
	// swipe, so the page still scrolls through it; pins stay tappable.
	onMount(() => {
		let gone = false;
		(async () => {
			const [L] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
			if (gone) return;
			const touch = matchMedia('(pointer: coarse)').matches;
			const still = prefersReducedMotion.current;
			map = L.map(box, {
				zoomControl: false,
				scrollWheelZoom: false,
				dragging: !touch,
				touchZoom: false,
				doubleClickZoom: !touch,
				minZoom: 9,
				maxZoom: 17,
				zoomSnap: 0.25,
				zoomAnimation: !still,
				fadeAnimation: !still,
				markerZoomAnimation: !still
			});
			L.tileLayer('/map/tiles/{z}/{x}/{y}', {
				minZoom: 9,
				maxZoom: 17,
				attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
			}).addTo(map);
			map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
			if (!touch) L.control.zoom({ position: 'bottomright' }).addTo(map);
			layer = L.layerGroup().addTo(map);
			map.on('zoomend', spread);
			leaflet = L;
		})();
		return () => {
			gone = true;
			map?.remove();
		};
	});

	$effect(() => {
		const L = leaflet;
		if (!L || !map || !layer) return;
		layer.clearLayers();
		priced = [];
		if (you)
			L.marker([you.lat, you.lng], { icon: L.divIcon({ className: 'you-pin', html: '<span></span>', iconSize: [16, 16] }), interactive: false, keyboard: false }).addTo(layer);
		for (const pin of pins) {
			const classes = ['price-pin', pin.label ? 'priced' : 'dot', pin.cheapest && 'cheapest', pin.guess && 'guess', pin.id === selected && 'on'].filter(Boolean).join(' ');
			const marker = L.marker([pin.lat, pin.lng], {
				icon: L.divIcon({ className: 'pin-anchor', html: `<span class="${classes}">${pin.label ? plain(pin.label) : ''}</span>`, iconSize: [0, 0] }),
				title: pin.title,
				alt: pin.title,
				keyboard: true,
				riseOnHover: true,
				zIndexOffset: pin.id === selected ? 1000 : pin.cheapest ? 500 : pin.label ? 100 : 0
			})
				.on('click', () => onpick?.(pin.id))
				.addTo(layer);
			if (pin.label && pin.cents != null) priced.push({ marker, cents: pin.cents, id: pin.id, label: pin.label });
		}

		// frame the pins once per set of pins, not on every selection
		const points = [...pins.map((p) => [p.lat, p.lng] as [number, number]), ...(you ? [[you.lat, you.lng] as [number, number]] : [])];
		const key = points.map((p) => p.join()).join('|');
		if (key !== framed && points.length) {
			framed = key;
			if (points.length === 1) map.setView(points[0], 14, { animate: false });
			else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15, animate: false });
		}
		spread();
	});
</script>

<div class="store-map" bind:this={box} role="region" aria-label={label}></div>

<style>
	.store-map {
		position: relative;
		z-index: 0;
		width: 100%;
		height: 100%;
		background: #f2f2f4;
	}

	/* the streets go quiet so the prices carry the colour */
	.store-map :global(.leaflet-tile-pane) {
		filter: grayscale(0.92) contrast(0.9) brightness(1.06);
	}

	.store-map :global(.leaflet-control-attribution) {
		border-top-left-radius: 6px;
		background: rgb(255 255 255 / 0.8);
		font-size: 0.625rem;
		color: var(--color-muted);
	}

	.store-map :global(.leaflet-control-attribution a) {
		color: inherit;
	}

	.store-map :global(.leaflet-control-zoom) {
		border: 0;
		border-radius: 10px;
		overflow: hidden;
		box-shadow:
			0 4px 12px rgb(0 0 0 / 0.12),
			0 0 0 0.5px rgb(0 0 0 / 0.08);
	}

	.store-map :global(.leaflet-control-zoom a) {
		width: 30px;
		height: 30px;
		border: 0;
		line-height: 30px;
		color: var(--color-ink);
	}

	/* the shopper's ZIP: a calm dot with a soft ring, never a pulsing beacon */
	.store-map :global(.you-pin span) {
		display: block;
		width: 16px;
		height: 16px;
		border: 3px solid #fff;
		border-radius: 50%;
		background: var(--color-ink);
		box-shadow: 0 0 0 6px rgb(29 29 31 / 0.12);
	}

	/* a price tag standing on its point: the anchor sits at the bottom of the tail */
	.store-map :global(.pin-anchor) {
		overflow: visible;
	}

	.store-map :global(.price-pin) {
		position: absolute;
		left: 0;
		bottom: 7px;
		transform: translateX(-50%);
		display: block;
		border-radius: 999px;
		background: var(--color-surface);
		padding: 0.22rem 0.55rem;
		font: 600 0.8125rem/1.2 var(--font-sans);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--color-ink);
		cursor: pointer;
		box-shadow:
			0 3px 10px rgb(0 0 0 / 0.16),
			0 0 0 0.5px rgb(0 0 0 / 0.1);
		transition:
			transform var(--standard) var(--ease),
			background-color var(--quick) var(--ease);
	}

	.store-map :global(.price-pin::after) {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -5px;
		width: 10px;
		height: 10px;
		border-radius: 0 0 3px 0;
		background: inherit;
		transform: translateX(-50%) rotate(45deg);
		box-shadow: 1.5px 1.5px 1px rgb(0 0 0 / 0.06);
	}

	/* a fingertip is bigger than a price tag: on touch screens each pin catches taps around it */
	@media (pointer: coarse) {
		.store-map :global(.price-pin::before) {
			content: '';
			position: absolute;
			inset: -12px -10px;
		}
	}

	.store-map :global(.price-pin.dot) {
		bottom: 4px;
		width: 12px;
		height: 12px;
		padding: 0;
		border: 2.5px solid #fff;
		background: color-mix(in srgb, var(--color-sep) 55%, transparent);
	}

	.store-map :global(.price-pin.dot::after) {
		display: none;
	}

	.store-map :global(.price-pin.cheapest) {
		background: var(--color-cheaper);
		color: #fff;
		transform: translateX(-50%) scale(1.08);
		transform-origin: 50% 100%;
	}

	/* a guessed branch: dashed edge, so it never reads as certain */
	.store-map :global(.price-pin.merged-cheapest b) {
		color: var(--color-cheaper);
	}

	.store-map :global(.price-pin.guess) {
		outline: 2px dashed color-mix(in srgb, var(--color-sep) 60%, transparent);
		outline-offset: 2.5px;
	}

	.store-map :global(.price-pin:hover) {
		transform: translateX(-50%) translateY(-2px);
	}

	.store-map :global(.price-pin.cheapest:hover) {
		transform: translateX(-50%) translateY(-2px) scale(1.08);
	}

	.store-map :global(.price-pin.on) {
		background: var(--color-ink);
		color: var(--color-on-ink);
	}

	.store-map :global(.leaflet-marker-icon:focus-visible .price-pin) {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.store-map :global(.price-pin) {
			transition: none;
		}
	}
</style>
