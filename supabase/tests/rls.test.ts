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
