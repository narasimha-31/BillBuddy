import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL!;
const publishable = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, noSession);
const userIds: string[] = [];

async function signedInUser(label: string): Promise<SupabaseClient> {
	const email = `rls-${label}-${crypto.randomUUID()}@billbuddy.test`;
	const created = await admin.auth.admin.createUser({ email, email_confirm: true });
	if (created.error) throw created.error;
	userIds.push(created.data.user.id);

	const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
	if (link.error) throw link.error;

	const client = createClient(url, publishable, noSession);
	const verified = await client.auth.verifyOtp({
		type: 'email',
		token_hash: link.data.properties.hashed_token
	});
	if (verified.error) throw verified.error;
	return client;
}

let alice: SupabaseClient;
let bob: SupabaseClient;
let aliceId: string;
let aliceStoreId: string;
let aliceReceiptId: string;

beforeAll(async () => {
	alice = await signedInUser('alice');
	bob = await signedInUser('bob');
	aliceId = userIds[0];

	const store = await alice.from('stores').insert({ name: 'Fiesta' }).select().single();
	if (store.error) throw store.error;
	aliceStoreId = store.data.id;

	const receipt = await alice
		.from('receipts')
		.insert({ store_id: aliceStoreId, total_cents: 1299 })
		.select()
		.single();
	if (receipt.error) throw receipt.error;
	aliceReceiptId = receipt.data.id;
});

afterAll(async () => {
	for (const id of userIds) await admin.auth.admin.deleteUser(id);
});

async function aliceReceiptAsAdmin() {
	const { data, error } = await admin.from('receipts').select().eq('id', aliceReceiptId).single();
	if (error) throw error;
	return data;
}

describe('row level security on receipts and stores', () => {
	it('lets the owner read their receipt', async () => {
		const { data, error } = await alice.from('receipts').select().eq('id', aliceReceiptId);
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it("hides another user's receipts and stores", async () => {
		const receipts = await bob.from('receipts').select();
		const stores = await bob.from('stores').select();
		expect(receipts.data).toEqual([]);
		expect(stores.data).toEqual([]);
	});

	it("blocks editing another user's receipt", async () => {
		await bob.from('receipts').update({ total_cents: 1 }).eq('id', aliceReceiptId);
		expect((await aliceReceiptAsAdmin()).total_cents).toBe(1299);
	});

	it("blocks deleting another user's receipt", async () => {
		await bob.from('receipts').delete().eq('id', aliceReceiptId);
		expect((await aliceReceiptAsAdmin()).id).toBe(aliceReceiptId);
	});

	it('blocks inserting a receipt as someone else', async () => {
		const { error } = await bob.from('receipts').insert({ user_id: aliceId, total_cents: 5 });
		expect(error?.code).toBe('42501');
	});

	it("blocks attaching a receipt to another user's store", async () => {
		const { error } = await bob.from('receipts').insert({ store_id: aliceStoreId, total_cents: 5 });
		expect(error?.code).toBe('23503');
	});

	it('blocks moving your receipt onto another user', async () => {
		const own = await bob.from('receipts').insert({ total_cents: 7 }).select().single();
		expect(own.error).toBeNull();
		const { error } = await bob.from('receipts').update({ user_id: aliceId }).eq('id', own.data!.id);
		expect(error?.code).toBe('42501');
	});

	it('gives signed-out visitors nothing', async () => {
		const anon = createClient(url, publishable, noSession);
		const receipts = await anon.from('receipts').select();
		const stores = await anon.from('stores').select();
		expect(receipts.error?.code).toBe('42501');
		expect(stores.error?.code).toBe('42501');
	});
});

describe('row level security on items, name memory and settings', () => {
	const hash = (c: string) => c.repeat(64);
	let aliceItemId: string;

	beforeAll(async () => {
		const item = await alice
			.from('receipt_items')
			.insert({ receipt_id: aliceReceiptId, position: 0, raw_text: 'GRN CHILI HOT', total_cents: 126 })
			.select()
			.single();
		if (item.error) throw item.error;
		aliceItemId = item.data.id;
	});

	it("hides another user's items, name memory and settings", async () => {
		await alice.from('name_memory').insert({ store_id: aliceStoreId, raw_text: 'GRN CHILI HOT', name: 'Green chillies' });
		await alice.from('user_settings').insert({ keep_store_name: true });
		for (const table of ['receipt_items', 'name_memory', 'user_settings']) {
			const { data } = await bob.from(table).select();
			expect(data, table).toEqual([]);
		}
	});

	it("blocks adding an item to another user's receipt", async () => {
		const { error } = await bob
			.from('receipt_items')
			.insert({ receipt_id: aliceReceiptId, position: 9, raw_text: 'X', total_cents: 1 });
		expect(error?.code).toBe('23503');
	});

	it("blocks editing another user's item", async () => {
		await bob.from('receipt_items').update({ total_cents: 1 }).eq('id', aliceItemId);
		const { data } = await admin.from('receipt_items').select().eq('id', aliceItemId).single();
		expect(data?.total_cents).toBe(126);
	});

	it("blocks saving name memory against another user's store", async () => {
		const { error } = await bob
			.from('name_memory')
			.insert({ store_id: aliceStoreId, raw_text: 'X', name: 'Y' });
		expect(error?.code).toBe('23503');
	});

	it('blocks writing settings for someone else', async () => {
		const { error } = await bob.from('user_settings').insert({ user_id: aliceId, keep_photos: true });
		expect(error?.code).toBe('42501');
	});

	it('only lets discount lines be negative', async () => {
		const discount = await alice
			.from('receipt_items')
			.insert({ receipt_id: aliceReceiptId, position: 1, kind: 'discount', raw_text: 'SAVINGS', total_cents: -50 });
		const item = await alice
			.from('receipt_items')
			.insert({ receipt_id: aliceReceiptId, position: 2, raw_text: 'EGGS', total_cents: -50 });
		expect(discount.error).toBeNull();
		expect(item.error?.code).toBe('23514');
	});

	it('rejects the same photo twice for one user but not across users', async () => {
		const first = await alice.from('receipts').insert({ image_hash: hash('a') });
		const again = await alice.from('receipts').insert({ image_hash: hash('a') });
		const otherUser = await bob.from('receipts').insert({ image_hash: hash('a') });
		expect(first.error).toBeNull();
		expect(again.error?.code).toBe('23505');
		expect(otherUser.error).toBeNull();
	});

	it('starts every optional setting switched off and validates the zip code', async () => {
		const fresh = await bob.from('user_settings').insert({}).select().single();
		expect(fresh.data).toMatchObject({ keep_store_name: false, keep_store_location: false, keep_photos: false });
		const badZip = await bob.from('user_settings').update({ zip_code: '1234' }).eq('user_id', fresh.data!.user_id);
		expect(badZip.error?.code).toBe('23514');
	});

	it('gives signed-out visitors nothing from the new tables', async () => {
		const anon = createClient(url, publishable, noSession);
		for (const table of ['receipt_items', 'name_memory', 'user_settings']) {
			const { error } = await anon.from(table).select();
			expect(error?.code, table).toBe('42501');
		}
	});
});

describe('receipt photo storage', () => {
	// smallest valid jpeg (1x1)
	const jpeg = Buffer.from(
		'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
		'base64'
	);
	const bucket = 'receipts';
	let alicePath: string;
	const exists = async (path: string) => {
		const folder = path.split('/')[0];
		const { data } = await admin.storage.from(bucket).list(folder);
		return (data ?? []).some((f) => `${folder}/${f.name}` === path);
	};

	beforeAll(async () => {
		alicePath = `${aliceId}/${crypto.randomUUID()}.jpg`;
		const { error } = await alice.storage.from(bucket).upload(alicePath, jpeg, { contentType: 'image/jpeg' });
		if (error) throw error;
	});

	afterAll(async () => {
		for (const id of userIds) {
			const { data } = await admin.storage.from(bucket).list(id);
			if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${id}/${f.name}`));
		}
	});

	it('lets the owner read their own photo', async () => {
		const { data, error } = await alice.storage.from(bucket).download(alicePath);
		expect(error).toBeNull();
		expect(data?.size).toBe(jpeg.length);
	});

	it("hides another user's photo", async () => {
		const { data } = await bob.storage.from(bucket).download(alicePath);
		expect(data).toBeNull();
		const listing = await bob.storage.from(bucket).list(aliceId);
		expect(listing.data ?? []).toEqual([]);
	});

	it("blocks uploading into another user's folder", async () => {
		const path = `${aliceId}/planted.jpg`;
		const { error } = await bob.storage.from(bucket).upload(path, jpeg, { contentType: 'image/jpeg' });
		expect(error).not.toBeNull();
		expect(await exists(path)).toBe(false);
	});

	it("blocks deleting another user's photo", async () => {
		await bob.storage.from(bucket).remove([alicePath]);
		expect(await exists(alicePath)).toBe(true);
	});

	it('never lets a photo be swapped out after upload', async () => {
		const { error } = await alice.storage.from(bucket).upload(alicePath, jpeg, { contentType: 'image/jpeg', upsert: true });
		expect(error).not.toBeNull();
	});

	it('only accepts jpeg', async () => {
		const path = `${aliceId}/${crypto.randomUUID()}.png`;
		const { error } = await alice.storage.from(bucket).upload(path, jpeg, { contentType: 'image/png' });
		expect(error).not.toBeNull();
		expect(await exists(path)).toBe(false);
	});

	it('rejects photos over 5 MB', async () => {
		const path = `${aliceId}/${crypto.randomUUID()}.jpg`;
		const big = Buffer.concat([jpeg, Buffer.alloc(5 * 1024 * 1024)]);
		const { error } = await alice.storage.from(bucket).upload(path, big, { contentType: 'image/jpeg' });
		expect(error).not.toBeNull();
		expect(await exists(path)).toBe(false);
	});

	it('gives signed-out visitors nothing, not even through a public link', async () => {
		const anon = createClient(url, publishable, noSession);
		const { data } = await anon.storage.from(bucket).download(alicePath);
		expect(data).toBeNull();
		const publicUrl = anon.storage.from(bucket).getPublicUrl(alicePath).data.publicUrl;
		expect((await fetch(publicUrl)).ok).toBe(false);
	});
});

describe('receipt and upload limits, enforced by the database', () => {
	const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

	async function userWithHistory(label: string, count: number, minutesBack: number) {
		const client = await signedInUser(label);
		const id = userIds[userIds.length - 1];
		if (count) {
			const rows = Array.from({ length: count }, () => ({ user_id: id, created_at: minutesAgo(minutesBack) }));
			const { error } = await admin.from('receipts').insert(rows);
			if (error) throw error;
		}
		return client;
	}

	it('refuses a burst of more than 10 receipts in a minute', async () => {
		const carol = await userWithHistory('carol', 0, 0);
		for (let i = 0; i < 10; i++) {
			const { error } = await carol.from('receipts').insert({});
			expect(error).toBeNull();
		}
		const { error } = await carol.from('receipts').insert({});
		expect(error?.message).toBe('receipt limit: too many at once');
	});

	it('refuses the 21st receipt in a day', async () => {
		const dave = await userWithHistory('dave', 20, 5);
		const { error } = await dave.from('receipts').insert({});
		expect(error?.message).toBe('receipt limit: daily');
	});

	it('refuses the 201st receipt in 30 days', async () => {
		const erin = await userWithHistory('erin', 200, 2 * 24 * 60);
		const { error } = await erin.from('receipts').insert({});
		expect(error?.message).toBe('receipt limit: monthly');
	});

	it('ignores a backdated timestamp sent by the client', async () => {
		const frank = await userWithHistory('frank', 0, 0);
		const { data } = await frank.from('receipts').insert({ created_at: '2020-01-01T00:00:00Z' }).select().single();
		expect(Date.now() - new Date(data!.created_at).getTime()).toBeLessThan(60_000);
	});

	it('refuses the 26th photo upload in a day', async () => {
		const gina = await userWithHistory('gina', 0, 0);
		const id = userIds[userIds.length - 1];
		const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
		for (let i = 0; i < 25; i++) {
			const { error } = await gina.storage.from('receipts').upload(`${id}/${i}.jpg`, jpeg, { contentType: 'image/jpeg' });
			expect(error, `upload ${i}`).toBeNull();
		}
		const { error } = await gina.storage.from('receipts').upload(`${id}/26.jpg`, jpeg, { contentType: 'image/jpeg' });
		expect(error).not.toBeNull();
	}, 60_000);
});

describe('photo counting function', () => {
	it('only ever reports the caller their own upload count', async () => {
		const path = `${aliceId}/${crypto.randomUUID()}.jpg`;
		const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
		const uploaded = await alice.storage.from('receipts').upload(path, jpeg, { contentType: 'image/jpeg' });
		expect(uploaded.error).toBeNull();

		const { data: aliceCount } = await alice.rpc('receipt_photos_today');
		const { data: bobCount } = await bob.rpc('receipt_photos_today');
		await admin.storage.from('receipts').remove([path]);
		expect(aliceCount).toBe(1);
		expect(bobCount).toBe(0);
	});

	it('cannot be called by signed-out visitors', async () => {
		const anon = createClient(url, publishable, noSession);
		const { error } = await anon.rpc('receipt_photos_today');
		expect(error).not.toBeNull();
	});
});
