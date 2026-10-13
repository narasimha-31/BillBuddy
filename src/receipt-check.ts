// What the vision model returns. Nothing in it is trusted until checkReading() has run.
export type Reading = {
	kind: 'store_receipt' | 'online_order' | 'not_a_receipt';
	handwritten: boolean;
	store: string | null;
	purchase_date: string | null;
	channel: 'in_store' | 'delivery' | 'pickup' | 'unknown';
	lines: { raw: string; quantity: number | null; unit: string | null; unit_price: number | null; unit_price_for: number | null; total: number | null; discount: boolean }[];
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
	// true when the amount was not printed and we worked it out from quantity x unit price
	computed: boolean;
	// the printed amount disagrees with quantity x unit price
	issue: 'line_math' | null;
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
			lines_match_subtotal: boolean;
			totals_match: boolean | null;
			needs_review: boolean;
	  };

const UNITS = new Set(['ea', 'lb', 'oz', 'kg', 'g', 'gal', 'l', 'ct']);
const MAX_LINES = 80;

// 12 to 19 digits in a row is a barcode or a card number. Neither is kept, but the item it is
// printed on is: Parivar prints "FS LAXMI TOOR DAL PLAIN 2 LB-723246183084".
const LONG_NUMBER = /[\s#:-]*\b\d{12,19}\b/g;

// payment and identity details we never keep, even if the model transcribed them
// narrow on purpose: "BIRTHDAY CARD" and "MEMBER'S MARK EGGS" are groceries, not payment data
const PAYMENT = new RegExp(
	[
		String.raw`(\*{2,}|x{4,})\s*\d{2,4}`,
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

// The receipt-level math, shared by processing and the review screen so they can never disagree.
// Many receipts print no subtotal (Fiesta prints only TAX and BALANCE), so the items are then
// checked against the total minus tax, worked out here rather than by the model.
export function reconcile(lineTotals: number[], subtotalCents: number | null, taxCents: number | null, totalCents: number | null) {
	const sum = lineTotals.reduce((total, cents) => total + cents, 0);
	const expected = subtotalCents ?? (totalCents === null ? null : totalCents - (taxCents ?? 0));
	const tolerance = Math.max(5, Math.round((expected ?? 0) * 0.01));
	return {
		sum,
		expected,
		lines_match_subtotal: expected !== null && Math.abs(sum - expected) <= tolerance,
		totals_match: subtotalCents === null || totalCents === null ? null : Math.abs(subtotalCents + (taxCents ?? 0) - totalCents) <= 2
	};
}

type ReadLine = Reading['lines'][number];
const detail = (l: ReadLine) => ({ quantity: l.quantity, unit: l.unit, unit_price: l.unit_price, unit_price_for: l.unit_price_for });
const noDetail = { quantity: null, unit: null, unit_price: null, unit_price_for: null };

// quantity x unit price in cents, or null when the line has no such detail
function rateCents(l: Pick<ReadLine, 'quantity' | 'unit_price' | 'unit_price_for'>) {
	const price = cents(l.unit_price);
	if (!l.quantity || l.quantity <= 0 || price === null) return null;
	const per = l.unit_price_for && l.unit_price_for > 1 && l.unit_price_for <= 100 ? l.unit_price_for : 1;
	return Math.round((l.quantity * price) / per);
}

// Some stores print "1.17 lb @ 1.47 /lb" above its item (Fiesta), others below it (Walmart),
// and the model can attach such lines to the wrong neighbour, sometimes only a few of them.
// Each run of neighbouring details that don't match their own amounts is moved one line down,
// or one line up, when that makes every one of them match and the line it moves onto had no
// detail of its own. Pure cent arithmetic; the model is never asked to do it.
export function realignDetails(lines: ReadLine[]): ReadLine[] {
	const fits = (i: number, target: number) => {
		const rate = rateCents(lines[i]);
		const total = lines[target] && !lines[target].discount ? cents(lines[target].total) : null;
		return rate !== null && total !== null && Math.abs(rate - total) <= 2;
	};
	const misfit = (i: number) => rateCents(lines[i]) !== null && !fits(i, i);
	const result = [...lines];

	for (let start = 0; start < lines.length; start++) {
		if (!misfit(start)) continue;
		let end = start;
		while (end + 1 < lines.length && misfit(end + 1)) end++;
		const run = Array.from({ length: end - start + 1 }, (_, k) => start + k);

		for (const shift of [1, -1]) {
			const receiver = shift === 1 ? end + 1 : start - 1;
			if (!lines[receiver] || rateCents(lines[receiver]) !== null) continue;
			if (!run.every((i) => fits(i, i + shift))) continue;
			for (const i of run) result[i] = { ...result[i], ...noDetail };
			for (const i of run) result[i + shift] = { ...result[i + shift], ...detail(lines[i]) };
			break;
		}
		start = end;
	}
	return result;
}

function wholeCount(totalCents: number, priceCents: number) {
	const count = Math.round(totalCents / priceCents);
	return count >= 1 && count < 100 && Math.abs(count * priceCents - totalCents) <= 1 ? count : null;
}

export function checkReading(reading: Reading, today = new Date()): Checked {
	if (reading.kind === 'not_a_receipt') return { ok: false, reason: 'not_a_receipt' };
	if (reading.handwritten) return { ok: false, reason: 'handwritten' };

	// All arithmetic happens here, in whole cents. The model only copies printed numbers.
	const lines: CheckedLine[] = [];
	for (const line of realignDetails(reading.lines.slice(0, MAX_LINES))) {
		// one printed line stays one line: a hidden newline could pose as extra numbered lines downstream
		const raw = line.raw.replace(/[\u0000-\u001f\u007f\s]+/g, ' ').replace(LONG_NUMBER, '').trim().slice(0, 120);
		if (!/[a-z]{2}/i.test(raw) || PAYMENT.test(raw)) continue;

		const unit = line.unit && UNITS.has(line.unit.toLowerCase()) ? line.unit.toLowerCase() : 'ea';
		const printedQuantity = line.quantity && line.quantity > 0 && line.quantity < 1000 ? line.quantity : null;
		// a multi-buy price like "8 @ 4/0.99" is 0.99 for every 4, not 0.99 each
		const per = line.unit_price_for && line.unit_price_for > 1 && line.unit_price_for <= 100 ? line.unit_price_for : 1;
		const priceCents = cents(line.unit_price);
		const unitPriceCents = priceCents === null ? null : Math.round(priceCents / per);
		const fromRate = printedQuantity !== null && priceCents !== null ? Math.round((printedQuantity * priceCents) / per) : null;

		const printed = cents(line.total);
		const amount = printed ?? fromRate;
		if (amount === null || Math.abs(amount) > 100_000) continue;
		if (!line.discount && amount < 0) continue;

		// a misread count ("8" for "2"): the amount and the price each are printed, so the count follows
		const mismatch = printed !== null && fromRate !== null && Math.abs(fromRate - printed) > 2;
		const counted = mismatch && unit === 'ea' && per === 1 && priceCents ? wholeCount(printed, priceCents) : null;

		lines.push({
			raw,
			quantity: counted ?? printedQuantity ?? 1,
			unit,
			unitPriceCents,
			totalCents: line.discount ? -Math.abs(amount) : amount,
			kind: line.discount ? 'discount' : 'item',
			computed: printed === null,
			issue: mismatch && counted === null ? 'line_math' : null
		});
	}
	if (!lines.some((l) => l.kind === 'item')) return { ok: false, reason: 'no_lines' };

	const subtotalCents = cents(reading.subtotal);
	const taxCents = cents(reading.tax);
	const totalCents = cents(reading.total);
	const { lines_match_subtotal, totals_match } = reconcile(
		lines.map((l) => l.totalCents),
		subtotalCents,
		taxCents,
		totalCents
	);

	return {
		ok: true,
		store: reading.store?.trim().slice(0, 120) || null,
		purchasedOn: validDate(reading.purchase_date, today),
		channel: reading.channel,
		lines,
		subtotalCents,
		taxCents,
		totalCents,
		lines_match_subtotal,
		totals_match,
		needs_review: !lines_match_subtotal || totals_match === false || lines.some((l) => l.issue !== null)
	};
}
