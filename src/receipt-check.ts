// What the vision model returns. Nothing in it is trusted until checkReading() has run.
export type Reading = {
	kind: 'store_receipt' | 'online_order' | 'not_a_receipt';
	handwritten: boolean;
	store: string | null;
	purchase_date: string | null;
	channel: 'in_store' | 'delivery' | 'pickup' | 'unknown';
	lines: { raw: string; quantity: number | null; unit: string | null; unit_price: number | null; total: number; discount: boolean }[];
	subtotal: number | null;
	tax: number | null;
	total: number | null;
};

export type CheckedLine = {
	raw: string;
	quantity: number;
	unit: string;
	unitPriceCents: number | null;
	totalCents: number;
	kind: 'item' | 'discount';
};

export type Checked =
	| { ok: false; reason: 'not_a_receipt' | 'handwritten' | 'no_lines' }
	| {
			ok: true;
			store: string | null;
			purchasedOn: string | null;
			channel: Reading['channel'];
			lines: CheckedLine[];
			subtotalCents: number | null;
			taxCents: number | null;
			totalCents: number | null;
			adds_up: boolean;
	  };

const UNITS = new Set(['ea', 'lb', 'oz', 'kg', 'g', 'gal', 'l', 'ct']);
const MAX_LINES = 80;

// payment and identity details we never keep, even if the model transcribed them
// narrow on purpose: "BIRTHDAY CARD" and "MEMBER'S MARK EGGS" are groceries, not payment data
const PAYMENT = new RegExp(
	[
		String.raw`(\*{2,}|x{4,})\s*\d{2,4}`,
		String.raw`\b\d{12,19}\b`,
		String.raw`\b(auth|approval|appr|ref)\s*(code|#|no)?\s*[:#]?\s*\w{4,}`,
		String.raw`\b(visa|mastercard|amex|discover|debit|credit)\b`,
		String.raw`\bcard\s*(#|no\b|number|ending)`,
		String.raw`\b(cash\s*tend\w*|change\s*due|tender|cashier|loyalty)\b`,
		String.raw`\bmember\s*(#|no\b|id\b|number)`
	].join('|'),
	'i'
);

const cents = (dollars: number | null) =>
	dollars === null || !Number.isFinite(dollars) ? null : Math.round(dollars * 100);

function validDate(value: string | null, today = new Date()) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const date = new Date(`${value}T12:00:00Z`);
	if (Number.isNaN(date.getTime())) return null;
	const latest = new Date(today.getTime() + 2 * 86_400_000);
	return date.getUTCFullYear() >= 2015 && date <= latest ? value : null;
}

export function checkReading(reading: Reading, today = new Date()): Checked {
	if (reading.kind === 'not_a_receipt') return { ok: false, reason: 'not_a_receipt' };
	if (reading.handwritten) return { ok: false, reason: 'handwritten' };

	const lines: CheckedLine[] = [];
	for (const line of reading.lines.slice(0, MAX_LINES)) {
		const raw = line.raw.trim().slice(0, 120);
		const total = cents(line.total);
		if (!raw || total === null || PAYMENT.test(raw)) continue;
		if (Math.abs(total) > 100_000) continue;
		if (!line.discount && total < 0) continue;

		const unit = line.unit && UNITS.has(line.unit.toLowerCase()) ? line.unit.toLowerCase() : 'ea';
		const quantity = line.quantity && line.quantity > 0 && line.quantity < 1000 ? line.quantity : 1;
		lines.push({
			raw,
			quantity,
			unit,
			unitPriceCents: cents(line.unit_price),
			totalCents: line.discount ? -Math.abs(total) : total,
			kind: line.discount ? 'discount' : 'item'
		});
	}
	if (!lines.some((l) => l.kind === 'item')) return { ok: false, reason: 'no_lines' };

	const subtotalCents = cents(reading.subtotal);
	const sum = lines.reduce((total, l) => total + l.totalCents, 0);
	const tolerance = Math.max(5, Math.round((subtotalCents ?? 0) * 0.01));

	return {
		ok: true,
		store: reading.store?.trim().slice(0, 120) || null,
		purchasedOn: validDate(reading.purchase_date, today),
		channel: reading.channel,
		lines,
		subtotalCents,
		taxCents: cents(reading.tax),
		totalCents: cents(reading.total),
		adds_up: subtotalCents !== null && Math.abs(sum - subtotalCents) <= tolerance
	};
}
