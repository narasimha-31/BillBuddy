<script lang="ts">
	// Today's prices are Walmart's typical 2026 shelf prices; "last" is the shopper's previous trip
	const lines = [
		{ label: 'LARGE EGGS 12CT', qty: 1, unit: 'EA', price: 2.1, last: { qty: 1, price: 1.98 } },
		{ label: 'BANANAS', qty: 2.1, unit: 'LB', price: 0.56, last: { qty: 3, price: 0.54 } },
		{ label: 'CHICKEN BREAST', qty: 1.62, unit: 'LB', price: 3.61, last: { qty: 2.05, price: 3.48 } },
		{ label: 'ROMAINE HEARTS 3PK', qty: 1, unit: 'EA', price: 3.98, last: { qty: 1, price: 3.98 } },
		{ label: 'CEREAL 18OZ', qty: 1, unit: 'EA', price: 2.88, last: { qty: 1, price: 3.12 } }
	];

	const cents = (qty: number, price: number) => Math.round(qty * price * 100);
	const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;
	const change = (now: number, before: number) => Math.round(((now - before) / before) * 100);
	const total = lines.reduce((sum, l) => sum + cents(l.qty, l.price), 0);
	const weighed = (unit: string) => unit === 'LB';

	// hover tilt moves only the receipt (a transform, never layout); off for touch and reduced motion
	let tilt = $state({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });

	function follow(event: PointerEvent) {
		if (event.pointerType === 'touch') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const px = (event.clientX - box.left) / box.width;
		const py = (event.clientY - box.top) / box.height;
		tilt = { x: (0.5 - py) * 6, y: (px - 0.5) * 8, glareX: px * 100, glareY: py * 100, active: true };
	}

	function settle() {
		tilt = { ...tilt, x: 0, y: 0, active: false };
	}
</script>

<svg width="0" height="0" class="absolute" aria-hidden="true">
	<filter id="thermal-ink">
		<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4" result="noise" />
		<feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" />
	</filter>
</svg>

<div
	class="w-full max-w-xs md:w-80 md:max-w-none xl:w-96"
	role="presentation"
	onpointermove={follow}
	onpointerleave={settle}
>
	<div
		class="receipt rounded-[3px] bg-receipt px-6 pt-7 pb-6 font-mono text-[13px] text-receipt-ink xl:px-8 xl:pt-9 xl:text-sm"
		class:active={tilt.active}
		style:--tilt-x="{tilt.x}deg"
		style:--tilt-y="{tilt.y}deg"
		style:--glare-x="{tilt.glareX}%"
		style:--glare-y="{tilt.glareY}%"
	>
		<div class="ink">
			<p class="text-center text-base font-bold tracking-widest">WALMART</p>

			<div class="my-4 border-t border-dashed border-receipt-line"></div>

			{#each lines as line (line.label)}
				{@const pct = change(line.price, line.last.price)}
				<div class="mb-4">
					<div class="flex justify-between">
						<span>{line.label}</span>
						<span>{dollars(cents(line.qty, line.price))}</span>
					</div>
					{#if weighed(line.unit)}
						<div class="flex justify-between text-receipt-muted">
							<span>{line.qty.toFixed(2)} LB</span>
							<span>${line.price.toFixed(2)}/LB</span>
						</div>
					{/if}
					<div class="mt-1 flex justify-between gap-2 text-xs text-receipt-muted">
						<span>
							last time {weighed(line.unit) ? `${line.last.qty.toFixed(2)} LB · ` : ''}{dollars(
								cents(line.last.qty, line.last.price)
							)}
						</span>
						{#if pct > 0}
							<span class="text-receipt-up">▲ {pct}%{weighed(line.unit) ? '/LB' : ''}</span>
						{:else if pct < 0}
							<span class="text-receipt-down">▼ {-pct}%{weighed(line.unit) ? '/LB' : ''}</span>
						{:else}
							<span>same price</span>
						{/if}
					</div>
				</div>
			{/each}

			<div class="border-t border-dashed border-receipt-line pt-3">
				<div class="flex justify-between font-bold">
					<span>TOTAL</span>
					<span>{dollars(total)}</span>
				</div>
			</div>

			<div class="barcode mt-6 h-10" aria-hidden="true"></div>
			<p class="mt-2 text-center text-xs tracking-[0.3em] text-receipt-muted">THANK YOU</p>
		</div>
	</div>
</div>

<style>
	/* paper: grain, uneven tone and curl shading, layered over the paper colour */
	.receipt {
		--grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .32 0 0 0 0 .29 0 0 0 0 .22 0 0 0 .2 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		--tone: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.012' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .4 0 0 0 0 .36 0 0 0 0 .28 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)'/%3E%3C/svg%3E");
		background-image:
			linear-gradient(90deg, rgb(0 0 0 / 0.035), transparent 12%, transparent 88%, rgb(0 0 0 / 0.04)),
			linear-gradient(180deg, rgb(255 255 255 / 0.35), transparent 25%, transparent 80%, rgb(0 0 0 / 0.04)),
			var(--tone),
			var(--grain);
		background-blend-mode: normal, normal, multiply, multiply;
		box-shadow:
			0 1px 1px rgb(0 0 0 / 0.08),
			0 6px 12px -6px rgb(0 0 0 / 0.2),
			0 22px 44px -16px rgb(0 0 0 / 0.35);
		position: relative;
		transform: perspective(900px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
		transition: transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}

	.receipt::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(circle at var(--glare-x) var(--glare-y), rgb(255 255 255 / 0.4), transparent 45%);
		mix-blend-mode: soft-light;
		opacity: 0;
		transition: opacity 400ms;
		pointer-events: none;
	}

	.receipt.active::after {
		opacity: 1;
	}

	/* thermal print sits slightly unevenly in the paper */
	.ink {
		filter: url(#thermal-ink);
		mix-blend-mode: multiply;
	}


	.barcode {
		background: repeating-linear-gradient(
			90deg,
			var(--color-receipt-ink) 0 2px,
			transparent 2px 4px,
			var(--color-receipt-ink) 4px 5px,
			transparent 5px 8px,
			var(--color-receipt-ink) 8px 11px,
			transparent 11px 12px
		);
		opacity: 0.85;
	}

	@media (prefers-reduced-motion: reduce) {
		.receipt {
			transition: none;
		}
	}
</style>
