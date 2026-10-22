// How the shopper wants the app drawn. Kept on their account, and mirrored in a cookie so the
// server can draw the first frame right without asking the database on every page.
export const TEXT_SIZES = ['standard', 'large', 'larger'] as const;
export const MODES = ['light', 'dark', 'auto'] as const;
export const THEMES = ['green', 'ocean', 'sunset', 'grape'] as const;

export type Display = {
	text: (typeof TEXT_SIZES)[number];
	contrast: boolean;
	mode: (typeof MODES)[number];
	theme: (typeof THEMES)[number];
};

export const DISPLAY_COOKIE = 'display';
export const STANDARD: Display = { text: 'standard', contrast: false, mode: 'light', theme: 'green' };

const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

// "large.more.dark.ocean": short, and anything unexpected falls back to the standard look
export const displayCookie = (d: Display) => `${d.text}.${d.contrast ? 'more' : 'normal'}.${d.mode}.${d.theme}`;

export function readDisplay(cookie: string | undefined): Display {
	const parts = (cookie ?? '').split('.');
	// cookies from before Oct 22 carried a colour palette third; it is gone, so that part is skipped
	if (parts.length === 5) parts.splice(2, 1);
	const [text, contrast, mode, theme] = parts;
	return { text: pick(TEXT_SIZES, text, 'standard'), contrast: contrast === 'more', mode: pick(MODES, mode, 'light'), theme: pick(THEMES, theme, 'green') };
}

type Row = { text_size?: unknown; more_contrast?: unknown; color_mode?: unknown; theme?: unknown };

export function fromRow(row: Row | null): Display {
	return {
		text: pick(TEXT_SIZES, row?.text_size, 'standard'),
		contrast: row?.more_contrast === true,
		mode: pick(MODES, row?.color_mode, 'light'),
		theme: pick(THEMES, row?.theme, 'green')
	};
}

export const DISPLAY_COLUMNS = 'text_size, more_contrast, color_mode, theme';
export const toRow = (d: Display) => ({ text_size: d.text, more_contrast: d.contrast, color_mode: d.mode, theme: d.theme });

// attributes for <html>; the standard look adds none
export function htmlAttributes(d: Display) {
	return [
		d.text !== 'standard' && `data-text="${d.text}"`,
		d.contrast && 'data-contrast="more"',
		d.mode !== 'light' && `data-mode="${d.mode}"`,
		d.theme !== 'green' && `data-theme="${d.theme}"`
	]
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
	set('data-mode', d.mode === 'light' ? null : d.mode);
	set('data-theme', d.theme === 'green' ? null : d.theme);
}

// Two forms post here: the text and colour choices, and the look picker. Each sends only its own
// fields, so whatever a form leaves out keeps its current value.
export function displayFromForm(form: FormData, current: Display): Display {
	const choices = form.has('text_size');
	return {
		text: choices ? pick(TEXT_SIZES, form.get('text_size'), 'standard') : current.text,
		contrast: choices ? form.get('more_contrast') === 'on' : current.contrast,
		mode: form.has('mode') ? pick(MODES, form.get('mode'), 'light') : current.mode,
		theme: form.has('theme') ? pick(THEMES, form.get('theme'), 'green') : current.theme
	};
}

export function displayOf(root: HTMLElement): Display {
	return {
		text: pick(TEXT_SIZES, root.dataset.text, 'standard'),
		contrast: root.dataset.contrast === 'more',
		mode: pick(MODES, root.dataset.mode, 'light'),
		theme: pick(THEMES, root.dataset.theme, 'green')
	};
}
