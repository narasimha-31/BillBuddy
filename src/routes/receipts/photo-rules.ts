export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// checks the bytes themselves, not the type the browser claims
export function photoProblem(bytes: Uint8Array, hash: string): string | null {
	if (bytes.length === 0) return 'empty file';
	if (bytes.length > MAX_PHOTO_BYTES) return 'photo is over 5 MB';
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return 'not a jpeg';
	if (!/^[0-9a-f]{64}$/.test(hash)) return 'bad fingerprint';
	return null;
}
