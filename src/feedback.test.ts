import { describe, expect, it } from 'vitest';
import { feedbackFromForm } from './feedback';

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
};

describe('feedbackFromForm', () => {
	it('keeps a bug with the page it came from', () => {
		expect(feedbackFromForm(form({ kind: 'bug', message: '  Map is blank  ', page: '/prices' }))).toEqual({ kind: 'bug', message: 'Map is blank', page: '/prices' });
	});

	it('needs a kind and a message', () => {
		expect(feedbackFromForm(form({ kind: 'rant', message: 'x' }))).toEqual({ problem: 'Pick bug or idea.' });
		expect(feedbackFromForm(form({ kind: 'idea', message: '   ' }))).toEqual({ problem: 'Write a few words first.' });
		expect(feedbackFromForm(form({ kind: 'idea', message: 'x'.repeat(2001) }))).toEqual({ problem: 'Keep it under 2,000 characters.' });
	});

	it('drops a page that is not one of ours', () => {
		for (const page of ['https://evil.example', '//evil.example', '/a?b=1', 'home']) {
			expect(feedbackFromForm(form({ kind: 'idea', message: 'hi', page }))).toMatchObject({ page: null });
		}
	});
});
