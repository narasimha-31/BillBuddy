const LONGEST_SIDE = 1600;

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

	const jpeg = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.82));
	if (!jpeg) throw new Error('could not encode the photo');
	return { jpeg, hash };
}
