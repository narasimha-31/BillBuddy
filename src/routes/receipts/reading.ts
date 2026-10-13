import { deserialize } from '$app/forms';
import type { Printed } from '../../process-receipt.server';

export type { Printed };
export type Outcome = { state: 'saved' | 'review' | 'paused' | 'reading' | 'failed'; note?: string; printed?: Printed };

export const problems: Record<string, string> = {
	not_a_receipt: "That doesn't look like a receipt.",
	handwritten: "Handwritten bills can't be read.",
	no_lines: 'No items were found on it.',
	bad_photo: "The photo couldn't be opened."
};

// the actions live on the receipts page, so any page can upload and read through them
export async function post(action: string, body: FormData) {
	const response = await fetch(`/receipts?/${action}`, { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
	return deserialize(await response.text());
}

// reads a receipt that is already uploaded
export async function readReceipt(id: string): Promise<Outcome> {
	const body = new FormData();
	body.set('id', id);
	const result = await post('process', body);
	if (result.type !== 'success' || !result.data) return { state: 'failed', note: 'Try again in a moment.' };
	const outcome = result.data as { status: string; problem?: string; printed?: Printed };
	if (outcome.status === 'saved' || outcome.status === 'review') return { state: outcome.status, printed: outcome.printed };
	if (outcome.status === 'paused') return { state: 'paused' };
	if (outcome.status === 'busy') return { state: 'reading', note: 'It is already being read.' };
	return { state: 'failed', note: problems[outcome.problem ?? ''] ?? 'Try again.' };
}
