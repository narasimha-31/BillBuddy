import { browser } from '$app/environment';
import { enqueue, type Toast } from './toast-queue';

// Module state is shared by every request on the server, so toasts only ever exist inside one browser tab:
// whoever caused one is the only one who sees it.
let list = $state<Toast[]>([]);
let next = 0;

export const toasts = {
	get current() {
		return list[0];
	}
};

export function toast(t: Omit<Toast, 'id'>) {
	if (!browser) return;
	list = enqueue(list, { ...t, id: next++ });
}

export function dismiss(id: number) {
	list = list.filter((t) => t.id !== id);
}

export function clearToasts() {
	list = [];
}
