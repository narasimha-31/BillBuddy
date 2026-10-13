// Full size: a long receipt shrunk to 1600px is about 600px wide, and the model misreads most
// lines. Vercel refuses request bodies over 4.5 MB, so quality steps down instead of resolution.
const LONGEST_SIDE = 4000;
const MOST_BYTES = 4 * 1024 * 1024;
const QUALITIES = [0.82, 0.7, 0.6];

const hex = (buffer: ArrayBuffer) =>
	[...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

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

	for (const quality of QUALITIES) {
		const jpeg = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', quality));
		if (!jpeg) throw new Error('could not encode the photo');
		if (jpeg.size <= MOST_BYTES || quality === QUALITIES.at(-1)) return { jpeg, hash };
	}
	throw new Error('could not encode the photo');
}
