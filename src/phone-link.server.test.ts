import { describe, expect, it } from 'vitest';
import { hashOf, newSecret, wellFormed } from './phone-link.server';

describe('phone link secrets', () => {
	it('are 22 URL-safe characters (128 bits) and never repeat', () => {
		const many = Array.from({ length: 500 }, newSecret);
		for (const secret of many) expect(wellFormed(secret)).toBe(true);
		expect(new Set(many).size).toBe(500);
	});

	it('refuse anything that is not exactly that shape', () => {
		for (const bad of ['', 'short', 'a'.repeat(23), 'a'.repeat(21) + '/', 'a'.repeat(21) + '.', "' or 1=1 --aaaaaaaaaa", null, undefined, 42, ['a'.repeat(22)]]) {
			expect(wellFormed(bad), String(bad)).toBe(false);
		}
	});

	it('are stored as SHA-256 hex', async () => {
		expect(await hashOf('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});
});
