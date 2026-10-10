import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, photoProblem } from './photo-rules';

const jpeg = (size = 10) => {
	const bytes = new Uint8Array(size);
	bytes.set([0xff, 0xd8, 0xff]);
	return bytes;
};
const hash = 'a'.repeat(64);

describe('photoProblem', () => {
	it('accepts a jpeg with a valid fingerprint', () => {
		expect(photoProblem(jpeg(), hash)).toBeNull();
	});

	it('rejects a file that only claims to be a jpeg', () => {
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]);
		expect(photoProblem(png, hash)).toBe('not a jpeg');
	});

	it('rejects empty and oversized files', () => {
		expect(photoProblem(new Uint8Array(), hash)).toBe('empty file');
		expect(photoProblem(jpeg(MAX_PHOTO_BYTES + 1), hash)).toBe('photo is over 5 MB');
	});

	it('rejects a fingerprint that is not a sha-256 hex digest', () => {
		expect(photoProblem(jpeg(), 'abc')).toBe('bad fingerprint');
		expect(photoProblem(jpeg(), 'A'.repeat(64))).toBe('bad fingerprint');
		expect(photoProblem(jpeg(), `${'a'.repeat(63)}/`)).toBe('bad fingerprint');
	});
});
