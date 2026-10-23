<div class="site-footer">
	<span>© 2026 Billie</span>
	<a href="/privacy">Privacy</a>
	<a href="/feedback">Send feedback</a>
</div>

<style>
	.site-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 1.1rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 3px;
		transition:
			color 150ms,
			text-decoration-color 150ms;
	}

	@media (hover: hover) {
		a:hover {
			color: var(--color-ink);
			text-decoration-color: currentColor;
		}
	}

	a:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
		border-radius: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		a {
			transition: none;
		}
	}
</style>
