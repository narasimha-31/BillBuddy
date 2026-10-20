import { describe, expect, it } from 'vitest';
import { enqueue, lifetime, type Toast } from './toast-queue';

const make = (id: number, key = `k${id}`, kind: Toast['kind'] = 'done'): Toast => ({ id, key, text: `t${id}`, kind });

describe('enqueue', () => {
	it('never queues the same event twice', () => {
		const list = enqueue([make(1, 'read:a')], make(2, 'read:a'));
		expect(list.map((t) => t.id)).toEqual([1]);
	});

	it('keeps the one on screen and drops the oldest waiting past three', () => {
		let list: Toast[] = [];
		for (const id of [1, 2, 3, 4, 5]) list = enqueue(list, make(id));
		expect(list.map((t) => t.id)).toEqual([1, 4, 5]);
	});
});

describe('lifetime', () => {
	it('gives errors no timer and buttons longer', () => {
		expect(lifetime(make(1, 'a', 'error'))).toBeNull();
		expect(lifetime({ ...make(2), action: { label: 'Open', href: '/' } })).toBe(6000);
		expect(lifetime(make(3))).toBe(3000);
	});
});
