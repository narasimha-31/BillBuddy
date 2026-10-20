export type Toast = {
	id: number;
	// one event, e.g. "read:<receipt id>"; the same event is never queued twice
	key: string;
	text: string;
	kind: 'done' | 'error';
	action?: { label: string; href?: string; run?: () => void };
};

export const MAX_TOASTS = 3;

// the one on screen stays; past the cap the oldest waiting one makes room
export function enqueue(list: Toast[], next: Toast, max = MAX_TOASTS): Toast[] {
	if (list.some((t) => t.key === next.key)) return list;
	const out = [...list, next];
	while (out.length > max) out.splice(1, 1);
	return out;
}

// errors stay until closed; a toast with a button gets time to reach it
export const lifetime = (t: Toast) => (t.kind === 'error' ? null : t.action ? 6000 : 3000);
