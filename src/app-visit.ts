import type { SubmitFunction } from '@sveltejs/kit';
import { clearToasts } from './toasts.svelte';

// SvelteKit numbers history entries one apart within a page load; a fresh load starts at Date.now()
const indexHere = (): number | undefined => history.state?.['sveltekit:history'];
const START = 'app-start';

export function markAppStart() {
	const here = indexHere();
	if (here === undefined) return;
	const start = Number(sessionStorage.getItem(START));
	if (here !== start && !stepsSinceStart(here, start, history.length)) sessionStorage.setItem(START, String(here));
}

// a gap longer than the history itself spans a full page load, so it is no step count
export function stepsSinceStart(here: number | undefined, start: number, entries: number) {
	return here && start && here > start && here - start < entries ? here - start : 0;
}

// The visit's pages become forward steps and its first page turns into the landing, so back
// from there leaves Billie instead of walking through pages that only bounce to sign-in.
function rewindToLanding() {
	const steps = stepsSinceStart(indexHere(), Number(sessionStorage.getItem(START)), history.length);
	sessionStorage.removeItem(START);
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

export const leaveApp: SubmitFunction = () => {
	clearToasts();
	return async ({ result, update }) => (result.type === 'redirect' ? rewindToLanding() : update());
};
