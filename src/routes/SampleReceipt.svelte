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
	class="paper-shadow w-full max-w-xs md:w-80 md:max-w-none xl:w-96"
	role="presentation"
	onpointermove={follow}
	onpointerleave={settle}
>
	<div
		class="receipt rounded-t-[3px] bg-receipt px-6 pt-6 pb-8 font-mono text-[13px] text-receipt-ink xl:px-8 xl:pt-7 xl:text-sm"
		class:active={tilt.active}
		style:--tilt-x="{tilt.x}deg"
		style:--tilt-y="{tilt.y}deg"
		style:--glare-x="{tilt.glareX}%"
		style:--glare-y="{tilt.glareY}%"
	>
		<div class="ink">
			<p class="text-center text-base font-bold tracking-widest">WALMART</p>

			<div class="my-3 border-t border-dashed border-receipt-line"></div>

			{#each lines as line (line.label)}
				{@const pct = change(line.price, line.last.price)}
				<div class="mb-3">
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

		</div>

		<!-- kept outside .ink: the print texture would distort the code and stop phones reading it -->
		<a href="/privacy" class="mt-5 flex flex-col items-center gap-1.5 text-center">
			<svg
				viewBox="-4 -4 41 41"
				class="size-24"
				shape-rendering="crispEdges"
				role="img"
				aria-label="QR code that opens the privacy page"
			>
				<path fill="var(--color-receipt-ink)" d="M0 0h7v1h-7zM9 0h2v1h-2zM13 0h2v1h-2zM17 0h2v1h-2zM21 0h2v1h-2zM26 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM10 1h1v1h-1zM12 1h1v1h-1zM16 1h1v1h-1zM18 1h1v1h-1zM26 1h1v1h-1zM32 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM10 2h3v1h-3zM14 2h1v1h-1zM19 2h1v1h-1zM21 2h2v1h-2zM26 2h1v1h-1zM28 2h3v1h-3zM32 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM14 3h1v1h-1zM16 3h1v1h-1zM18 3h1v1h-1zM20 3h1v1h-1zM22 3h3v1h-3zM26 3h1v1h-1zM28 3h3v1h-3zM32 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM10 4h3v1h-3zM14 4h3v1h-3zM20 4h3v1h-3zM26 4h1v1h-1zM28 4h3v1h-3zM32 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h2v1h-2zM12 5h1v1h-1zM14 5h2v1h-2zM19 5h1v1h-1zM21 5h1v1h-1zM23 5h2v1h-2zM26 5h1v1h-1zM32 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h7v1h-7zM8 7h5v1h-5zM14 7h3v1h-3zM19 7h2v1h-2zM23 7h1v1h-1zM0 8h1v1h-1zM6 8h1v1h-1zM8 8h1v1h-1zM10 8h2v1h-2zM13 8h2v1h-2zM17 8h1v1h-1zM19 8h2v1h-2zM22 8h5v1h-5zM29 8h3v1h-3zM1 9h1v1h-1zM3 9h3v1h-3zM10 9h1v1h-1zM13 9h3v1h-3zM17 9h3v1h-3zM21 9h1v1h-1zM23 9h2v1h-2zM28 9h4v1h-4zM6 10h2v1h-2zM9 10h1v1h-1zM11 10h1v1h-1zM13 10h3v1h-3zM17 10h1v1h-1zM20 10h1v1h-1zM22 10h1v1h-1zM24 10h1v1h-1zM26 10h1v1h-1zM28 10h1v1h-1zM30 10h2v1h-2zM0 11h1v1h-1zM2 11h1v1h-1zM4 11h2v1h-2zM8 11h2v1h-2zM13 11h1v1h-1zM15 11h1v1h-1zM17 11h5v1h-5zM25 11h1v1h-1zM27 11h5v1h-5zM0 12h1v1h-1zM6 12h3v1h-3zM10 12h4v1h-4zM15 12h1v1h-1zM17 12h1v1h-1zM19 12h1v1h-1zM21 12h1v1h-1zM24 12h1v1h-1zM26 12h2v1h-2zM31 12h2v1h-2zM0 13h1v1h-1zM4 13h1v1h-1zM7 13h2v1h-2zM10 13h1v1h-1zM18 13h1v1h-1zM24 13h4v1h-4zM30 13h3v1h-3zM1 14h6v1h-6zM8 14h1v1h-1zM10 14h3v1h-3zM15 14h2v1h-2zM20 14h3v1h-3zM25 14h4v1h-4zM30 14h2v1h-2zM2 15h2v1h-2zM7 15h1v1h-1zM10 15h1v1h-1zM12 15h1v1h-1zM14 15h1v1h-1zM16 15h1v1h-1zM20 15h1v1h-1zM24 15h2v1h-2zM28 15h3v1h-3zM32 15h1v1h-1zM0 16h1v1h-1zM2 16h1v1h-1zM4 16h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM12 16h6v1h-6zM22 16h4v1h-4zM27 16h3v1h-3zM32 16h1v1h-1zM4 17h1v1h-1zM9 17h8v1h-8zM18 17h3v1h-3zM23 17h1v1h-1zM26 17h1v1h-1zM29 17h2v1h-2zM32 17h1v1h-1zM0 18h2v1h-2zM4 18h1v1h-1zM6 18h2v1h-2zM9 18h2v1h-2zM14 18h2v1h-2zM17 18h3v1h-3zM21 18h4v1h-4zM26 18h2v1h-2zM29 18h2v1h-2zM32 18h1v1h-1zM1 19h5v1h-5zM8 19h2v1h-2zM12 19h1v1h-1zM14 19h1v1h-1zM16 19h1v1h-1zM20 19h1v1h-1zM22 19h1v1h-1zM26 19h1v1h-1zM28 19h3v1h-3zM32 19h1v1h-1zM0 20h3v1h-3zM6 20h1v1h-1zM12 20h2v1h-2zM15 20h1v1h-1zM18 20h2v1h-2zM21 20h1v1h-1zM23 20h1v1h-1zM25 20h1v1h-1zM28 20h2v1h-2zM31 20h2v1h-2zM0 21h6v1h-6zM8 21h2v1h-2zM14 21h1v1h-1zM17 21h1v1h-1zM23 21h1v1h-1zM27 21h2v1h-2zM30 21h1v1h-1zM0 22h1v1h-1zM2 22h1v1h-1zM5 22h2v1h-2zM10 22h1v1h-1zM13 22h1v1h-1zM17 22h1v1h-1zM19 22h1v1h-1zM21 22h2v1h-2zM27 22h1v1h-1zM30 22h2v1h-2zM0 23h1v1h-1zM3 23h2v1h-2zM7 23h2v1h-2zM10 23h1v1h-1zM13 23h4v1h-4zM18 23h3v1h-3zM23 23h2v1h-2zM26 23h1v1h-1zM30 23h3v1h-3zM0 24h3v1h-3zM6 24h1v1h-1zM8 24h1v1h-1zM11 24h3v1h-3zM16 24h1v1h-1zM18 24h1v1h-1zM20 24h1v1h-1zM23 24h7v1h-7zM31 24h1v1h-1zM8 25h2v1h-2zM11 25h1v1h-1zM13 25h7v1h-7zM21 25h1v1h-1zM24 25h1v1h-1zM28 25h1v1h-1zM30 25h1v1h-1zM32 25h1v1h-1zM0 26h7v1h-7zM9 26h1v1h-1zM11 26h2v1h-2zM15 26h1v1h-1zM17 26h1v1h-1zM20 26h1v1h-1zM22 26h3v1h-3zM26 26h1v1h-1zM28 26h1v1h-1zM30 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM11 27h1v1h-1zM14 27h2v1h-2zM17 27h2v1h-2zM20 27h5v1h-5zM28 27h3v1h-3zM32 27h1v1h-1zM0 28h1v1h-1zM2 28h3v1h-3zM6 28h1v1h-1zM10 28h2v1h-2zM15 28h2v1h-2zM19 28h4v1h-4zM24 28h6v1h-6zM31 28h2v1h-2zM0 29h1v1h-1zM2 29h3v1h-3zM6 29h1v1h-1zM9 29h4v1h-4zM14 29h1v1h-1zM17 29h2v1h-2zM23 29h3v1h-3zM27 29h3v1h-3zM32 29h1v1h-1zM0 30h1v1h-1zM2 30h3v1h-3zM6 30h1v1h-1zM9 30h1v1h-1zM12 30h4v1h-4zM19 30h1v1h-1zM21 30h1v1h-1zM23 30h1v1h-1zM25 30h1v1h-1zM27 30h2v1h-2zM31 30h2v1h-2zM0 31h1v1h-1zM6 31h1v1h-1zM14 31h1v1h-1zM18 31h1v1h-1zM27 31h4v1h-4zM0 32h7v1h-7zM8 32h4v1h-4zM15 32h3v1h-3zM20 32h1v1h-1zM22 32h4v1h-4zM27 32h1v1h-1zM29 32h1v1h-1zM31 32h1v1h-1z" />
			</svg>
			<span class="text-xs font-bold tracking-[0.2em]">SCAN FOR THE FINE PRINT</span>
			<span class="text-xs text-receipt-muted">it's short. we checked.</span>
		</a>
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
		/* torn bottom edge, like paper pulled across the tear bar */
		--tear: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% 100% / 12px 7px repeat-x,
			linear-gradient(#000 0 0) top / 100% calc(100% - 6px) no-repeat;
		-webkit-mask: var(--tear);
		mask: var(--tear);
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

	/* the mask clips box-shadow, so the shadow comes from the wrapper and follows the torn edge */
	.paper-shadow {
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.1)) drop-shadow(0 14px 20px rgb(0 0 0 / 0.3));
	}

	/* thermal print sits slightly unevenly in the paper */
	.ink {
		filter: url(#thermal-ink);
		mix-blend-mode: multiply;
	}



	@media (prefers-reduced-motion: reduce) {
		.receipt {
			transition: none;
		}
	}
</style>
