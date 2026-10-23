import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, SHARP_ENOUGH, jpegSize, pdfProblem, photoProblem, sharpness, sizeProblem, stackScale } from './photo-rules';

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

describe('pdf rules', () => {
	const pdf = new TextEncoder().encode('%PDF-1.7 rest of file');

	it('takes a real PDF of up to 3 pages', () => {
		expect(pdfProblem(pdf)).toBeNull();
		expect(pdfProblem(pdf, 3)).toBeNull();
	});

	it('refuses a renamed file, an empty one, a huge one and a long one', () => {
		expect(pdfProblem(new TextEncoder().encode('<html>'))).toBe('This file is not a PDF.');
		expect(pdfProblem(new Uint8Array())).toBe('empty file');
		expect(pdfProblem(new Uint8Array(MAX_PHOTO_BYTES + 1))).toBe('This PDF is over 5 MB.');
		expect(pdfProblem(pdf, 4)).toMatch(/4 pages/);
	});

	it('scales stacked pages to fit the longest side, but never past 3x', () => {
		const letter = { width: 612, height: 792 };
		expect(stackScale([letter, letter, letter]) * 792 * 3).toBeCloseTo(4000);
		expect(stackScale([{ width: 200, height: 300 }])).toBe(3);
	});
});

describe('sharpness', () => {
	// black strokes on white, then the same smeared sideways over a few pixels
	const size = 100;
	const crisp = Array.from({ length: size * size }, (_, i) => ((i % size) % 6 < 2 ? 20 : 235));
	const smeared = crisp.map((_, i) => {
		const x = i % size;
		let sum = 0;
		for (let d = -4; d <= 4; d++) sum += crisp[i - x + Math.min(size - 1, Math.max(0, x + d))];
		return Math.round(sum / 9);
	});

	it('scores crisp text well above the line and a smear below it', () => {
		expect(sharpness(crisp, size, size)).toBeGreaterThan(SHARP_ENOUGH);
		expect(sharpness(smeared, size, size)).toBeLessThan(SHARP_ENOUGH);
	});

	it('scores a blank page zero', () => {
		expect(sharpness(new Array(size * size).fill(200), size, size)).toBe(0);
	});
});
