// A typed budget in dollars, like "400", "$1,250" or "99.50". null clears it; undefined is a typo.
export function budgetFromForm(typed: unknown): number | null | undefined {
	const text = String(typed ?? '').replace(/[$,\s]/g, '');
	if (!text) return null;
	if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return undefined;
	const cents = Math.round(Number(text) * 100);
	return cents >= 100 && cents <= 10_000_000 ? cents : undefined;
}

// how this month stands against the budget
export function budgetLine(budgetCents: number, spentCents: number): { text: string; over: boolean } {
	const left = budgetCents - spentCents;
	const dollars = (cents: number) => `$${Math.round(Math.abs(cents) / 100).toLocaleString('en-US')}`;
	if (left < 0) return { text: `${dollars(left)} over your ${dollars(budgetCents)} budget`, over: true };
	return { text: `${dollars(left)} left of your ${dollars(budgetCents)} budget`, over: false };
}
