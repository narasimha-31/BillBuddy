import { admin } from './admin.server';

// every photo in someone's folder, except the ones still waiting to be read
export async function removePhotos(userId: string, keep: string[] = []) {
	const bucket = admin.storage.from('receipts');
	const kept = new Set(keep);
	for (;;) {
		const listed = await bucket.list(userId, { limit: 1000 });
		if (listed.error) throw listed.error;
		const paths = listed.data.map((file) => `${userId}/${file.name}`).filter((path) => !kept.has(path));
		if (!paths.length) return;
		const removed = await bucket.remove(paths);
		if (removed.error) throw removed.error;
	}
}

// photos first, since storage files don't go with the account; every table row cascades from it
export async function deleteAccount(userId: string) {
	await removePhotos(userId);
	const { error } = await admin.auth.admin.deleteUser(userId);
	if (error) throw error;
}

export const confirmsDelete = (typed: unknown) => typeof typed === 'string' && typed.trim() === 'DELETE';
