import { describe, expect, it } from 'vitest';
import { changeLine, toneOf } from './price-change';

describe('changeLine', () => {
	it('tells a move at the same store', () => {
		expect(changeLine({ now_cents: 221, before_cents: 173, store: 'WALMART', before_store: 'WALMART' })).toEqual({ tone: 'up', text: 'Up 48¢ at Walmart' });
		expect(changeLine({ now_cents: 150, before_cents: 300, store: 'H-E-B', before_store: 'H-E-B' })).toEqual({ tone: 'down', text: 'Down $1.50 at H-E-B' });
	});

	it('names the cheaper store when the two purchases were at different stores', () => {
		expect(changeLine({ now_cents: 221, before_cents: 173, store: 'WALMART', before_store: 'H-E-B' }, '/lb')).toEqual({ tone: 'down', text: 'Cheaper at H-E-B · $1.73/lb' });
		expect(changeLine({ now_cents: 51, before_cents: 65, store: 'KROGER', before_store: 'H-E-B' })).toEqual({ tone: 'down', text: 'Cheaper at Kroger · $0.51' });
	});
});

describe('toneOf', () => {
	const h = (cents: number) => ({ on: '2026-10-01', store: 'X', cents, receipt: 'r', item: 'i' });
	it('marks the lowest green and the highest red, and nothing when all match', () => {
		const history = [h(200), h(150), h(250)];
		expect([200, 150, 250].map((c) => toneOf(history, c))).toEqual([null, 'down', 'up']);
		expect(toneOf([h(100), h(100)], 100)).toBeNull();
	});
});
