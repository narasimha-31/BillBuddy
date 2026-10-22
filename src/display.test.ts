import { describe, expect, it } from 'vitest';
import { STANDARD, displayCookie, displayFromForm, fromRow, htmlAttributes, readDisplay } from './display';

describe('display choices', () => {
	it('survive the trip through the cookie', () => {
		const chosen = { text: 'larger', contrast: true, mode: 'dark', theme: 'ocean' } as const;
		expect(readDisplay(displayCookie(chosen))).toEqual(chosen);
		expect(readDisplay(displayCookie(STANDARD))).toEqual(STANDARD);
	});

	it('read older cookies: three parts, and five with the old colour palette', () => {
		expect(readDisplay('large.more.standard')).toEqual({ ...STANDARD, text: 'large', contrast: true });
		expect(readDisplay('large.normal.colorblind.dark.grape')).toEqual({ ...STANDARD, text: 'large', mode: 'dark', theme: 'grape' });
	});

	it('fall back to the standard look for a missing or tampered cookie', () => {
		expect(readDisplay(undefined)).toEqual(STANDARD);
		expect(readDisplay('huge."><script>.pink')).toEqual(STANDARD);
		expect(readDisplay('standard.normal.night".x')).toEqual(STANDARD);
	});

	it('only ever write known values into the page', () => {
		expect(htmlAttributes(STANDARD)).toBe('');
		expect(htmlAttributes({ text: 'large', contrast: true, mode: 'auto', theme: 'grape' })).toBe('data-text="large" data-contrast="more" data-mode="auto" data-theme="grape"');
		expect(htmlAttributes(readDisplay('huge"onload=x.more.light'))).toBe('data-contrast="more"');
	});

	it('read a settings row, with defaults for a missing one', () => {
		expect(fromRow(null)).toEqual(STANDARD);
		expect(fromRow({ text_size: 'large', more_contrast: true, color_mode: 'dark', theme: 'teal' })).toEqual({ ...STANDARD, text: 'large', contrast: true, mode: 'dark' });
	});

	it('keep what a form did not send', () => {
		const current = { text: 'large', contrast: true, mode: 'dark', theme: 'sunset' } as const;
		const look = new FormData();
		look.set('mode', 'auto');
		look.set('theme', 'ocean');
		expect(displayFromForm(look, current)).toEqual({ ...current, mode: 'auto', theme: 'ocean' });
		const choices = new FormData();
		choices.set('text_size', 'standard');
		expect(displayFromForm(choices, current)).toEqual({ ...current, text: 'standard', contrast: false });
	});
});
