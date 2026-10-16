import { pdfProblem, stackScale } from './photo-rules';

// Full size: a long receipt shrunk to 1600px is about 600px wide, and the model misreads most
// lines. Vercel refuses request bodies over 4.5 MB, so quality steps down instead of resolution.
const LONGEST_SIDE = 4000;
const MOST_BYTES = 4 * 1024 * 1024;
const QUALITIES = [0.82, 0.7, 0.6];

const hex = (buffer: ArrayBuffer) =>
	[...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function encode(canvas: HTMLCanvasElement) {
	for (const quality of QUALITIES) {
		const jpeg = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', quality));
		if (!jpeg) throw new Error('could not encode the photo');
		if (jpeg.size <= MOST_BYTES || quality === QUALITIES.at(-1)) return jpeg;
	}
	throw new Error('could not encode the photo');
}

// The fingerprint is taken from the original file, so the same photo is caught twice.
// Re-drawing onto a canvas also drops every bit of metadata, including GPS location.
export async function preparePhoto(file: File): Promise<{ jpeg: Blob; hash: string }> {
	const hash = hex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));

	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return { jpeg: await encode(canvas), hash };
}

export class PdfRefused extends Error {}

// An emailed receipt PDF becomes one tall JPEG here on the device: its pages drawn top to bottom
// on white, so the server only ever sees a photo and every photo check still applies. PDF.js is
// loaded only once someone picks a PDF; it has no script engine, and forms are not run.
export async function preparePdf(file: File): Promise<{ jpeg: Blob; hash: string }> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	const early = pdfProblem(bytes);
	if (early) throw new PdfRefused(early);
	const hash = hex(await crypto.subtle.digest('SHA-256', bytes));

	// PDF.js takes over the buffer it is given, so it gets a copy and these bytes stay readable
	const pdfjs = await import('pdfjs-dist');
	pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
	const doc = await pdfjs.getDocument({ data: bytes.slice(), enableXfa: false }).promise;
	try {
		const late = pdfProblem(bytes, doc.numPages);
		if (late) throw new PdfRefused(late);
		const pages = await Promise.all(Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)));
		const scale = stackScale(pages.map((page) => page.getViewport({ scale: 1 })), LONGEST_SIDE);
		const views = pages.map((page) => page.getViewport({ scale }));

		const canvas = document.createElement('canvas');
		canvas.width = Math.floor(Math.max(...views.map((v) => v.width)));
		canvas.height = Math.floor(views.reduce((sum, v) => sum + v.height, 0));
		const context = canvas.getContext('2d')!;
		context.fillStyle = '#fff';
		context.fillRect(0, 0, canvas.width, canvas.height);
		let top = 0;
		for (const [i, page] of pages.entries()) {
			const view = views[i];
			const sheet = document.createElement('canvas');
			sheet.width = Math.floor(view.width);
			sheet.height = Math.floor(view.height);
			await page.render({ canvas: sheet, canvasContext: sheet.getContext('2d')!, viewport: view }).promise;
			context.drawImage(sheet, 0, top);
			top += sheet.height;
		}
		return { jpeg: await encode(canvas), hash };
	} finally {
		await doc.destroy();
	}
}

export const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
export const canAdd = (file: File) => file.type.startsWith('image/') || isPdf(file);
export const prepareUpload = (file: File) => (isPdf(file) ? preparePdf(file) : preparePhoto(file));

export function cannotOpen(problem: unknown, file: File) {
	if (problem instanceof PdfRefused) return problem.message;
	return isPdf(file) ? 'This PDF could not be opened.' : 'This photo format could not be opened.';
}
