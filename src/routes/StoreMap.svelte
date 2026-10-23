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

	// full: the map has the screen to itself, so a finger drags and pinches it
	let { you, pins, selected = null, onpick, label, full = false }: { you: Point | null; pins: MapPin[]; selected?: string | null; onpick?: (id: string) => void; label: string; full?: boolean } = $props();

	let box: HTMLDivElement;
	let leaflet: typeof import('leaflet') | null = $state(null);
	let map: LeafletMap | null = null;
	let layer: LayerGroup | null = null;
	let framed = '';
	// store names come from receipts, so nothing from them reaches the page as markup
	const plain = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
	type Priced = { marker: Marker; cents: number; id: string; label: string; title: string; cheapest: boolean };
	let priced: Priced[] = [];
	// each bubble's stores, by the id of the pin that carries it
	let groups = new Map<string, Priced[]>();

	// Tags close enough to cover each other become one bubble at the cheapest of them, "3 stores · from
	// $2.10", green when it holds the cheapest store; the others turn into dots at their true spots.
	// Tapping a bubble zooms in until they part. Redone after every zoom, since it works in pixels.
	const NEAR_X = 100;
	const NEAR_Y = 32;
	function spread() {
		if (!map) return;
		groups = new Map();
		const leads: { x: number; y: number; id: string }[] = [];
		const order = [...priced].sort((a, b) => Number(b.id === selected) - Number(a.id === selected) || a.cents - b.cents);
		for (const pin of order) {
			const at = map.latLngToContainerPoint(pin.marker.getLatLng());
			const near = leads.find((l) => Math.abs(l.x - at.x) < NEAR_X && Math.abs(l.y - at.y) < NEAR_Y);
			if (near) groups.get(near.id)!.push(pin);
			else {
				leads.push({ x: at.x, y: at.y, id: pin.id });
				groups.set(pin.id, [pin]);
			}
		}
		for (const [lead, members] of groups) {
			const low = members.reduce((a, b) => (b.cents < a.cents ? b : a));
			for (const pin of members) {
				const tag = pin.marker.getElement()?.querySelector<HTMLElement>('.price-pin');
				if (!tag) continue;
				const leads = pin.id === lead;
				const bubble = leads && members.length > 1;
				tag.classList.toggle('priced', leads);
				tag.classList.toggle('dot', !leads);
				tag.classList.toggle('bubble', bubble);
				tag.classList.toggle('cheapest', leads && (bubble ? members.some((m) => m.cheapest) : pin.cheapest));
				tag.textContent = !leads ? '' : bubble ? `${members.length} stores · from ${low.label}` : pin.label;
			}
		}
	}

	// a bubble zooms in to part its stores; when they still touch at the closest zoom, it lists them
	function openBubble(L: typeof import('leaflet'), members: Priced[]) {
		if (!map) return;
		const bounds = L.latLngBounds(members.map((m) => m.marker.getLatLng()));
		const target = Math.min(map.getBoundsZoom(bounds, false, L.point(120, 120)), map.getMaxZoom());
		if (target > map.getZoom() + 0.2) {
			map.flyToBounds(bounds, { padding: [60, 60], maxZoom: target, duration: prefersReducedMotion.current ? 0 : 0.5 });
			return;
		}
		const rows = [...members]
			.sort((a, b) => a.cents - b.cents)
			.map((m) => `<button type="button" data-id="${plain(m.id)}"><span>${plain(m.title)}</span><b>${plain(m.label)}</b></button>`)
			.join('');
		L.popup({ className: 'bubble-list', closeButton: false, maxWidth: 280 }).setLatLng(members[0].marker.getLatLng()).setContent(`<div>${rows}</div>`).openOn(map);
	}

	// Leaflet and its styles load only where a map is shown. On a phone the strip never captures a
	// swipe, so the page still scrolls through it; the full-screen map moves like any map app.
	onMount(() => {
		let gone = false;
		(async () => {
			const [L] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
			if (gone) return;
			const touch = !full && matchMedia('(pointer: coarse)').matches;
			const still = prefersReducedMotion.current;
			map = L.map(box, {
				zoomControl: false,
				scrollWheelZoom: false,
				dragging: !touch,
				touchZoom: !touch,
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
			// full screen keeps the bottom for the store bar
			if (!touch) L.control.zoom({ position: full ? 'topleft' : 'bottomright' }).addTo(map);
			layer = L.layerGroup().addTo(map);
			map.on('zoomend', spread);
			// a row in a bubble's list picks that store
			map.on('popupopen', (e) => {
				e.popup.getElement()?.addEventListener('click', (click) => {
					const row = (click.target as HTMLElement).closest<HTMLElement>('[data-id]');
					if (!row) return;
					map?.closePopup();
					onpick?.(row.dataset.id!);
				});
			});
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
				.on('click', () => {
					const members = groups.get(pin.id);
					if (members && members.length > 1) openBubble(L, members);
					else onpick?.(pin.id);
				})
				.addTo(layer);
			if (pin.label && pin.cents != null) priced.push({ marker, cents: pin.cents, id: pin.id, label: pin.label, title: pin.title, cheapest: !!pin.cheapest });
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
		background: var(--color-map);
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

	.store-map :global(.price-pin.guess) {
		outline: 2px dashed color-mix(in srgb, var(--color-sep) 60%, transparent);
		outline-offset: 2.5px;
	}

	/* a bubble: a few stores close together; tapping it zooms in to part them */
	.store-map :global(.price-pin.bubble) {
		box-shadow:
			0 3px 10px rgb(0 0 0 / 0.16),
			0 0 0 0.5px rgb(0 0 0 / 0.1),
			3px 3px 0 -1px var(--color-surface),
			3px 3px 0 0 rgb(0 0 0 / 0.12);
	}

	.store-map :global(.bubble-list .leaflet-popup-content-wrapper) {
		border-radius: 14px;
		padding: 0;
	}

	.store-map :global(.bubble-list .leaflet-popup-content) {
		margin: 0.35rem;
	}

	.store-map :global(.bubble-list button) {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		min-height: 2.75rem;
		border-radius: 10px;
		padding: 0.5rem 0.65rem;
		font: 0.875rem/1.3 var(--font-sans);
		text-align: left;
		color: var(--color-ink);
	}

	.store-map :global(.bubble-list button:first-child b) {
		color: var(--color-cheaper);
	}

	.store-map :global(.bubble-list button:active) {
		background: rgb(118 118 128 / 0.12);
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
