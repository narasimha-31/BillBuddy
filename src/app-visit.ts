import type { SubmitFunction } from '@sveltejs/kit';
import { clearToasts } from './toasts.svelte';

// SvelteKit numbers history entries one apart within a page load; a fresh load starts at Date.now()
const indexHere = (): number | undefined => history.state?.['sveltekit:history'];
const START = 'app-start';
const SIGNIN = 'signin-length';
const BEHIND = 'signin-behind';
const RESTORED = 'app-restored';
const REWOUND = 'app-rewound';

// set as Google opens, so the first app page can tell how many of Google's pages came in between
export function markSigninStart() {
	sessionStorage.setItem(SIGNIN, String(history.length));
}

export function markAppStart() {
	const here = indexHere();
	if (here === undefined) return;
	const start = Number(sessionStorage.getItem(START));
	if (here !== start && !stepsSinceStart(here, start, history.length)) {
		sessionStorage.setItem(START, String(here));
		sessionStorage.setItem(BEHIND, String(pagesBehind(Number(sessionStorage.getItem(SIGNIN)), history.length)));
		sessionStorage.removeItem(SIGNIN);
	}
}

// Google's pages plus this one, when sign-in went through Google in this tab; a window of its own
// leaves this tab's history as it was, so nothing lies behind
export function pagesBehind(before: number, now: number) {
	const behind = before ? now - before : 0;
	return behind > 0 && behind < 10 ? behind : 0;
}

// a gap longer than the history itself spans a full page load, so it is no step count
export function stepsSinceStart(here: number | undefined, start: number, entries: number) {
	return here && start && here > start && here - start < entries ? here - start : 0;
}

// The visit's pages become forward steps and its first page turns into the landing, so back
// from there leaves Billie instead of walking through pages that only bounce to sign-in.
function rewindToLanding() {
	const steps = stepsSinceStart(indexHere(), Number(sessionStorage.getItem(START)), history.length);
	const behind = Number(sessionStorage.getItem(BEHIND)) || 0;
	sessionStorage.removeItem(START);
	sessionStorage.removeItem(BEHIND);
	sessionStorage.setItem(REWOUND, '1');
	// back past Google's pages too, to the landing the shopper signed in from
	if (behind && steps + behind < history.length) return history.go(-(steps + behind));
	if (!steps) return location.replace('/');
	addEventListener(
		'popstate',
		(event) => {
			event.stopImmediatePropagation();
			location.replace('/');
		},
		{ capture: true, once: true }
	);
	history.go(-steps);
}

// An app page brought back from the browser's page cache asks the server again; if that turns it
// into the landing, the landing knows it stands in for an old app page.
export function reloadRestored() {
	sessionStorage.setItem(RESTORED, '1');
	location.reload();
}

export function clearRestored() {
	sessionStorage.removeItem(RESTORED);
}

// Back after signing out can reach app pages from earlier visits in this tab, which the browser
// won't let a site remove. Each one only bounces to the landing, so the landing keeps going the way
// the shopper was going instead of stopping there.
export function skipStaleAppPage() {
	const arrival = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
	const restored = sessionStorage.getItem(RESTORED) === '1';
	// sign-out's own trip back ends here on purpose
	const rewound = sessionStorage.getItem(REWOUND) === '1';
	sessionStorage.removeItem(RESTORED);
	sessionStorage.removeItem(REWOUND);
	if (rewound || !arrival?.redirectCount || (arrival.type !== 'back_forward' && !restored)) return;
	history.go(wentForward() ? 1 : -1);
}

// the Navigation API tells the direction where it exists; elsewhere back is by far the usual one
function wentForward() {
	const activation = (window as { navigation?: { activation?: { from?: { index: number } | null; entry?: { index: number } } } }).navigation?.activation;
	return !!activation?.from && !!activation.entry && activation.entry.index > activation.from.index;
}

export const leaveApp: SubmitFunction = () => {
	clearToasts();
	return async ({ result, update }) => (result.type === 'redirect' ? rewindToLanding() : update());
};
