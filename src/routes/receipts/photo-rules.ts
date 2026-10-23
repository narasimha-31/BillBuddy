export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Pixel size from the JPEG's frame header, without decoding the image. Null if no frame header is found.
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
	let i = 2;
	while (i + 9 < bytes.length) {
		if (bytes[i] !== 0xff) return null;
		const marker = bytes[i + 1];
		const length = (bytes[i + 2] << 8) | bytes[i + 3];
		// SOF0 to SOF15, except DHT (C4), JPG (C8) and DAC (CC), carry the frame size
		if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
			return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
		}
		i += 2 + length;
	}
	return null;
}

// a readable receipt photo is never thumbnail-sized; anything huge was not made by our resize step
export function sizeProblem(bytes: Uint8Array): string | null {
	const size = jpegSize(bytes);
	if (!size) return 'unreadable photo';
	if (Math.min(size.width, size.height) < 200) return 'photo is too small to read';
	if (Math.max(size.width, size.height) > 4000) return 'photo is too large';
	return null;
}

// checks the bytes themselves, not the type the browser claims
export function photoProblem(bytes: Uint8Array, hash: string): string | null {
	if (bytes.length === 0) return 'empty file';
	if (bytes.length > MAX_PHOTO_BYTES) return 'photo is over 5 MB';
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return 'not a jpeg';
	if (!/^[0-9a-f]{64}$/.test(hash)) return 'bad fingerprint';
	return null;
}

export const MAX_PDF_PAGES = 3;

// a PDF is checked by its first bytes, not its name or the type the browser claims
export function pdfProblem(bytes: Uint8Array, pages?: number): string | null {
	if (bytes.length === 0) return 'empty file';
	if (bytes.length > MAX_PHOTO_BYTES) return 'This PDF is over 5 MB.';
	if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') return 'This file is not a PDF.';
	if (pages !== undefined && pages > MAX_PDF_PAGES) return `This PDF has ${pages} pages. Receipts of up to ${MAX_PDF_PAGES} pages can be added.`;
	return null;
}

// One scale for every page, so pages stacked top to bottom stay within the reader's longest side,
// and never past 3x (about 216 dpi), where text is already sharp and the file only grows.
export function stackScale(pages: { width: number; height: number }[], longest = 4000) {
	const width = Math.max(...pages.map((p) => p.width));
	const height = pages.reduce((sum, p) => sum + p.height, 0);
	return Math.min(3, longest / Math.max(width, height));
}

// Sharpness of a grey copy about 1000 px long: the 99th percentile of edge strength (a 4-neighbour
// Laplacian), counted in a histogram so it stays O(pixels). Clear receipt photos measured 115 to 236,
// slightly soft ones 72, and blurred or far-off ones, which the reader then failed on, 47 and below.
export const SHARP_ENOUGH = 60;

export function sharpness(grey: ArrayLike<number>, width: number, height: number): number {
	const counts = new Uint32Array(1021);
	let total = 0;
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const i = y * width + x;
			counts[Math.abs(grey[i - width] + grey[i + width] + grey[i - 1] + grey[i + 1] - 4 * grey[i])]++;
			total++;
		}
	}
	let seen = 0;
	for (let edge = 0; edge < counts.length; edge++) {
		seen += counts[edge];
		if (seen > total * 0.99) return edge;
	}
	return 0;
}
