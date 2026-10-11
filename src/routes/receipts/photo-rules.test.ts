import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, jpegSize, photoProblem, sizeProblem } from './photo-rules';

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

// a minimal jpeg header: SOI, an APP0 segment, then a SOF0 frame header with the given size
function header(width: number, height: number) {
	return new Uint8Array([
		0xff, 0xd8,
		0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
		0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03, 0, 0, 0, 0, 0, 0
	]);
}

describe('jpegSize and sizeProblem', () => {
	it('reads the pixel size from the frame header, past other segments', () => {
		expect(jpegSize(header(1200, 1600))).toEqual({ width: 1200, height: 1600 });
	});

	it('accepts a normal receipt photo', () => {
		expect(sizeProblem(header(1200, 1600))).toBeNull();
	});

	it('refuses thumbnails and oversized images before any model call', () => {
		expect(sizeProblem(header(150, 900))).toBe('photo is too small to read');
		expect(sizeProblem(header(6000, 3000))).toBe('photo is too large');
	});

	it('refuses a file with no frame header', () => {
		expect(sizeProblem(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe('unreadable photo');
	});
});
