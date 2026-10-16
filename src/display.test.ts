import { describe, expect, it } from 'vitest';
import { STANDARD, displayCookie, fromRow, htmlAttributes, readDisplay } from './display';

describe('display choices', () => {
	it('survive the trip through the cookie', () => {
		const chosen = { text: 'larger', contrast: true, palette: 'colorblind' } as const;
		expect(readDisplay(displayCookie(chosen))).toEqual(chosen);
		expect(readDisplay(displayCookie(STANDARD))).toEqual(STANDARD);
	});

	it('fall back to the standard look for a missing or tampered cookie', () => {
		expect(readDisplay(undefined)).toEqual(STANDARD);
		expect(readDisplay('huge."><script>.pink')).toEqual(STANDARD);
	});

	it('only ever write known values into the page', () => {
		expect(htmlAttributes(STANDARD)).toBe('');
		expect(htmlAttributes({ text: 'large', contrast: true, palette: 'colorblind' })).toBe('data-text="large" data-contrast="more" data-palette="colorblind"');
		expect(htmlAttributes(readDisplay('huge"onload=x.more.standard'))).toBe('data-contrast="more"');
	});

	it('read a settings row, with defaults for a missing one', () => {
		expect(fromRow(null)).toEqual(STANDARD);
		expect(fromRow({ text_size: 'large', more_contrast: true, palette: 'nope' })).toEqual({ text: 'large', contrast: true, palette: 'standard' });
	});
});
