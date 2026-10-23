import { beforeNavigate, goto, pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';

// a step being taken back, so one opened meanwhile (tapping the picker shuts the menu) waits for it
let settling: Promise<void> | null = null;
function stepBack() {
	settling = new Promise<void>((done) => addEventListener('popstate', () => setTimeout(done), { once: true })).finally(() => (settling = null));
	history.back();
}

// An open sheet, map or menu is one step of history, so the back button or swipe closes it before it
// leaves the page. Call in a component's script: opened() when it opens, closed() whenever it closes
// (by a tap, Escape or back); onBack shuts it when back is what took the step away.
export function backStep(name: string, onBack: () => void) {
	const mine = () => page.state.overlay === name;
	let open = false;

	$effect(() => {
		// read first, so the effect always follows the history step
		const here = mine();
		if (open && !here) {
			open = false;
			onBack();
		}
	});

	// a link followed from inside replaces the step, so back from the new page skips the closed menu
	beforeNavigate((nav) => {
		if (!mine() || nav.type !== 'link' || !nav.to) return;
		nav.cancel();
		goto(nav.to.url, { replaceState: true });
	});

	// wanted: opened but still waiting for a step being taken back; open: its own step is in history
	let wanted = false;
	return {
		async opened() {
			if (open || wanted) return;
			wanted = true;
			if (settling) await settling;
			if (!wanted) return;
			wanted = false;
			open = true;
			// one opened from another (the store from the full map) takes over its step
			if (page.state.overlay) replaceState('', { ...page.state, overlay: name });
			else pushState('', { ...page.state, overlay: name });
		},
		closed() {
			wanted = false;
			if (!open) return;
			open = false;
			if (mine()) stepBack();
		},
		// closing to open another in its place: the step is left for the next one
		handedOff() {
			wanted = false;
			open = false;
		}
	};
}
