export const FEEDBACK_PER_DAY = 10;

export type Feedback = { kind: 'bug' | 'idea'; message: string; page: string | null };

// the page is only ever one of ours, written as a path
export function feedbackFromForm(form: FormData): Feedback | { problem: string } {
	const kind = form.get('kind');
	if (kind !== 'bug' && kind !== 'idea') return { problem: 'Pick bug or idea.' };
	const message = String(form.get('message') ?? '').trim();
	if (!message) return { problem: 'Write a few words first.' };
	if (message.length > 2000) return { problem: 'Keep it under 2,000 characters.' };
	const page = String(form.get('page') ?? '');
	return { kind, message, page: /^\/[\w\-/]{0,199}$/.test(page) ? page : null };
}
