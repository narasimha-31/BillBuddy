// How the shopper wants the app drawn. Kept on their account, and mirrored in a cookie so the
// server can draw the first frame right without asking the database on every page.
export const TEXT_SIZES = ['standard', 'large', 'larger'] as const;
export const PALETTES = ['standard', 'colorblind'] as const;

export type Display = { text: (typeof TEXT_SIZES)[number]; contrast: boolean; palette: (typeof PALETTES)[number] };

export const DISPLAY_COOKIE = 'display';
export const STANDARD: Display = { text: 'standard', contrast: false, palette: 'standard' };

const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

// "large.more.colorblind": short, and anything unexpected falls back to the standard look
export const displayCookie = (d: Display) => `${d.text}.${d.contrast ? 'more' : 'normal'}.${d.palette}`;

export function readDisplay(cookie: string | undefined): Display {
	const [text, contrast, palette] = (cookie ?? '').split('.');
	return { text: pick(TEXT_SIZES, text, 'standard'), contrast: contrast === 'more', palette: pick(PALETTES, palette, 'standard') };
}

export function fromRow(row: { text_size?: unknown; more_contrast?: unknown; palette?: unknown } | null): Display {
	return { text: pick(TEXT_SIZES, row?.text_size, 'standard'), contrast: row?.more_contrast === true, palette: pick(PALETTES, row?.palette, 'standard') };
}

// attributes for <html>; the standard look adds none
export function htmlAttributes(d: Display) {
	return [d.text !== 'standard' && `data-text="${d.text}"`, d.contrast && 'data-contrast="more"', d.palette !== 'standard' && `data-palette="${d.palette}"`]
		.filter(Boolean)
		.join(' ');
}

// a year; it only ever says how to draw the page.
// SvelteKit marks it secure on its own everywhere but plain-http localhost.
export const DISPLAY_COOKIE_OPTIONS = { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 } as const;

// on the device, right after a choice is saved, so the page changes without a reload
export function applyDisplay(d: Display, root: HTMLElement) {
	const set = (name: string, value: string | null) => (value ? root.setAttribute(name, value) : root.removeAttribute(name));
	set('data-text', d.text === 'standard' ? null : d.text);
	set('data-contrast', d.contrast ? 'more' : null);
	set('data-palette', d.palette === 'standard' ? null : d.palette);
}

export function displayFromForm(form: FormData): Display {
	return { text: pick(TEXT_SIZES, form.get('text_size'), 'standard'), contrast: form.get('more_contrast') === 'on', palette: form.get('colorblind') === 'on' ? 'colorblind' : 'standard' };
}

export function displayOf(root: HTMLElement): Display {
	return { text: pick(TEXT_SIZES, root.dataset.text, 'standard'), contrast: root.dataset.contrast === 'more', palette: pick(PALETTES, root.dataset.palette, 'standard') };
}
