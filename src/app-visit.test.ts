import { describe, expect, it } from 'vitest';
import { pagesBehind, stepsSinceStart } from './app-visit';

describe('stepsSinceStart', () => {
	const start = 1_761_200_000_000;

	it('counts the pages since the first one of the visit', () => {
		expect(stepsSinceStart(start + 6, start, 9)).toBe(6);
	});

	it('is zero on the first page, with no start, or with no index', () => {
		expect(stepsSinceStart(start, start, 9)).toBe(0);
		expect(stepsSinceStart(start + 3, 0, 9)).toBe(0);
		expect(stepsSinceStart(undefined, start, 9)).toBe(0);
	});

	// a full page load numbers from the clock, so even a load seconds later jumps past the history
	it('is zero across a full page load', () => {
		expect(stepsSinceStart(start + 4_000, start, 9)).toBe(0);
		expect(stepsSinceStart(start - 2, start, 9)).toBe(0);
	});
});

describe('pagesBehind', () => {
	it('counts the pages a same-tab Google sign-in added', () => {
		expect(pagesBehind(4, 6)).toBe(2);
	});

	// a sign-in window replaces the landing with Home, so the count doesn't grow
	it('is zero for a sign-in window, with no mark, or a stale one', () => {
		expect(pagesBehind(4, 4)).toBe(0);
		expect(pagesBehind(0, 6)).toBe(0);
		expect(pagesBehind(3, 40)).toBe(0);
	});
});
